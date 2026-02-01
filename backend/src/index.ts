import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import env from './config/env';
import { logger } from './utils/logger';
import { connectDatabase } from './config/database';
import prisma from './config/database';
import { testRedisConnection } from './config/redis';
import { analysisQueue } from './config/queue';
import './workers/analysis.worker'; // Start worker
import './workers/documentation.worker'; // Start documentation worker

const app: Express = express();

// Middleware
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV,
  });
});

// Test queue endpoint (for development)
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

    res.json({
      message: 'Job added to queue',
      jobId: job.id,
    });
  } catch (error) {
    logger.error('Failed to add job to queue:', error);
    res.status(500).json({ error: 'Failed to add job' });
  }
});

// Test webhook endpoint (for development - simulates GitHub webhook)
app.post('/test/webhook', async (req: Request, res: Response) => {
  try {
    const { event, payload } = req.body;

    if (!event || !payload) {
      res.status(400).json({ error: 'Missing event or payload' });
      return;
    }

    logger.info('Test webhook received', { event });

    // Pozovi webhook handler direktno
    const { handleWebhookEvent } = await import('./api/routes/webhooks');
    await handleWebhookEvent(event, payload);

    res.status(200).json({ received: true, event });
  } catch (error) {
    logger.error('Test webhook failed:', error);
    res.status(500).json({ error: 'Test webhook failed', message: (error as Error).message });
  }
});

// Test analysis endpoint (for development - testira Analysis Service direktno)
app.post('/test/analysis', async (req: Request, res: Response) => {
  try {
    const { code, filename } = req.body;

    if (!code || !filename) {
      res.status(400).json({ error: 'Missing code or filename' });
      return;
    }

    logger.info('Test analysis requested', { filename, codeLength: code.length });

    // Pozovi Analysis Service direktno
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
        issues: result.allIssues.slice(0, 10), // Prvih 10 issue-a
      },
    });
  } catch (error) {
    logger.error('Test analysis failed:', error);
    res.status(500).json({
      error: 'Test analysis failed',
      message: (error as Error).message,
      stack: env.NODE_ENV === 'development' ? (error as Error).stack : undefined,
    });
  }
});

// API routes
import webhookRoutes from './api/routes/webhooks';
app.use('/webhook', webhookRoutes);

// Database preview endpoints (for development)
app.get('/api/reviews', async (_req: Request, res: Response) => {
  try {
    const reviews = await prisma.review.findMany({
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
    const { id } = req.params;
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
    const { severity, limit = '50' } = req.query;
    const issues = await prisma.issue.findMany({
      take: parseInt(limit as string, 10),
      where: severity ? { severity: severity as string } : undefined,
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
app.get('/api/dashboard/stats', async (_req: Request, res: Response) => {
  try {
    // Get total reviews count
    const totalReviews = await prisma.review.count();

    // Get total issues count
    const totalIssues = await prisma.issue.count();

    // Get issues by severity
    const criticalIssues = await prisma.issue.count({
      where: { severity: 'CRITICAL' },
    });
    const highIssues = await prisma.issue.count({
      where: { severity: 'HIGH' },
    });
    const mediumIssues = await prisma.issue.count({
      where: { severity: 'MEDIUM' },
    });
    const lowIssues = await prisma.issue.count({
      where: { severity: 'LOW' },
    });

    // Calculate average security score
    const reviewsWithScore = await prisma.review.findMany({
      where: {
        status: 'completed',
        securityScore: { not: null },
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

    // Get recent reviews (last 5)
    const recentReviews = await prisma.review.findMany({
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

      if (user) {
        // Pronađi installation-e koje nisu povezane sa korisnikom ali imaju isti accountId
        await prisma.installation.updateMany({
          where: {
            accountId: user.githubId,
            userId: null, // Nisu povezani
          },
          data: {
            userId: user.id,
          },
        });
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
    const { id } = req.params;
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
    const { id } = req.params;
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

    // Pronađi installation za korisnika
    const installation = await prisma.installation.findFirst({
      where: {
        userId: payload.userId,
        accountId: user.githubId,
      },
    });

    if (!installation) {
      return res.status(404).json({ error: 'No GitHub App installation found for this user' });
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
    const { id } = req.params;
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


// API routes
import authRoutes from './api/routes/auth';
app.use('/api/auth', authRoutes);

import documentationRoutes from './api/routes/documentation';
app.use('/api/documentation', documentationRoutes);


// Error handling middleware
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: 'Internal server error',
    message: env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

const PORT = parseInt(env.PORT, 10);

// Initialize connections and start server
async function startServer() {
  try {
    await connectDatabase();
    logger.info('✅ Database connected');

    const redisConnected = await testRedisConnection();
    if (!redisConnected) {
      throw new Error('Redis connection failed');
    }

    app.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT}`, {
        environment: env.NODE_ENV,
        frontendUrl: env.FRONTEND_URL,
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
