/**
 * Analyze trigger API – for CI or manual run
 *
 * POST /api/analyze/trigger
 * Body: { owner: string, repo: string, pullNumber: number }
 * Auth: Bearer JWT (user must have access to the repo's installation)
 *
 * Enqueues the same analysis job as the webhook. Used by GitHub Actions or other CI.
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../../config/database';
import { analysisQueue } from '../../config/queue';
import { getPullRequest } from '../../services/github.service';
import { verifyAccessToken } from '../../services/auth.service';
import { logger } from '../../utils/logger';

const router = Router();

const triggerBodySchema = z.object({
  owner: z.string().min(1).max(200),
  repo: z.string().min(1).max(200),
  pullNumber: z.number().int().positive(),
});

router.post('/trigger', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization required' });
    }
    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);
    if (!payload?.userId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    const userId = payload.userId;

    const parsed = triggerBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid body', details: parsed.error.flatten() });
    }
    const { owner, repo, pullNumber } = parsed.data;
    const fullName = `${owner}/${repo}`;

    const repository = await prisma.repository.findFirst({
      where: { fullName, enabled: true },
      include: { installation: true },
    });
    if (!repository) {
      return res.status(404).json({ error: 'Repository not found or not enabled', fullName });
    }

    const inst = repository.installation;
    if (!inst) {
      return res.status(500).json({ error: 'Installation not found' });
    }
    if (inst.userId !== userId) {
      return res.status(403).json({ error: 'You do not have access to this repository' });
    }

    const pr = await getPullRequest(inst.installationId, owner, repo, pullNumber);
    if (!pr) {
      return res.status(404).json({ error: 'Pull request not found' });
    }

    const review = await prisma.review.upsert({
      where: { githubPrId: pr.id.toString() },
      create: {
        installationId: inst.id,
        repositoryId: repository.id,
        userId: inst.userId ?? undefined,
        githubPrNumber: pullNumber,
        githubPrId: pr.id.toString(),
        githubPrUrl: pr.html_url ?? '',
        githubPrTitle: pr.title ?? '',
        githubPrState: pr.state ?? 'open',
        githubSha: pr.head.sha,
        status: 'pending',
      },
      update: {
        githubSha: pr.head.sha,
        githubPrState: pr.state ?? 'open',
        status: 'pending',
        updatedAt: new Date(),
      },
    });

    const job = await analysisQueue.add('analyze-pr', {
      installationId: inst.installationId,
      owner,
      repo,
      pullNumber,
      sha: pr.head.sha,
      prId: pr.id.toString(),
      prUrl: pr.html_url ?? '',
      prTitle: pr.title ?? '',
    });

    logger.info('Analysis triggered via API', {
      userId,
      fullName,
      pullNumber,
      jobId: job.id,
      reviewId: review.id,
    });

    return res.status(202).json({
      jobId: job.id,
      reviewId: review.id,
      status: 'queued',
      message: 'Analysis job queued. Check the PR or dashboard for results.',
    });
  } catch (error) {
    logger.error('Analyze trigger failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return res.status(500).json({
      error: 'Failed to trigger analysis',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

export default router;
