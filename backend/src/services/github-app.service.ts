import { App } from '@octokit/app';
import { Octokit } from '@octokit/core';
import { restEndpointMethods } from '@octokit/plugin-rest-endpoint-methods';
import { paginateRest } from '@octokit/plugin-paginate-rest';
import { createAppAuth } from '@octokit/auth-app';
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

/**
 * Formatira private key za korišćenje
 * GitHub private key može biti u različitim formatima:
 * - Sa \n escape sekvencama: "-----BEGIN RSA PRIVATE KEY-----\nMIIE..."
 * - Sa stvarnim novim redovima (multi-line string)
 * - Sa \\n (double escaped)
 */
function formatPrivateKey(key: string): string {
  if (!key || key.trim().length === 0) {
    throw new Error('GITHUB_PRIVATE_KEY is empty or undefined');
  }
  
  // Ako već ima prave nove redove, vrati kao jeste
  if (key.includes('\n') && !key.includes('\\n')) {
    logger.debug('✅ Private key already has newlines');
    return key;
  }
  
  // Zameni \\n sa \n (double escaped -> single escaped)
  let formatted = key.replace(/\\n/g, '\n');
  
  // Proveri format
  if (!formatted.includes('-----BEGIN')) {
    logger.error('❌ Private key format is incorrect - missing BEGIN marker');
    logger.error('Private key should start with: -----BEGIN RSA PRIVATE KEY-----');
    throw new Error('Invalid private key format: missing BEGIN marker');
  }
  
  if (!formatted.includes('-----END')) {
    logger.error('❌ Private key format is incorrect - missing END marker');
    logger.error('Private key should end with: -----END RSA PRIVATE KEY-----');
    throw new Error('Invalid private key format: missing END marker');
  }
  
  logger.debug('✅ Private key formatted successfully');
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
    oauth: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
    },
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
 * Dobija installation access token za dati installation ID
 */
async function getInstallationToken(installationId: number): Promise<string> {
  try {
    // Koristimo @octokit/auth-app za dobijanje installation token-a
    const auth = createAppAuth({
      appId: env.GITHUB_APP_ID,
      privateKey: formatPrivateKey(env.GITHUB_PRIVATE_KEY),
    });
    
    const { token } = await auth({
      type: 'installation',
      installationId: installationId,
    });
    
    logger.debug('✅ Installation token obtained', { installationId });
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
