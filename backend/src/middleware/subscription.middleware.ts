/**
 * Subscription Middleware
 * 
 * Middleware za proveru subscription limits
 */

import { Request, Response, NextFunction } from 'express';
import { canCreateReview, canAddRepository } from '../services/subscription.service';
import { verifyAccessToken } from '../services/auth.service';
import { logger } from '../utils/logger';

/**
 * Middleware za proveru da li korisnik može da kreira review
 */
export async function checkReviewLimit(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const check = await canCreateReview(payload.userId);

    if (!check.allowed) {
      return res.status(403).json({
        error: 'Review limit exceeded',
        message: check.reason,
        code: 'REVIEW_LIMIT_EXCEEDED',
      });
    }

    // Attach userId to request for later use
    (req as any).userId = payload.userId;
    return next();
  } catch (error) {
    logger.error('Subscription middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Middleware za proveru da li korisnik može da doda repository
 */
export async function checkRepositoryLimit(req: Request, res: Response, next: NextFunction): Promise<void | Response> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const check = await canAddRepository(payload.userId);

    if (!check.allowed) {
      return res.status(403).json({
        error: 'Repository limit exceeded',
        message: check.reason,
        code: 'REPOSITORY_LIMIT_EXCEEDED',
      });
    }

    // Attach userId to request for later use
    (req as any).userId = payload.userId;
    return next();
  } catch (error) {
    logger.error('Subscription middleware error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
