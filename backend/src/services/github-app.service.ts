import { createPrivateKey } from 'crypto';
import { App } from '@octokit/app';
import { Octokit } from '@octokit/core';
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods';
import { paginateRest } from '@octokit/plugin-paginate-rest';
import { createAppAuth } from '@octokit/auth-app';
import jwt from 'jsonwebtoken';
import env from '../config/env';
import { logger } from '../utils/logger';

const OctokitWithPlugins = Octokit.plugin(restEndpointMethods, paginateRest);

/**
 * GitHub App Service
 * 
 * Šta radi:
 * - Kreira GitHub App instancu za autentifikaciju
 * - Generiše installation tokens za pristup GitHub API-ju
 * - Upravlja App autentifikacijom
 * 
 * Kako funkcioniše:
 * 1. GitHub App koristi private key za JWT token
 * 2. Sa JWT token-om dobijamo installation access token
 * 3. Sa installation token-om možemo da pristupamo GitHub API-ju
 */

const PEM_BEGIN = '-----BEGIN RSA PRIVATE KEY-----';
const PEM_END = '-----END RSA PRIVATE KEY-----';

/**
 * Formatira private key za korišćenje.
 * Na Renderu (i drugim hostovima) env varijabla često gubi nove redove – onda GitHub
 * odgovara "A JSON web token could not be decoded".
 * Podržani formati:
 * - Jedan red sa literal \n: "-----BEGIN...\nMIIE...\n-----END..."
 * - Više redova (prav PEM)
 * - Jedan dugačak red bez \n (rekonstruišemo PEM, 64 char po liniji)
 */
function formatPrivateKey(key: string): string {
  if (!key || typeof key !== 'string' || key.trim().length === 0) {
    throw new Error('GITHUB_PRIVATE_KEY is empty or undefined');
  }

  let formatted = key.trim();

  // Literal backslash-n (dva karaktera) → pravi newline
  if (formatted.includes('\\n')) {
    formatted = formatted.replace(/\\n/g, '\n');
  }

  // Već ima nove redove i izgleda kao PEM
  if (formatted.includes('\n') && formatted.includes(PEM_BEGIN) && formatted.includes(PEM_END)) {
    return formatted;
  }

  // Jedan red bez newline, ili sa razmacima umesto newline (Render/.env) – rekonstruišemo PEM
  if (formatted.includes(PEM_BEGIN) && formatted.includes(PEM_END)) {
    const afterBegin = formatted.indexOf(PEM_BEGIN) + PEM_BEGIN.length;
    const beforeEnd = formatted.indexOf(PEM_END);
    // Ukloni sve beline i bilo koji karakter koji nije base64 (A-Za-z0-9+/=)
    const rawMiddle = formatted.slice(afterBegin, beforeEnd).replace(/\s/g, '');
    const middle = rawMiddle.replace(/[^A-Za-z0-9+/=]/g, '');
    if (middle.length % 4 !== 0) {
      logger.error('Private key base64 length invalid (truncated?). Length: ' + middle.length);
      throw new Error('GITHUB_PRIVATE_KEY base64 part looks truncated or invalid');
    }
    const lines: string[] = [];
    for (let i = 0; i < middle.length; i += 64) {
      lines.push(middle.slice(i, i + 64));
    }
    formatted = `${PEM_BEGIN}\n${lines.join('\n')}\n${PEM_END}`;
    logger.info('Private key normalized (spaces/newlines → PEM) for GitHub JWT');
    return formatted;
  }

  if (!formatted.includes(PEM_BEGIN)) {
    logger.error('Private key missing -----BEGIN RSA PRIVATE KEY-----');
    throw new Error('Invalid private key format: missing BEGIN marker');
  }
  if (!formatted.includes(PEM_END)) {
    logger.error('Private key missing -----END RSA PRIVATE KEY-----');
    throw new Error('Invalid private key format: missing END marker');
  }

  return formatted;
}

// Kreiraj GitHub App instancu
let githubApp: App;

try {
  githubApp = new App({
    appId: env.GITHUB_APP_ID,
    privateKey: formatPrivateKey(env.GITHUB_PRIVATE_KEY),
    webhooks: {
      secret: env.GITHUB_WEBHOOK_SECRET,
    },
    oauth: env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET ? {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    } : undefined,
  });
  logger.info('✅ GitHub App initialized successfully');
} catch (error) {
  logger.error('❌ Failed to initialize GitHub App:', {
    error: error instanceof Error ? error.message : String(error),
  });
  throw error;
}

export { githubApp };

/**
 * Proverava da li je PEM string zaista validan privatni ključ (Node crypto).
 * Ako je ključ skraćen ili pogrešan, dobijamo jasan error pre slanja ka GitHubu.
 */
function verifyPrivateKeyPem(pem: string): void {
  try {
    createPrivateKey(pem);
  } catch (e) {
    logger.error('GITHUB_PRIVATE_KEY is not a valid PEM key (truncated or wrong format)', {
      error: e instanceof Error ? e.message : String(e),
    });
    throw new Error('GITHUB_PRIVATE_KEY is invalid or truncated. Use one line with \\n for newlines.');
  }
}

/**
 * Generiše GitHub App JWT ručno (za zaobilazak problema "A JSON web token could not be decoded"
 * kada env varijabla na hostu (npr. Render) pokvari format).
 * GitHub očekuje: iss = App ID (integer), iat, exp (max 10 min).
 */
function createGitHubAppJwt(): string {
  const key = formatPrivateKey(env.GITHUB_PRIVATE_KEY);
  verifyPrivateKeyPem(key);
  const appId = parseInt(env.GITHUB_APP_ID, 10);
  if (Number.isNaN(appId)) {
    throw new Error('GITHUB_APP_ID must be a number');
  }
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: appId,
    iat: now,
    exp: now + 600, // 10 min
  };
  return jwt.sign(payload, key, { algorithm: 'RS256' });
}

/**
 * Dobija installation access token direktnim pozivom GitHub API-ja sa ručno generisanim JWT.
 * Koristi se kada createAppAuth vraća "A JSON web token could not be decoded".
 */
async function getInstallationTokenViaApi(installationId: number): Promise<string> {
  let token: string;
  try {
    token = createGitHubAppJwt();
  } catch (signError) {
    logger.error('GitHub App JWT signing failed (check GITHUB_PRIVATE_KEY format)', {
      error: signError instanceof Error ? signError.message : String(signError),
    });
    throw signError;
  }
  if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
    logger.error('Generated JWT is invalid (wrong structure)');
    throw new Error('Generated JWT is invalid');
  }
  const res = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    }
  );
  if (!res.ok) {
    const body = await res.text();
    let errMsg = body;
    try {
      const j = JSON.parse(body);
      errMsg = j.message || j.error || body;
    } catch {
      // use body as is
    }
    throw new Error(`GitHub API ${res.status}: ${errMsg}`);
  }
  const data = (await res.json()) as { token: string };
  return data.token;
}

/**
 * Dobija installation access token za dati installation ID.
 * Prvo pokušava ručni JWT + GitHub API (robustnije na Renderu), pa fallback na @octokit/auth-app.
 */
async function getInstallationToken(installationId: number): Promise<string> {
  try {
    const token = await getInstallationTokenViaApi(installationId);
    logger.debug('✅ Installation token obtained (manual JWT)', { installationId });
    return token;
  } catch (manualError) {
    logger.warn('Manual JWT installation token failed, trying createAppAuth', {
      installationId,
      error: manualError instanceof Error ? manualError.message : String(manualError),
    });
  }

  try {
    const auth = createAppAuth({
      appId: env.GITHUB_APP_ID,
      privateKey: formatPrivateKey(env.GITHUB_PRIVATE_KEY),
    });
    const { token } = await auth({
      type: 'installation',
      installationId: installationId,
    });
    logger.debug('✅ Installation token obtained (createAppAuth)', { installationId });
    return token;
  } catch (error) {
    logger.error('❌ Failed to get installation token:', {
      installationId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Dobija Octokit instancu za dati installation ID
 * Ova instanca automatski koristi installation token i ima rest property
 * 
 * @param installationId - GitHub installation ID
 * @returns Octokit instance sa installation token-om i rest property-jem
 */
export async function getInstallationOctokit(installationId: number): Promise<InstanceType<typeof OctokitWithPlugins>> {
  try {
    // Prvo pokušaj da koristimo App.getInstallationOctokit
    const appOctokit = await githubApp.getInstallationOctokit(installationId);
    
    // Proveri da li ima rest property
    if (appOctokit && typeof (appOctokit as any).rest !== 'undefined') {
      logger.debug('✅ App Octokit has rest property', { installationId });
      return appOctokit as InstanceType<typeof OctokitWithPlugins>;
    }
    
    // Ako nema rest property, kreiramo novi Octokit sa plugin-ima i installation token-om
    logger.warn('⚠️ App Octokit does not have rest property, creating new Octokit with plugins', { installationId });
    const token = await getInstallationToken(installationId);
    
    const octokit = new OctokitWithPlugins({
      auth: token,
    });
    
    logger.debug('✅ Created new Octokit with rest property', { installationId });
    return octokit;
  } catch (error) {
    logger.error('❌ Failed to get installation octokit:', {
      installationId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    throw error;
  }
}

/**
 * Proverava da li je App instaliran na datoj instalaciji
 * 
 * @param installationId - GitHub installation ID
 * @returns true ako je instaliran, false ako nije
 */
export async function isAppInstalled(installationId: number): Promise<boolean> {
  try {
    await githubApp.getInstallationOctokit(installationId);
    return true;
  } catch (error) {
    logger.warn('App not installed or access denied:', { installationId, error });
    return false;
  }
}
