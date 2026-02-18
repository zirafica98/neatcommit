/**
 * Admin Routes
 * 
 * Admin panel API endpoint-i
 */

import { Router, Request, Response } from 'express';
import { requireAdmin } from '../../middleware/admin.middleware';
import { getAdminStats, getUsers, getUserDetails } from '../../services/admin.service';
import { logger } from '../../utils/logger';

const router = Router();

// Svi admin endpoint-i zahtevaju admin autentifikaciju
router.use(requireAdmin);

/**
 * GET /api/admin/stats
 * Dohvata admin statistike
 */
router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const stats = await getAdminStats();
    return res.json(stats);
  } catch (error) {
    logger.error('Failed to get admin stats:', error);
    return res.status(500).json({ error: 'Failed to get admin stats' });
  }
});

/**
 * GET /api/admin/users
 * Dohvata listu korisnika sa paginacijom
 */
router.get('/users', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;

    const result = await getUsers(page, limit);
    return res.json(result);
  } catch (error) {
    logger.error('Failed to get users:', error);
    return res.status(500).json({ error: 'Failed to get users' });
  }
});

/**
 * GET /api/admin/users/:id
 * Dohvata detalje o korisniku
 */
router.get('/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userDetails = await getUserDetails(id);

    if (!userDetails) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json(userDetails);
  } catch (error) {
    logger.error('Failed to get user details:', error);
    return res.status(500).json({ error: 'Failed to get user details' });
  }
});

export default router;
