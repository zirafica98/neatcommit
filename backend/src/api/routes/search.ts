/**
 * Search Routes
 * 
 * API endpoints for search functionality
 */

import { Router, Request, Response } from 'express';
import { search } from '../../services/search.service';
import { verifyAccessToken } from '../../services/auth.service';
import { validateQuery } from '../../middleware/validation';
import { z } from 'zod';

const router = Router();

const searchQuerySchema = z.object({
  q: z.string().min(1).max(200).trim(),
  type: z.enum(['reviews', 'issues', 'repositories', 'all']).optional(),
  limit: z.preprocess((val) => {
    const n = typeof val === 'string' ? parseInt(val, 10) : val;
    return Math.min(Math.max(Number.isNaN(n) ? 20 : n, 1), 50);
  }, z.number().min(1).max(50)),
  offset: z.preprocess((val) => {
    const n = typeof val === 'string' ? parseInt(val, 10) : val;
    return Math.min(Math.max(Number.isNaN(n) ? 0 : n, 0), 500);
  }, z.number().min(0).max(500)),
});

/**
 * GET /api/search
 * 
 * Search across reviews, issues, and repositories
 */
router.get(
  '/',
  validateQuery(searchQuerySchema),
  async (req: Request, res: Response) => {
    try {
      // Get user ID from token if authenticated
      let userId: string | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const payload = verifyAccessToken(token);
        if (payload) {
          userId = payload.userId;
        }
      }

      const { q, type, limit, offset } = req.query as any;

      const results = await search({
        query: q,
        type: type || 'all',
        limit: limit || 20,
        offset: offset || 0,
        userId,
      });

      return res.json(results);
    } catch (error) {
      return res.status(500).json({
        error: 'Search failed',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

export default router;
