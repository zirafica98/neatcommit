import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import env from './config/env';
import { logger } from './utils/logger';
import { connectDatabase } from './config/database';
import prisma from './config/database';
import { testRedisConnection } from './config/redis';
import { analysisQueue } from './config/queue';
import './workers/analysis.worker'; // Start worker

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
        repository: {
          select: {
            name: true,
            fullName: true,
          },
        },
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
        prNumber: r.githubPrNumber,
        prTitle: r.githubPrTitle,
        prUrl: r.githubPrUrl,
        status: r.status,
        score: r.securityScore,
        totalIssues: r.totalIssues,
        criticalIssues: r.criticalIssues,
        highIssues: r.highIssues,
        repository: r.repository.fullName,
        createdAt: r.createdAt,
        completedAt: r.completedAt,
        issueCount: r._count.issues,
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

    return res.json(review);
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

// Other routes will be added here
// app.use('/api/auth', authRoutes);
// app.use('/api/repositories', repositoryRoutes);
// app.use('/api/dashboard', dashboardRoutes);

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
