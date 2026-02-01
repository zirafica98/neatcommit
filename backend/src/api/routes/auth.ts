/**
 * Auth Routes
 * 
 * GitHub OAuth i JWT token management
 */

import { Router, Request, Response } from 'express';
import env from '../../config/env';
import { logger } from '../../utils/logger';
import {
  exchangeCodeForToken,
  getGitHubUser,
  findOrCreateUser,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  verifyAccessToken,
} from '../../services/auth.service';
import prisma from '../../config/database';

const router = Router();

/**
 * GET /api/auth/github
 * 
 * Redirectuje korisnika na GitHub OAuth
 */
router.get('/github', (_req: Request, res: Response) => {
  const redirectUri = `${env.API_URL}/api/auth/github/callback`;
  const scope = 'read:user user:email';
  const state = Math.random().toString(36).substring(7); // Random state za security

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;

  logger.info('Redirecting to GitHub OAuth', { redirectUri });
  res.redirect(githubAuthUrl);
});

/**
 * GET /api/auth/github/callback
 * 
 * OAuth callback handler
 */
router.get('/github/callback', async (req: Request, res: Response) => {
  try {
    const { code, error } = req.query;

    if (error) {
      logger.warn('GitHub OAuth error', { error });
      return res.redirect(`${env.FRONTEND_URL}/auth/login?error=${error}`);
    }

    if (!code) {
      logger.warn('GitHub OAuth callback missing code');
      return res.redirect(`${env.FRONTEND_URL}/auth/login?error=missing_code`);
    }

    const codeStr = Array.isArray(code) ? code[0] : code;
    logger.info('GitHub OAuth callback received', { code: (codeStr as string).substring(0, 10) + '...' });

    // 1. Razmeni code za access token
    const accessToken = await exchangeCodeForToken(codeStr as string);

    // 2. Dohvati GitHub user informacije
    const githubUser = await getGitHubUser(accessToken);

    // 3. Kreiraj ili ažuriraj user u bazi
    const user = await findOrCreateUser(githubUser);

    // 4. Generiši JWT tokene
    const jwtAccessToken = generateAccessToken(user);
    const jwtRefreshToken = generateRefreshToken(user);

    logger.info('User authenticated', {
      userId: user.id,
      username: user.username,
    });

    // 5. Redirect na frontend sa tokenima
    const redirectUrl = new URL(`${env.FRONTEND_URL}/auth/callback`);
    redirectUrl.searchParams.set('access_token', jwtAccessToken);
    redirectUrl.searchParams.set('refresh_token', jwtRefreshToken);

    res.redirect(redirectUrl.toString());
  } catch (error) {
    logger.error('GitHub OAuth callback failed:', error);
    res.redirect(`${env.FRONTEND_URL}/auth/login?error=auth_failed`);
  }
});

/**
 * POST /api/auth/github/callback
 * 
 * Alternativni callback endpoint (za frontend direktno)
 */
router.post('/github/callback', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: 'Missing code' });
    }

    logger.info('GitHub OAuth callback (POST)', { code: code.substring(0, 10) + '...' });

    // 1. Razmeni code za access token
    const accessToken = await exchangeCodeForToken(code);

    // 2. Dohvati GitHub user informacije
    const githubUser = await getGitHubUser(accessToken);

    // 3. Kreiraj ili ažuriraj user u bazi
    const user = await findOrCreateUser(githubUser);

    // 4. Generiši JWT tokene
    const jwtAccessToken = generateAccessToken(user);
    const jwtRefreshToken = generateRefreshToken(user);

    logger.info('User authenticated (POST)', {
      userId: user.id,
      username: user.username,
    });

    return res.json({
      user: {
        id: user.id,
        githubId: user.githubId,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      accessToken: jwtAccessToken,
      refreshToken: jwtRefreshToken,
    });
  } catch (error) {
    logger.error('GitHub OAuth callback (POST) failed:', error);
    return res.status(500).json({
      error: 'Authentication failed',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/auth/refresh
 * 
 * Refresh access token koristeći refresh token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Missing refresh token' });
    }

    // Verifikuj refresh token
    const payload = verifyRefreshToken(refreshToken);

    if (!payload) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    // Dohvati user iz baze
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Generiši novi access token
    const newAccessToken = generateAccessToken(user);

    return res.json({
      accessToken: newAccessToken,
    });
  } catch (error) {
    logger.error('Token refresh failed:', error);
    return res.status(500).json({
      error: 'Token refresh failed',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * GET /api/auth/me
 * 
 * Dohvata trenutnog user-a na osnovu JWT tokena
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    // Dohvati token iz Authorization header-a
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const payload = verifyAccessToken(token);

    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Dohvati user iz baze
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.json({
      id: user.id,
      githubId: user.githubId,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    });
  } catch (error) {
    logger.error('Get current user failed:', error);
    return res.status(500).json({
      error: 'Failed to get current user',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/auth/logout
 * 
 * Logout (client-side samo briše token, ali endpoint postoji za konzistentnost)
 */
router.post('/logout', (_req: Request, res: Response) => {
  // JWT je stateless, tako da logout je samo client-side
  // U production-u možemo dodati token blacklist
  return res.json({ message: 'Logged out successfully' });
});

export default router;
