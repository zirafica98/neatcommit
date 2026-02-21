/**
 * Auth Routes
 * GitHub OAuth i JWT token management
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
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
import { hashPassword, verifyPassword, validatePasswordStrength } from '../../utils/password';
import prisma from '../../config/database';

const router = Router();

// Zod schemas za validaciju (bezbednost: ograničenje dužine, tipovi)
const refreshBodySchema = z.object({ refreshToken: z.string().min(10).max(2000) });
const codeBodySchema = z.object({ code: z.string().min(10).max(500) });
const registerBodySchema = z.object({
  username: z.string().min(1).max(100).trim(),
  email: z.string().email().max(255),
  password: z.string().min(8).max(200),
  name: z.string().max(200).trim().optional(),
});
const loginBodySchema = z.object({
  username: z.string().min(1).max(256).trim(),
  password: z.string().min(1).max(200),
});

/**
 * GET /api/auth/github
 * 
 * Koristi GitHub OAuth App da dobije user informacije
 * Zatim proverava da li korisnik ima instaliran GitHub App
 * Ako nema, redirektuje ga na installation page
 * 
 * Flow:
 * 1. Korisnik klikne "Sign in with GitHub"
 * 2. Redirektuje ga na GitHub OAuth (za dobijanje user informacija)
 * 3. GitHub vraća OAuth code
 * 4. Backend dobija user informacije i proverava da li postoji installation
 * 5. Ako postoji installation, loguje korisnika
 * 6. Ako ne postoji, redirektuje ga na installation page
 */
router.get('/github', (_req: Request, res: Response) => {
  // Koristi GitHub OAuth App za dobijanje user informacija
  // Ovo je potrebno da bismo znali koji je korisnik, pre nego što proverimo installation
  if (!env.GITHUB_CLIENT_ID) {
    logger.error('GITHUB_CLIENT_ID is not configured. Cannot use OAuth flow.');
    return res.redirect(`${env.FRONTEND_URL}/auth/login?error=oauth_not_configured`);
  }

  const redirectUri = `${env.API_URL}/api/auth/github/callback`;
  const scope = 'read:user user:email';
  const state = Math.random().toString(36).substring(7);

  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}&state=${state}`;

  logger.info('Redirecting to GitHub OAuth', { 
    redirectUri,
    clientId: env.GITHUB_CLIENT_ID?.substring(0, 10) + '...',
  });
  res.redirect(githubAuthUrl);
});

/**
 * GET /api/auth/github/check
 * 
 * Proverava da li korisnik ima instalaciju na osnovu GitHub username-a
 * Koristi se kada korisnik ne zna installation_id
 */
router.get('/github/check', async (req: Request, res: Response) => {
  try {
    const rawUsername = req.query.username;
    const username = typeof rawUsername === 'string' && rawUsername.length <= 256 ? rawUsername.trim() : null;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    // Pronađi korisnika po username-u
    const user = await prisma.user.findUnique({
      where: { username: username as string },
      include: {
        installations: {
          where: {
            userId: { not: null },
          },
          take: 1,
        },
      },
    });

    if (!user || !user.githubId) {
      return res.status(404).json({ error: 'User not found or not linked to GitHub' });
    }

    if (user.installations.length === 0) {
      return res.status(404).json({ error: 'No installation found for this user' });
    }

    const installation = user.installations[0];
    
    // Generiši JWT tokene
    const jwtAccessToken = generateAccessToken(user);
    const jwtRefreshToken = generateRefreshToken(user);

    logger.info('User authenticated via installation check', {
      userId: user.id,
      username: user.username,
      installationId: installation.installationId,
    });

    return res.json({
      user: {
        id: user.id,
        githubId: user.githubId,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      accessToken: jwtAccessToken,
      refreshToken: jwtRefreshToken,
    });
  } catch (error) {
    logger.error('Installation check failed:', error);
    return res.status(500).json({ error: 'Failed to check installation' });
  }
});

/**
 * GET /api/auth/github/complete
 * 
 * Alternativni endpoint za ručno završavanje instalacije
 * Korisnik može da ode na ovaj URL sa installation_id parametrom
 * nakon što instalira GitHub App
 */
router.get('/github/complete', async (req: Request, res: Response) => {
  try {
    const { installation_id } = req.query;

    if (!installation_id) {
      return res.status(400).send(`
        <html>
          <head><title>Installation Complete</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Installation ID Missing</h1>
            <p>Please provide installation_id parameter.</p>
            <p>After installing the GitHub App, you should be redirected automatically.</p>
            <p>If not, you can manually complete the login by going to:</p>
            <code>/api/auth/github/complete?installation_id=YOUR_INSTALLATION_ID</code>
            <br><br>
            <a href="${env.FRONTEND_URL}/auth/login" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Go to Login</a>
          </body>
        </html>
      `);
    }

    const installationId = parseInt(installation_id as string);
    logger.info('Manual installation completion', { installationId });

    // Pronađi installation u bazi
    const installation = await prisma.installation.findUnique({
      where: { installationId: installationId },
      include: { user: true },
    });

    if (!installation) {
      return res.status(404).send(`
        <html>
          <head><title>Installation Not Found</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>Installation Not Found</h1>
            <p>Installation with ID ${installationId} was not found.</p>
            <p>Please wait a few seconds and try again, or contact support.</p>
            <br><br>
            <a href="${env.FRONTEND_URL}/auth/login" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Go to Login</a>
          </body>
        </html>
      `);
    }

    if (!installation.user) {
      return res.status(400).send(`
        <html>
          <head><title>User Not Linked</title></head>
          <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
            <h1>User Not Linked</h1>
            <p>Installation exists but user is not linked. Please try again.</p>
            <br><br>
            <a href="${env.FRONTEND_URL}/auth/login" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Go to Login</a>
          </body>
        </html>
      `);
    }

    // Generiši JWT tokene
    const jwtAccessToken = generateAccessToken(installation.user);
    const jwtRefreshToken = generateRefreshToken(installation.user);

    logger.info('User authenticated via manual completion', {
      userId: installation.user.id,
      username: installation.user.username,
      installationId: installationId,
    });

    // Redirect na frontend sa tokenima
    const redirectUrl = new URL(`${env.FRONTEND_URL}/auth/callback`);
    redirectUrl.searchParams.set('access_token', jwtAccessToken);
    redirectUrl.searchParams.set('refresh_token', jwtRefreshToken);

    return res.redirect(redirectUrl.toString());
  } catch (error) {
    logger.error('Manual installation completion failed:', error);
    return res.status(500).send(`
      <html>
        <head><title>Error</title></head>
        <body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h1>Authentication Failed</h1>
          <p>An error occurred during authentication. Please try again.</p>
          <br><br>
          <a href="${env.FRONTEND_URL}/auth/login" style="padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Go to Login</a>
        </body>
      </html>
    `);
  }
});

/**
 * GET /api/auth/github/callback
 * 
 * GitHub App installation callback handler
 * Ovo se poziva kada korisnik završi instalaciju GitHub App-a
 * GitHub redirektuje korisnika na ovaj URL sa installation_id parametrom
 */
router.get('/github/callback', async (req: Request, res: Response) => {
  try {
    logger.info('GitHub App installation callback received', {
      query: req.query,
      installation_id: req.query.installation_id,
      setup_action: req.query.setup_action,
    });

    const { installation_id } = req.query;

    // Ako ima installation_id, korisnik je završio instalaciju GitHub App-a
    if (installation_id) {
      const installationId = parseInt(installation_id as string);
      
      logger.info('Processing installation callback', { installationId });

      // Pronađi installation u bazi
      const installation = await prisma.installation.findUnique({
        where: { installationId: installationId },
        include: { user: true },
      });

      if (!installation) {
        logger.warn('Installation not found in callback - webhook may not have processed yet', {
          installationId,
        });
        // Sačekaj 5s pa probaj ponovo (webhook obično stigne za par sekundi)
        await new Promise((resolve) => setTimeout(resolve, 5000));
        let resolvedInstallation = await prisma.installation.findUnique({
          where: { installationId: installationId },
          include: { user: true },
        });
        // Još jedan retry posle 5s
        if (!resolvedInstallation) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          resolvedInstallation = await prisma.installation.findUnique({
            where: { installationId: installationId },
            include: { user: true },
          });
        }
        // I dalje nema zapisa – ne zovemo GitHub API (JWT problem). Šaljemo korisnika na
        // "čekaj" stranicu koja ga za ~10s vrati ovde; do tada webhook će verovatno upisati instalaciju.
        if (!resolvedInstallation) {
          logger.warn('Redirecting to installation-wait – installation still not in DB. Check: 1) GitHub App → Webhook URL = ' + `${env.API_URL}/webhook/github . 2) Subscribe to "Installation" events.`, { installationId });
          const waitUrl = new URL(`${env.FRONTEND_URL}/auth/installation-wait`);
          waitUrl.searchParams.set('installation_id', String(installationId));
          return res.redirect(waitUrl.toString());
        }

        if (resolvedInstallation?.user) {
          const jwtAccessToken = generateAccessToken(resolvedInstallation.user);
          const jwtRefreshToken = generateRefreshToken(resolvedInstallation.user);
          logger.info('User authenticated via installation callback (after retry)', {
            userId: resolvedInstallation.user.id,
            username: resolvedInstallation.user.username,
            installationId: installationId,
          });
          const redirectUrl = new URL(`${env.FRONTEND_URL}/auth/callback`);
          redirectUrl.searchParams.set('access_token', jwtAccessToken);
          redirectUrl.searchParams.set('refresh_token', jwtRefreshToken);
          return res.redirect(redirectUrl.toString());
        }
        // Installation postoji ali nema user – poveži po accountId iz baze (bez GitHub API)
        const userByAccount = await prisma.user.findUnique({
          where: { githubId: resolvedInstallation.accountId },
        });
        if (userByAccount) {
          await prisma.installation.update({
            where: { id: resolvedInstallation.id },
            data: { userId: userByAccount.id },
          });
          const jwtAccessToken = generateAccessToken(userByAccount);
          const jwtRefreshToken = generateRefreshToken(userByAccount);
          logger.info('User linked to installation from DB (after wait)', {
            userId: userByAccount.id,
            username: userByAccount.username,
            installationId: installationId,
          });
          const redirectUrl = new URL(`${env.FRONTEND_URL}/auth/callback`);
          redirectUrl.searchParams.set('access_token', jwtAccessToken);
          redirectUrl.searchParams.set('refresh_token', jwtRefreshToken);
          return res.redirect(redirectUrl.toString());
        }
        logger.warn('Installation has no user (no user with githubId)', {
          installationId,
          accountId: resolvedInstallation.accountId,
        });
        return res.redirect(`${env.FRONTEND_URL}/auth/login?error=sign_in_with_github_first`);
      } else {
        // Installation postoji - proveri da li ima povezanog korisnika
        if (installation.user) {
          const jwtAccessToken = generateAccessToken(installation.user);
          const jwtRefreshToken = generateRefreshToken(installation.user);

          logger.info('User authenticated via installation callback', {
            userId: installation.user.id,
            username: installation.user.username,
            installationId: installationId,
          });

          const redirectUrl = new URL(`${env.FRONTEND_URL}/auth/callback`);
          redirectUrl.searchParams.set('access_token', jwtAccessToken);
          redirectUrl.searchParams.set('refresh_token', jwtRefreshToken);

          return res.redirect(redirectUrl.toString());
        } else {
          // Installation postoji ali nema povezanog korisnika.
          // Prvo pokušaj povezivanje iz baze (installation.accountId === User.githubId) – bez GitHub API/JWT.
          const userByAccount = await prisma.user.findUnique({
            where: { githubId: installation.accountId },
          });
          if (userByAccount) {
            await prisma.installation.update({
              where: { id: installation.id },
              data: { userId: userByAccount.id },
            });
            const jwtAccessToken = generateAccessToken(userByAccount);
            const jwtRefreshToken = generateRefreshToken(userByAccount);
            logger.info('User linked to installation from DB (accountId)', {
              userId: userByAccount.id,
              username: userByAccount.username,
              installationId: installationId,
            });
            const redirectUrl = new URL(`${env.FRONTEND_URL}/auth/callback`);
            redirectUrl.searchParams.set('access_token', jwtAccessToken);
            redirectUrl.searchParams.set('refresh_token', jwtRefreshToken);
            return res.redirect(redirectUrl.toString());
          }

          logger.warn('Installation exists but no user linked (no user with githubId)', {
            installationId,
            accountId: installation.accountId,
          });
          return res.redirect(`${env.FRONTEND_URL}/auth/login?error=sign_in_with_github_first`);
        }
      }
    }

    // Ako nema installation_id, ovo je OAuth callback
    // Koristimo OAuth da dobijemo user informacije, pa proveravamo da li ima installation
    const { code, error } = req.query;

    if (error) {
      logger.warn('GitHub OAuth error', { error });
      return res.redirect(`${env.FRONTEND_URL}/auth/login?error=${error}`);
    }

    if (!code) {
      logger.warn('GitHub callback missing both installation_id and code', {
        query: req.query,
        url: req.url,
      });
      return res.redirect(`${env.FRONTEND_URL}/auth/login?error=missing_credentials`);
    }

    // OAuth flow - dobijamo user informacije
    const codeStr = Array.isArray(code) ? code[0] : code;
    logger.info('GitHub OAuth callback received', { code: (codeStr as string).substring(0, 10) + '...' });

    const accessToken = await exchangeCodeForToken(codeStr as string);
    const githubUser = await getGitHubUser(accessToken);
    
    // Kreiraj ili pronađi korisnika
    let user = await findOrCreateUser(githubUser);

    // Proveri da li korisnik ima instaliran GitHub App
    const { getUserRepositories } = await import('../../services/user-repositories.service');
    
    try {
      const repositories = await getUserRepositories(user.id);
      
      // Ako korisnik ima repozitorijume, znači da ima instalaciju
      if (repositories.length > 0) {
        // Korisnik ima instalaciju - loguj ga
        const jwtAccessToken = generateAccessToken(user);
        const jwtRefreshToken = generateRefreshToken(user);

        logger.info('User authenticated via OAuth with existing installation', {
          userId: user.id,
          username: user.username,
          repositoriesCount: repositories.length,
        });

        const redirectUrl = new URL(`${env.FRONTEND_URL}/auth/callback`);
        redirectUrl.searchParams.set('access_token', jwtAccessToken);
        redirectUrl.searchParams.set('refresh_token', jwtRefreshToken);

        return res.redirect(redirectUrl.toString());
      } else {
        // Korisnik nema instalaciju - redirektuj ga na installation page
        logger.info('User does not have installation, redirecting to installation page', {
          userId: user.id,
          username: user.username,
        });

        // Sačuvaj user ID u session ili query param da znamo koga da povežemo
        const redirectUrl = new URL(`${env.FRONTEND_URL}/auth/install`);
        redirectUrl.searchParams.set('userId', user.id);
        redirectUrl.searchParams.set('username', user.username);
        
        // Redirektuj na frontend install stranicu koja će otvoriti GitHub App installation
        return res.redirect(redirectUrl.toString());
      }
    } catch (error: any) {
      // Ako getUserRepositories baca grešku (npr. "User does not have GitHub account"),
      // to znači da korisnik nema instalaciju
      logger.warn('Error checking installation, redirecting to install page', {
        userId: user.id,
        username: user.username,
        error: error.message,
      });

      const redirectUrl = new URL(`${env.FRONTEND_URL}/auth/install`);
      redirectUrl.searchParams.set('userId', user.id);
      redirectUrl.searchParams.set('username', user.username);
      
      return res.redirect(redirectUrl.toString());
    }
  } catch (error) {
    logger.error('GitHub callback failed:', error);
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
    const parsed = codeBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(env.NODE_ENV === 'production' ? { error: 'Invalid request' } : { error: 'Invalid request', details: parsed.error.flatten() });
    }
    const { code } = parsed.data;

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
    const parsed = refreshBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Missing or invalid refresh token' });
    }
    const { refreshToken } = parsed.data;

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
      role: user.role || 'USER',
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
 * POST /api/auth/register
 * 
 * Registracija novog admin korisnika (samo za password-based login)
 */
router.post('/register', async (req: Request, res: Response) => {
  try {
    const parsed = registerBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(env.NODE_ENV === 'production' ? { error: 'Invalid request' } : { error: 'Invalid request', details: parsed.error.flatten() });
    }
    const { username, email, password, name } = parsed.data;

    // Proveri password strength
    const passwordValidation = validatePasswordStrength(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.message });
    }

    // Proveri da li korisnik već postoji
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email },
        ],
      },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User with this username or email already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Kreiraj korisnika (default role je USER, ali može se promeniti kroz admin panel)
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        name: name || null,
        role: 'USER', // Default role, može se promeniti u admin panelu
      },
    });

    logger.info('User registered', {
      userId: user.id,
      username: user.username,
      email: user.email,
    });

    // Generiši tokene
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error('Registration failed:', error);
    return res.status(500).json({
      error: 'Registration failed',
      message: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * POST /api/auth/login
 * 
 * Login sa username/password-om (za password-based korisnike)
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = loginBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    const { username, password } = parsed.data;
    // Pronađi korisnika po username ili email-u
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username },
          { email: username },
        ],
      },
    });

    if (!user) {
      logger.warn('Login attempt with invalid username', { username });
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    logger.info(`🔵 User found: ${user.username} (${user.id}), hasPassword: ${!!user.password}`);

    // Proveri da li korisnik ima password (password-based login)
    if (!user.password) {
      logger.warn('Login attempt for GitHub OAuth user with password', { username, userId: user.id });
      return res.status(401).json({ error: 'This account uses GitHub OAuth. Please login with GitHub.' });
    }

    logger.info('🔵 Verifying password');
    // Verifikuj password
    const isValidPassword = await verifyPassword(password, user.password);
    logger.info(`🔵 Password verification result: ${isValidPassword}`);
    if (!isValidPassword) {
      logger.warn('Login attempt with invalid password', { username, userId: user.id });
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    logger.info('User logged in', {
      userId: user.id,
      username: user.username,
      method: 'password',
    });

    // Generiši tokene
    logger.info('🔵 Generating tokens');
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    logger.info('🔵 Sending login response');
    return res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatarUrl: user.avatarUrl,
        name: user.name,
        role: user.role || 'USER',
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    logger.error('Login failed:', error);
    return res.status(500).json({
      error: 'Login failed',
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
