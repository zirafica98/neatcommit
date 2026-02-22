import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import env from './config/env';
import { logger } from './utils/logger';
import { idSchema } from './middleware/validation';
import { connectDatabase } from './config/database';
import prisma from './config/database';
import { testRedisConnection } from './config/redis';
import { analysisQueue } from './config/queue';
import './workers/analysis.worker'; // Start worker
import './workers/documentation.worker'; // Start documentation worker

// Initialize Sentry (samo u production)
import { initSentry } from './config/sentry';
initSentry();

const app: Express = express();

app.disable('x-powered-by');

// Trust exactly one proxy (e.g. Render). "true" would allow IP spoofing and breaks express-rate-limit.
app.set('trust proxy', 1);

// Security headers. HSTS samo u production (na localhost remeti development).
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  ...(env.NODE_ENV === 'production'
    ? { hsts: { maxAge: 31536000, includeSubDomains: true, preload: true } }
    : { hsts: false }),
}));

// CORS: samo dozvoljeni origin i metode
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// Ograničenje veličine body-ja (zaštita od DoS)
app.use(express.json({
  limit: '500kb',
  verify: (req: any, _res, buf, _encoding) => {
    // Ako je webhook ruta, sačuvaj raw body kao Buffer
    // Proveri i po path i po originalUrl jer path može biti undefined u verify callback-u
    const isWebhook = (req.path && req.path.startsWith('/webhook')) || 
                      (req.originalUrl && req.originalUrl.startsWith('/webhook')) ||
                      (req.url && req.url.startsWith('/webhook'));
    if (isWebhook) {
      req.rawBody = buf; // buf je već Buffer
      logger.debug('Raw body saved for webhook', {
        path: req.path,
        originalUrl: req.originalUrl,
        url: req.url,
        bufferLength: buf.length,
      });
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Request logging (u production samo debug/warn, da ne otkrivamo putanje)
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (env.NODE_ENV === 'development') {
    logger.info(`REQUEST: ${req.method} ${req.path}`, { path: req.path, ip: req.ip });
  } else {
    logger.debug(`REQUEST: ${req.method} ${req.path}`);
  }
  next();
});

// Rate limiting middleware
import { apiLimiter, authLimiter, webhookLimiter, subscriptionLimiter } from './middleware/rate-limiter';

// Apply general rate limiting to all API routes
app.use('/api', (req, res, next) => {
  if (req.path.startsWith('/auth')) return next();
  return apiLimiter(req, res, next);
});

// Health check (bez rate limiting). U production ne izlažemo detalje (uptime, memory).
app.get('/health', async (_req: Request, res: Response) => {
  try {
    const dbStatus = await prisma.$queryRaw`SELECT 1`.then(() => 'connected').catch(() => 'disconnected');
    const redisStatus = await testRedisConnection().then(() => 'connected').catch(() => 'disconnected');
    const allServicesOk = dbStatus === 'connected' && redisStatus === 'connected';
    const statusCode = allServicesOk ? 200 : 503;

    if (env.NODE_ENV === 'production') {
      res.status(statusCode).json({ status: allServicesOk ? 'ok' : 'degraded', timestamp: new Date().toISOString() });
      return;
    }

    res.status(statusCode).json({
      status: allServicesOk ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      environment: env.NODE_ENV,
      services: { database: dbStatus, redis: redisStatus, queue: 'connected' },
      uptime: process.uptime(),
      memory: { used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), unit: 'MB' },
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({ status: 'error', timestamp: new Date().toISOString() });
  }
});

// Test endpoints samo u development (u production su isključeni zbog bezbednosti)
if (env.NODE_ENV !== 'production') {
  app.post('/test/queue', async (_req: Request, res: Response) => {
    try {
      const job = await analysisQueue.add('analyze-pr', {
        installationId: 123,
        owner: 'test-owner',
        repo: 'test-repo',
        pullNumber: 1,
        sha: 'abc123',
        prId: 'test-pr-id',
        prUrl: 'https://github.com/test-owner/test-repo/pull/1',
        prTitle: 'Test PR',
      });
      res.json({ message: 'Job added to queue', jobId: job.id });
    } catch (error) {
      logger.error('Failed to add job to queue:', error);
      res.status(500).json({ error: 'Failed to add job' });
    }
  });

  app.post('/test/webhook', async (req: Request, res: Response) => {
    try {
      const { event, payload } = req.body;
      if (!event || !payload) {
        res.status(400).json({ error: 'Missing event or payload' });
        return;
      }
      const { handleWebhookEvent } = await import('./api/routes/webhooks');
      await handleWebhookEvent(event, payload);
      res.status(200).json({ received: true, event });
    } catch (error) {
      logger.error('Test webhook failed:', error);
      res.status(500).json({ error: 'Test webhook failed', message: (error as Error).message });
    }
  });

  app.post('/test/analysis', async (req: Request, res: Response) => {
    try {
      const { code, filename } = req.body;
      if (!code || !filename) {
        res.status(400).json({ error: 'Missing code or filename' });
        return;
      }
      const { analyzeFile } = await import('./services/analysis.service');
      const result = await analyzeFile(code, filename);
      res.status(200).json({
        success: true,
        result: {
          filename: result.filename,
          language: result.language,
          isSupported: result.isSupported,
          totalIssues: result.allIssues.length,
          criticalIssues: result.allIssues.filter((i) => i.severity === 'CRITICAL').length,
          highIssues: result.allIssues.filter((i) => i.severity === 'HIGH').length,
          score: result.score,
          summary: result.summary,
          issues: result.allIssues.slice(0, 10),
        },
      });
    } catch (error) {
      logger.error('Test analysis failed:', error);
      res.status(500).json({
        error: 'Test analysis failed',
        message: (error as Error).message,
        stack: (error as Error).stack,
      });
    }
  });
}

// API routes
import webhookRoutes from './api/routes/webhooks';
app.use('/webhook', webhookLimiter, webhookRoutes); // Rate limiting za webhook-ove

// Database preview endpoints (for development)
app.get('/api/reviews', async (req: Request, res: Response) => {
  try {
    // Ekstraktuj userId iz JWT tokena
    const authHeader = req.headers.authorization;
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { verifyAccessToken } = await import('./services/auth.service');
      const payload = verifyAccessToken(token);
      if (payload) {
        userId = payload.userId;
      }
    }

    // Ako nema userId, vrati prazan niz (ili error)
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Pronađi sve installations za ovog korisnika
    const userInstallations = await prisma.installation.findMany({
      where: { userId: userId },
      select: { id: true },
    });

    const installationIds = userInstallations.map((inst) => inst.id);

    // Filtriraj reviews samo za installations koje pripadaju ovom korisniku
    const reviews = await prisma.review.findMany({
      where: {
        installationId: {
          in: installationIds,
        },
      },
      take: 20,
      orderBy: { createdAt: 'desc' },
      include: {
        installation: {
          select: {
            accountLogin: true,
            installationId: true,
          },
        },
        repository: true,
        _count: {
          select: {
            issues: true,
          },
        },
      },
    });

    return res.json({
      count: reviews.length,
      reviews: reviews.map((r) => ({
        id: r.id,
        githubPrNumber: r.githubPrNumber,
        githubPrId: r.githubPrId,
        githubPrUrl: r.githubPrUrl,
        githubPrTitle: r.githubPrTitle,
        githubPrState: r.githubPrState,
        githubSha: r.githubSha,
        status: r.status,
        securityScore: r.securityScore,
        totalIssues: r.totalIssues,
        criticalIssues: r.criticalIssues,
        highIssues: r.highIssues,
        mediumIssues: r.mediumIssues,
        lowIssues: r.lowIssues,
        createdAt: r.createdAt.toISOString(),
        completedAt: r.completedAt?.toISOString(),
        repository: r.repository ? {
          id: r.repository.id,
          githubRepoId: r.repository.githubRepoId,
          name: r.repository.name,
          fullName: r.repository.fullName,
          owner: r.repository.owner,
          private: r.repository.private,
          defaultBranch: r.repository.defaultBranch,
          language: r.repository.language,
          enabled: r.repository.enabled,
          createdAt: r.repository.createdAt.toISOString(),
          updatedAt: r.repository.updatedAt.toISOString(),
        } : null,
      })),
    });
  } catch (error) {
    logger.error('Failed to fetch reviews:', error);
    return res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

app.get('/api/reviews/:id', async (req: Request, res: Response) => {
  try {
    const parsed = idSchema.safeParse(req.params.id);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid id' });
    const id = parsed.data;
    // Ekstraktuj userId iz JWT tokena
    const authHeader = req.headers.authorization;
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { verifyAccessToken } = await import('./services/auth.service');
      const payload = verifyAccessToken(token);
      if (payload) {
        userId = payload.userId;
      }
    }

    // Ako nema userId, vrati error
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const review = await prisma.review.findUnique({
      where: { id },
      include: {
        issues: {
          orderBy: [
            { severity: 'asc' },
            { line: 'asc' },
          ],
        },
        repository: true,
        installation: true,
      },
    });

    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Proveri da li review pripada korisniku
    if (review.installation && review.installation.userId !== userId) {
      return res.status(403).json({ error: 'Forbidden: This review does not belong to you' });
    }

    return res.json({
      id: review.id,
      githubPrNumber: review.githubPrNumber,
      githubPrId: review.githubPrId,
      githubPrUrl: review.githubPrUrl,
      githubPrTitle: review.githubPrTitle,
      githubPrState: review.githubPrState,
      githubSha: review.githubSha,
      status: review.status,
      securityScore: review.securityScore,
      totalIssues: review.totalIssues,
      criticalIssues: review.criticalIssues,
      highIssues: review.highIssues,
      mediumIssues: review.mediumIssues,
      lowIssues: review.lowIssues,
      createdAt: review.createdAt.toISOString(),
      completedAt: review.completedAt?.toISOString(),
      repository: review.repository ? {
        id: review.repository.id,
        githubRepoId: review.repository.githubRepoId,
        name: review.repository.name,
        fullName: review.repository.fullName,
        owner: review.repository.owner,
        private: review.repository.private,
        defaultBranch: review.repository.defaultBranch,
        language: review.repository.language,
        enabled: review.repository.enabled,
        createdAt: review.repository.createdAt.toISOString(),
        updatedAt: review.repository.updatedAt.toISOString(),
      } : null,
      issues: review.issues.map((i) => ({
        id: i.id,
        filePath: i.filePath,
        line: i.line,
        column: i.column,
        severity: i.severity,
        category: i.category,
        title: i.title,
        description: i.description,
        codeSnippet: i.codeSnippet,
        suggestedFix: i.suggestedFix,
        cweId: i.cweId,
        owaspCategory: i.owaspCategory,
        createdAt: i.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.error('Failed to fetch review:', error);
    return res.status(500).json({ error: 'Failed to fetch review' });
  }
});

app.get('/api/issues', async (req: Request, res: Response) => {
  try {
    // Ekstraktuj userId iz JWT tokena
    const authHeader = req.headers.authorization;
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { verifyAccessToken } = await import('./services/auth.service');
      const payload = verifyAccessToken(token);
      if (payload) {
        userId = payload.userId;
      }
    }

    // Ako nema userId, vrati error
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Pronađi sve installations za ovog korisnika
    const userInstallations = await prisma.installation.findMany({
      where: { userId: userId },
      select: { id: true },
    });

    const installationIds = userInstallations.map((inst) => inst.id);

    // Pronađi sve reviews za ovog korisnika
    const userReviews = await prisma.review.findMany({
      where: {
        installationId: {
          in: installationIds,
        },
      },
      select: { id: true },
    });

    const reviewIds = userReviews.map((r) => r.id);

    const { severity, limit = '50' } = req.query;
    const limitNum = Math.min(Math.max(1, parseInt(limit as string, 10) || 50), 100); // max 100 zbog bezbednosti
    
    // Filtriraj issues samo za reviews ovog korisnika
    const issues = await prisma.issue.findMany({
      where: {
        reviewId: {
          in: reviewIds,
        },
        ...(severity ? { severity: severity as string } : {}),
      },
      take: limitNum,
      orderBy: [
        { severity: 'asc' },
        { createdAt: 'desc' },
      ],
      include: {
        review: {
          select: {
            githubPrNumber: true,
            githubPrTitle: true,
            githubPrUrl: true,
          },
        },
      },
    });

    return res.json({
      count: issues.length,
      issues: issues.map((i) => ({
        id: i.id,
        severity: i.severity,
        category: i.category,
        title: i.title,
        description: i.description,
        filePath: i.filePath,
        line: i.line,
        suggestedFix: i.suggestedFix,
        prNumber: i.review.githubPrNumber,
        prTitle: i.review.githubPrTitle,
        prUrl: i.review.githubPrUrl,
        createdAt: i.createdAt,
      })),
    });
  } catch (error) {
    logger.error('Failed to fetch issues:', error);
    return res.status(500).json({ error: 'Failed to fetch issues' });
  }
});

// Dashboard stats endpoint
app.get('/api/dashboard/stats', async (req: Request, res: Response) => {
  try {
    // Ekstraktuj userId iz JWT tokena
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const { verifyAccessToken } = await import('./services/auth.service');
    const payload = verifyAccessToken(token);

    if (!payload || !payload.userId) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Pronađi sve installations za ovog korisnika
    const userInstallations = await prisma.installation.findMany({
      where: { userId: payload.userId },
      select: { id: true },
    });

    const installationIds = userInstallations.map((inst) => inst.id);

    // Ako korisnik nema installations, vrati prazne podatke
    if (installationIds.length === 0) {
      return res.json({
        totalReviews: 0,
        totalIssues: 0,
        criticalIssues: 0,
        highIssues: 0,
        mediumIssues: 0,
        lowIssues: 0,
        averageScore: 0,
        recentReviews: [],
      });
    }

    // Get total reviews count - samo za ovog korisnika
    const totalReviews = await prisma.review.count({
      where: {
        installationId: {
          in: installationIds,
        },
      },
    });

    // Get total issues count - samo za reviews ovog korisnika
    const userReviews = await prisma.review.findMany({
      where: {
        installationId: {
          in: installationIds,
        },
      },
      select: { id: true },
    });

    const reviewIds = userReviews.map((r) => r.id);

    const totalIssues = await prisma.issue.count({
      where: {
        reviewId: {
          in: reviewIds,
        },
      },
    });

    // Get issues by severity - samo za reviews ovog korisnika
    const criticalIssues = await prisma.issue.count({
      where: {
        severity: 'CRITICAL',
        reviewId: {
          in: reviewIds,
        },
      },
    });
    const highIssues = await prisma.issue.count({
      where: {
        severity: 'HIGH',
        reviewId: {
          in: reviewIds,
        },
      },
    });
    const mediumIssues = await prisma.issue.count({
      where: {
        severity: 'MEDIUM',
        reviewId: {
          in: reviewIds,
        },
      },
    });
    const lowIssues = await prisma.issue.count({
      where: {
        severity: 'LOW',
        reviewId: {
          in: reviewIds,
        },
      },
    });

    // Calculate average security score - samo za reviews ovog korisnika
    const reviewsWithScore = await prisma.review.findMany({
      where: {
        status: 'completed',
        securityScore: { not: null },
        installationId: {
          in: installationIds,
        },
      },
      select: {
        securityScore: true,
      },
    });

    const averageScore = reviewsWithScore.length > 0
      ? Math.round(
          reviewsWithScore.reduce((sum, r) => sum + (r.securityScore || 0), 0) /
          reviewsWithScore.length
        )
      : 0;

    // Get recent reviews (last 5) - samo za ovog korisnika
    const recentReviews = await prisma.review.findMany({
      where: {
        installationId: {
          in: installationIds,
        },
      },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        repository: {
          select: {
            id: true,
            githubRepoId: true,
            name: true,
            fullName: true,
            owner: true,
            private: true,
            defaultBranch: true,
            language: true,
            enabled: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    return res.json({
      totalReviews,
      totalIssues,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      averageScore,
      recentReviews: recentReviews.map((r) => ({
        id: r.id,
        githubPrNumber: r.githubPrNumber,
        githubPrId: r.githubPrId,
        githubPrUrl: r.githubPrUrl,
        githubPrTitle: r.githubPrTitle,
        githubPrState: r.githubPrState,
        githubSha: r.githubSha,
        status: r.status,
        securityScore: r.securityScore,
        totalIssues: r.totalIssues,
        criticalIssues: r.criticalIssues,
        highIssues: r.highIssues,
        mediumIssues: r.mediumIssues,
        lowIssues: r.lowIssues,
        createdAt: r.createdAt.toISOString(),
        completedAt: r.completedAt?.toISOString(),
        repository: r.repository ? {
          id: r.repository.id,
          githubRepoId: r.repository.githubRepoId,
          name: r.repository.name,
          fullName: r.repository.fullName,
          owner: r.repository.owner,
          private: r.repository.private,
          defaultBranch: r.repository.defaultBranch,
          language: r.repository.language,
          enabled: r.repository.enabled,
          createdAt: r.repository.createdAt.toISOString(),
          updatedAt: r.repository.updatedAt.toISOString(),
        } : null,
      })),
    });
  } catch (error) {
    logger.error('Failed to fetch dashboard stats:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Analytics endpoint for charts
app.get('/api/dashboard/analytics', async (_req: Request, res: Response) => {
  try {
    logger.info('📊 GET /api/dashboard/analytics called');
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Security Score Trend (last 30 days)
    const reviewsForTrend = await prisma.review.findMany({
      where: {
        status: 'completed',
        securityScore: { not: null },
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        securityScore: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Group by day
    const scoreTrend: { date: string; score: number }[] = [];
    const dailyScores: Record<string, number[]> = {};

    reviewsForTrend.forEach((review) => {
      const date = review.createdAt.toISOString().split('T')[0];
      if (!dailyScores[date]) {
        dailyScores[date] = [];
      }
      dailyScores[date].push(review.securityScore || 0);
    });

    Object.keys(dailyScores).sort().forEach((date) => {
      const scores = dailyScores[date];
      const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
      scoreTrend.push({ date, score: avgScore });
    });

    // Issues by Category
    const issuesByCategory = await prisma.issue.groupBy({
      by: ['category'],
      _count: true,
    });

    // Review Activity (last 30 days)
    const reviewsForActivity = await prisma.review.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        createdAt: true,
        status: true,
      },
    });

    const activityTrend: { date: string; count: number }[] = [];
    const dailyActivity: Record<string, number> = {};

    reviewsForActivity.forEach((review) => {
      const date = review.createdAt.toISOString().split('T')[0];
      dailyActivity[date] = (dailyActivity[date] || 0) + 1;
    });

    Object.keys(dailyActivity).sort().forEach((date) => {
      activityTrend.push({ date, count: dailyActivity[date] });
    });

    // Repositories by Status
    const repositoriesByStatus = await prisma.repository.groupBy({
      by: ['enabled'],
      _count: true,
    });

    return res.json({
      scoreTrend: scoreTrend.length > 0 ? scoreTrend : [{ date: new Date().toISOString().split('T')[0], score: 0 }],
      issuesByCategory: issuesByCategory.length > 0 
        ? issuesByCategory.map((item) => ({
            category: item.category,
            count: item._count,
          }))
        : [{ category: 'SECURITY', count: 0 }],
      activityTrend: activityTrend.length > 0 
        ? activityTrend 
        : [{ date: new Date().toISOString().split('T')[0], count: 0 }],
      repositoriesByStatus: repositoriesByStatus.length > 0
        ? repositoriesByStatus.map((item) => ({
            enabled: item.enabled,
            count: item._count,
          }))
        : [{ enabled: true, count: 0 }],
    });
  } catch (error) {
    logger.error('Failed to fetch analytics:', error);
    return res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// Repositories endpoints
app.get('/api/repositories', async (req: Request, res: Response) => {
  try {
    // Proveri autentifikaciju
    const authHeader = req.headers.authorization;
    let userId: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      const { verifyAccessToken } = await import('./services/auth.service');
      const payload = verifyAccessToken(token);
      userId = payload?.userId || null;
    }

    // Ako je korisnik autentifikovan, vrati samo njegove repozitorijume
    if (userId) {
      // Pokušaj da povežeš installation sa korisnikom ako nije povezan
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (user && user.githubId) {
        // Pronađi installation-e koje nisu povezane sa korisnikom ali imaju isti accountId
        const updated = await prisma.installation.updateMany({
          where: {
            accountId: user.githubId,
            userId: null, // Nisu povezani
          },
          data: {
            userId: user.id,
          },
        });
        
        if (updated.count > 0) {
          logger.info('Linked installations to user on repositories request', {
            userId: user.id,
            githubId: user.githubId,
            linkedCount: updated.count,
          });
        }
      }

      const installations = await prisma.installation.findMany({
        where: { userId },
        include: {
          repositories: true,
        },
      });

      const repositories = installations.flatMap((inst) => inst.repositories);

      return res.json({
        count: repositories.length,
        repositories: repositories.map((r) => ({
          id: r.id,
          githubRepoId: r.githubRepoId,
          name: r.name,
          fullName: r.fullName,
          owner: r.owner,
          private: r.private,
          defaultBranch: r.defaultBranch,
          language: r.language,
          enabled: r.enabled,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
        })),
      });
    }

    // Ako nije autentifikovan, vrati sve (za backward compatibility)
    const repositories = await prisma.repository.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      count: repositories.length,
      repositories: repositories.map((r) => ({
        id: r.id,
        githubRepoId: r.githubRepoId,
        name: r.name,
        fullName: r.fullName,
        owner: r.owner,
        private: r.private,
        defaultBranch: r.defaultBranch,
        language: r.language,
        enabled: r.enabled,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.error('Failed to fetch repositories:', error);
    return res.status(500).json({ error: 'Failed to fetch repositories' });
  }
});

// Endpoint za dobijanje SVIH repozitorijuma sa GitHub-a (ne samo onih u bazi)
app.get('/api/repositories/all', async (req: Request, res: Response) => {
  try {
    // Proveri autentifikaciju
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const { verifyAccessToken } = await import('./services/auth.service');
    const payload = verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Dobij sve repozitorijume sa GitHub-a koristeći getUserRepositories
    const { getUserRepositories } = await import('./services/user-repositories.service');
    const githubRepos = await getUserRepositories(payload.userId);

    // Mapiraj na format koji frontend očekuje
    const repositories = githubRepos.map((repo) => ({
      id: repo.connectedRepoId || repo.githubRepoId.toString(), // Koristi ID iz baze ako postoji, inače GitHub ID
      githubRepoId: repo.githubRepoId,
      name: repo.name,
      fullName: repo.fullName,
      owner: repo.owner,
      private: repo.private,
      defaultBranch: repo.defaultBranch || 'main',
      language: repo.language || null,
      enabled: repo.enabled || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    // Proveri koje repozitorijume već imamo u bazi i označi ih kao enabled
    const reposInDb = await prisma.repository.findMany({
      where: {
        githubRepoId: {
          in: repositories.map((r) => r.githubRepoId),
        },
      },
    });

    const reposInDbMap = new Map(reposInDb.map((r) => [r.githubRepoId, r]));

    // Ažuriraj enabled status za repozitorijume koji su u bazi
    const repositoriesWithStatus = repositories.map((repo) => {
      const dbRepo = reposInDbMap.get(repo.githubRepoId);
      return {
        ...repo,
        id: dbRepo?.id || repo.id, // Koristi ID iz baze ako postoji
        enabled: dbRepo?.enabled || false,
      };
    });

    return res.json({
      count: repositoriesWithStatus.length,
      repositories: repositoriesWithStatus,
    });
  } catch (error) {
    logger.error('Failed to fetch all repositories from GitHub:', error);
    return res.status(500).json({ error: 'Failed to fetch repositories from GitHub' });
  }
});

app.get('/api/repositories/:id', async (req: Request, res: Response) => {
  try {
    const parsed = idSchema.safeParse(req.params.id);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid id' });
    const id = parsed.data;
    const repository = await prisma.repository.findUnique({
      where: { id },
    });

    if (!repository) {
      return res.status(404).json({ error: 'Repository not found' });
    }

    return res.json({
      id: repository.id,
      githubRepoId: repository.githubRepoId,
      name: repository.name,
      fullName: repository.fullName,
      owner: repository.owner,
      private: repository.private,
      defaultBranch: repository.defaultBranch,
      language: repository.language,
      enabled: repository.enabled,
      createdAt: repository.createdAt.toISOString(),
      updatedAt: repository.updatedAt.toISOString(),
    });
  } catch (error) {
    logger.error('Failed to fetch repository:', error);
    return res.status(500).json({ error: 'Failed to fetch repository' });
  }
});

app.post('/api/repositories/:id/enable', async (req: Request, res: Response) => {
  try {
    const parsed = idSchema.safeParse(req.params.id);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid id' });
    const id = parsed.data;
    const repository = await prisma.repository.update({
      where: { id },
      data: { enabled: true },
    });

    return res.json({
      id: repository.id,
      githubRepoId: repository.githubRepoId,
      name: repository.name,
      fullName: repository.fullName,
      owner: repository.owner,
      private: repository.private,
      defaultBranch: repository.defaultBranch,
      language: repository.language,
      enabled: repository.enabled,
      createdAt: repository.createdAt.toISOString(),
      updatedAt: repository.updatedAt.toISOString(),
    });
  } catch (error) {
    logger.error('Failed to enable repository:', error);
    return res.status(500).json({ error: 'Failed to enable repository' });
  }
});

// Endpoint za dodavanje repozitorijuma u bazu bez čekanja na PR
app.post('/api/repositories/add', async (req: Request, res: Response) => {
  try {
    // Proveri autentifikaciju
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const { verifyAccessToken } = await import('./services/auth.service');
    const payload = verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { githubRepoId } = req.body;

    if (!githubRepoId) {
      return res.status(400).json({ error: 'Missing githubRepoId' });
    }

    // Dobij korisnika
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Proveri da li korisnik ima GitHub ID
    if (!user.githubId) {
      return res.status(400).json({ 
        error: 'This account does not have a GitHub account linked. Please login with GitHub OAuth to use repository features.' 
      });
    }

    // Pronađi installation za korisnika
    const installation = await prisma.installation.findFirst({
      where: {
        OR: [
          { userId: payload.userId },
          { accountId: user.githubId },
        ],
      },
    });

    if (!installation) {
      return res.status(404).json({ 
        error: 'No GitHub App installation found for this user. Please install the GitHub App from https://github.com/apps/neatcommit' 
      });
    }

    // Proveri da li repozitorijum već postoji u bazi
    const existingRepo = await prisma.repository.findUnique({
      where: { githubRepoId: parseInt(githubRepoId.toString(), 10) },
    });

    if (existingRepo) {
      return res.json({
        success: true,
        repository: {
          id: existingRepo.id,
          githubRepoId: existingRepo.githubRepoId,
          name: existingRepo.name,
          fullName: existingRepo.fullName,
          owner: existingRepo.owner,
          private: existingRepo.private,
          defaultBranch: existingRepo.defaultBranch,
          language: existingRepo.language,
          enabled: existingRepo.enabled,
          createdAt: existingRepo.createdAt.toISOString(),
          updatedAt: existingRepo.updatedAt.toISOString(),
        },
        message: 'Repository already exists in database',
      });
    }

    // Dobij informacije o repozitorijumu sa GitHub-a
    const { getUserRepositories } = await import('./services/user-repositories.service');
    const githubRepos = await getUserRepositories(payload.userId);
    const githubRepo = githubRepos.find((r) => r.githubRepoId === parseInt(githubRepoId.toString(), 10));

    if (!githubRepo) {
      return res.status(404).json({ error: 'Repository not found in your GitHub account or App is not installed for this repository' });
    }

    // Kreiraj repozitorijum u bazi
    const repository = await prisma.repository.create({
      data: {
        installationId: installation.id,
        githubRepoId: githubRepo.githubRepoId,
        name: githubRepo.name,
        fullName: githubRepo.fullName,
        owner: githubRepo.owner,
        private: githubRepo.private,
        defaultBranch: githubRepo.defaultBranch,
        language: githubRepo.language || null,
        enabled: true, // Automatski omogući analizu
      },
    });

    logger.info('Repository added to database', {
      repositoryId: repository.id,
      githubRepoId: repository.githubRepoId,
      fullName: repository.fullName,
    });

    return res.json({
      success: true,
      repository: {
        id: repository.id,
        githubRepoId: repository.githubRepoId,
        name: repository.name,
        fullName: repository.fullName,
        owner: repository.owner,
        private: repository.private,
        defaultBranch: repository.defaultBranch,
        language: repository.language,
        enabled: repository.enabled,
        createdAt: repository.createdAt.toISOString(),
        updatedAt: repository.updatedAt.toISOString(),
      },
      message: 'Repository added successfully',
    });
  } catch (error) {
    logger.error('Failed to add repository:', error);
    return res.status(500).json({
      error: 'Failed to add repository',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

app.post('/api/repositories/:id/disable', async (req: Request, res: Response) => {
  try {
    const parsed = idSchema.safeParse(req.params.id);
    if (!parsed.success) return res.status(400).json({ error: 'Invalid id' });
    const id = parsed.data;
    const repository = await prisma.repository.update({
      where: { id },
      data: { enabled: false },
    });

    return res.json({
      id: repository.id,
      githubRepoId: repository.githubRepoId,
      name: repository.name,
      fullName: repository.fullName,
      owner: repository.owner,
      private: repository.private,
      defaultBranch: repository.defaultBranch,
      language: repository.language,
      enabled: repository.enabled,
      createdAt: repository.createdAt.toISOString(),
      updatedAt: repository.updatedAt.toISOString(),
    });
  } catch (error) {
    logger.error('Failed to disable repository:', error);
    return res.status(500).json({ error: 'Failed to disable repository' });
  }
});


// API routes with rate limiting
import authRoutes from './api/routes/auth';
app.use('/api/auth', authLimiter, authRoutes);

if (env.NODE_ENV !== 'production') {
  app.post('/api/auth/test', (_req, res) => res.json({ message: 'Test route works!' }));
}

import documentationRoutes from './api/routes/documentation';
// Rate limiting se primenjuje samo na generate endpoint unutar rute, ne na sve
app.use('/api/documentation', documentationRoutes);

import searchRoutes from './api/routes/search';
app.use('/api/search', apiLimiter, searchRoutes); // Search endpoint

// Export routes
import exportRoutes from './api/routes/export';
app.use('/api/export', apiLimiter, exportRoutes); // Export endpoints with rate limiting

// Subscription routes
import subscriptionRoutes from './api/routes/subscription';
app.use('/api/subscription', subscriptionLimiter, subscriptionRoutes); // Subscription endpoints with relaxed rate limiting

// Admin routes
import adminRoutes from './api/routes/admin';
app.use('/api/admin', adminRoutes); // Admin endpoints (zahtevaju admin role)

import analyzeRoutes from './api/routes/analyze';
app.use('/api/analyze', apiLimiter, analyzeRoutes); // CI trigger: POST /api/analyze/trigger


// Sentry error handler (mora biti pre custom error handler-a)
// Sentry automatski hvata greške kroz init() poziv

// Error handling middleware
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  // Sentry će automatski da hvata greške ako je inicijalizovan
  if (env.NODE_ENV === 'production' && process.env.SENTRY_DSN) {
    const Sentry = require('@sentry/node');
    Sentry.captureException(err);
  }

  res.status(500).json({
    error: 'Internal server error',
    message: env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler (u production ne loguj detalje putanje)
app.use((req: Request, res: Response) => {
  if (env.NODE_ENV === 'development') logger.info(`404: ${req.method} ${req.path}`);
  res.status(404).json({ error: 'Not found' });
});

const PORT = parseInt(env.PORT, 10);

// Initialize connections and start server
async function startServer() {
  try {
    await connectDatabase();
    logger.info('✅ Database connected');

    const redisConnected = await testRedisConnection();
    if (!redisConnected) {
      logger.warn('Redis not available – server will start anyway. Queue (PR analysis) will not work until Redis is connected.');
    }

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`, {
        environment: env.NODE_ENV,
        frontendUrl: env.FRONTEND_URL,
      });
      
      // Log all registered routes
      logger.info('Registered routes:');
      app._router?.stack?.forEach((middleware: any) => {
        if (middleware.route) {
          logger.info(`  ${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`);
        } else if (middleware.name === 'router') {
          logger.info(`  Router: ${middleware.regexp}`);
          middleware.handle.stack?.forEach((handler: any) => {
            if (handler.route) {
              logger.info(`    ${Object.keys(handler.route.methods).join(', ').toUpperCase()} ${handler.route.path}`);
            }
          });
        }
      });
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});
