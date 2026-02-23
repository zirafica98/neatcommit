/**
 * Auth Service
 * 
 * Upravlja autentifikacijom i GitHub OAuth flow-om
 */

import { Octokit } from '@octokit/rest';
import jwt from 'jsonwebtoken';
import env from '../config/env';
import prisma from '../config/database';
import { logger } from '../utils/logger';
import { User } from '@prisma/client';

export type AuthProvider = 'github' | 'gitlab' | 'bitbucket';

export interface TokenPayload {
  userId: string;
  githubId?: number;
  username: string;
  role?: string;
  provider?: AuthProvider; // which login method was used – determines what data we show
}

/**
 * Generiše JWT access token
 * @param user - User from DB
 * @param provider - which provider they logged in with (default github for backward compat)
 */
export function generateAccessToken(user: User, provider?: AuthProvider): string {
  const payload: TokenPayload = {
    userId: user.id,
    githubId: user.githubId ?? undefined,
    username: user.username,
    role: user.role || 'USER',
    provider: provider ?? (user.githubId != null ? 'github' : user.gitlabId != null ? 'gitlab' : user.bitbucketUuid != null ? 'bitbucket' : 'github'),
  };

  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

/**
 * Generiše JWT refresh token
 */
export function generateRefreshToken(user: User, provider?: AuthProvider): string {
  const payload: TokenPayload = {
    userId: user.id,
    githubId: user.githubId ?? undefined,
    username: user.username,
    provider: provider ?? undefined,
  };

  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
  } as jwt.SignOptions);
}

/**
 * Verifikuje JWT access token
 */
export function verifyAccessToken(token: string): TokenPayload | null {
  if (!token || typeof token !== 'string' || token.length < 20) {
    return null;
  }
  // Ne loguj za očigledno nevažeće (npr. "undefined", "null") – samo return null
  const looksLikeJwt = token.split('.').length === 3;
  try {
    return jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  } catch (error) {
    if (looksLikeJwt) {
      logger.warn('Invalid access token', { error });
    }
    return null;
  }
}

/**
 * Verifikuje JWT refresh token
 */
export function verifyRefreshToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as TokenPayload;
  } catch (error) {
    logger.warn('Invalid refresh token', { error });
    return null;
  }
}

/**
 * Dohvata GitHub user informacije koristeći access token
 */
export async function getGitHubUser(accessToken: string): Promise<any> {
  const octokit = new Octokit({
    auth: accessToken,
  });

  const { data } = await octokit.users.getAuthenticated();
  return data;
}

/**
 * Razmenjuje GitHub OAuth code za access token
 */
export async function exchangeCodeForToken(code: string): Promise<string> {
  const response = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to exchange code for token');
  }

  const data = (await response.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (data.error) {
    throw new Error(data.error_description || data.error);
  }

  if (!data.access_token) {
    throw new Error('No access token in response');
  }

  return data.access_token;
}

/**
 * Kreira ili ažurira user u bazi na osnovu GitHub podataka.
 * Ako je korisnik ranije odvezao GitHub (githubId = null), pronalazimo ga po username-u i ponovo povezujemo.
 */
export async function findOrCreateUser(githubUser: any): Promise<User> {
  // 1) Pronađi po githubId (već povezan nalog)
  let user = await prisma.user.findUnique({
    where: { githubId: githubUser.id },
  });

  if (user) {
    return prisma.user.update({
      where: { id: user.id },
      data: {
        username: githubUser.login,
        email: githubUser.email || null,
        avatarUrl: githubUser.avatar_url || null,
        name: githubUser.name || null,
      },
    });
  }

  // 2) Nema po githubId – možda je odvezao GitHub (reconnect). Pronađi po username-u.
  user = await prisma.user.findUnique({
    where: { username: githubUser.login },
  });

  if (user) {
    return prisma.user.update({
      where: { id: user.id },
      data: {
        githubId: githubUser.id,
        email: githubUser.email ?? user.email,
        avatarUrl: githubUser.avatar_url ?? user.avatarUrl,
        name: githubUser.name ?? user.name,
      },
    });
  }

  // 3) Nov korisnik – kreiraj
  return prisma.user.create({
    data: {
      githubId: githubUser.id,
      username: githubUser.login,
      email: githubUser.email || null,
      avatarUrl: githubUser.avatar_url || null,
      name: githubUser.name || null,
    },
  });
}
