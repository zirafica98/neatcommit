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
  // TAKOĐE: Privremeno preskoči verifikaciju u development-u dok debugiramo
  if (env.NODE_ENV === 'development') {
    if (!signature) {
      logger.warn('⚠️ Skipping webhook signature verification in development mode (no signature)');
      return true;
    }
    // Privremeno: preskoči verifikaciju u development-u za debugging
    // TODO: Ukloni ovo kada rešimo problem sa signature verification
    logger.warn('⚠️ TEMPORARY: Skipping webhook signature verification in development mode for debugging');
    return true;
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
    // VAŽNO: payload mora biti Buffer ili string, bez ikakvih modifikacija
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
        receivedHashFull: receivedHash,
        expectedHashFull: expectedHash,
        payloadType: Buffer.isBuffer(payload) ? 'Buffer' : typeof payload,
        payloadLength: Buffer.isBuffer(payload) ? payload.length : (typeof payload === 'string' ? payload.length : 0),
        secretLength: env.GITHUB_WEBHOOK_SECRET ? env.GITHUB_WEBHOOK_SECRET.length : 0,
        secretPrefix: env.GITHUB_WEBHOOK_SECRET ? env.GITHUB_WEBHOOK_SECRET.substring(0, 10) : 'missing',
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
