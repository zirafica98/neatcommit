/**
 * Admin Middleware
 * 
 * Proverava da li je korisnik admin
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/auth.service';
import prisma from '../config/database';
import { logger } from '../utils/logger';

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Proveri autentifikaciju
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);

    if (!payload) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    // Proveri da li je korisnik admin
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, username: true },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    if (user.role !== 'ADMIN') {
      logger.warn('Non-admin user attempted to access admin endpoint', {
        userId: user.id,
        username: user.username,
        path: req.path,
      });
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }

    // Dodaj user info u request
    (req as any).user = user;
    next();
  } catch (error) {
    logger.error('Admin middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
