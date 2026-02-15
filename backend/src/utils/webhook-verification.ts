/**
 * Webhook Verification Utility
 * 
 * Verifikuje GitHub webhook signature za bezbednost
 */

import crypto from 'crypto';
import env from '../config/env';
import { logger } from './logger';

/**
 * Verifikuje GitHub webhook signature
 * 
 * GitHub koristi HMAC SHA-256 algoritam za potpisivanje webhook payload-a
 * Format: sha256=<hex-encoded-hmac-sha256-hash>
 * 
 * @param payload - Raw request body (string ili Buffer)
 * @param signature - X-Hub-Signature-256 header value
 * @returns true ako je signature validan, false ako nije
 */
export function verifyGitHubWebhookSignature(
  payload: string | Buffer,
  signature: string | undefined
): boolean {
  // U development modu, preskoči verifikaciju ako nema signature
  if (env.NODE_ENV === 'development' && !signature) {
    logger.warn('⚠️ Skipping webhook signature verification in development mode');
    return true; // Dozvoli u development-u
  }

  // U production modu, signature je obavezan
  if (!signature) {
    logger.error('❌ Missing webhook signature in production mode');
    return false;
  }

  // Proveri format signature-a (treba da počinje sa "sha256=")
  if (!signature.startsWith('sha256=')) {
    logger.error('❌ Invalid webhook signature format', {
      signaturePrefix: signature.substring(0, 10),
    });
    return false;
  }

  try {
    // Ekstraktuj hash iz signature-a (ukloni "sha256=" prefix)
    const receivedHash = signature.substring(7);

    // Generiši očekivani hash koristeći webhook secret
    const expectedHash = crypto
      .createHmac('sha256', env.GITHUB_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');

    // Uporedi hash-eve koristeći timing-safe comparison (sprečava timing attacks)
    const isValid = crypto.timingSafeEqual(
      Buffer.from(receivedHash, 'hex'),
      Buffer.from(expectedHash, 'hex')
    );

    if (!isValid) {
      logger.error('❌ Webhook signature verification failed', {
        receivedHashPrefix: receivedHash.substring(0, 10),
        expectedHashPrefix: expectedHash.substring(0, 10),
      });
    } else {
      logger.debug('✅ Webhook signature verified successfully');
    }

    return isValid;
  } catch (error) {
    logger.error('❌ Error during webhook signature verification:', error);
    return false;
  }
}
