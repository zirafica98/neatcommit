/**
 * Sentry Configuration
 * 
 * Error monitoring i tracking
 */

import * as Sentry from '@sentry/node';
import env from './env';
import { logger } from '../utils/logger';

/**
 * Initialize Sentry (samo u production modu)
 */
export function initSentry(): void {
  // Sentry DSN je opciona - ako nije postavljena, preskoči inicijalizaciju
  const sentryDsn = process.env.SENTRY_DSN;

  if (!sentryDsn) {
    logger.info('Sentry DSN not configured, skipping Sentry initialization');
    return;
  }

  if (env.NODE_ENV === 'production') {
    Sentry.init({
      dsn: sentryDsn,
      environment: env.NODE_ENV,
      tracesSampleRate: 0.1, // 10% of transactions za performance monitoring
      // Ignoriši određene greške
      ignoreErrors: [
        // Network errors koje ne možemo da kontrolišemo
        'ECONNRESET',
        'ENOTFOUND',
        'ETIMEDOUT',
        // GitHub API rate limit (ne treba da logujemo kao error)
        'rate limit',
      ],
      beforeSend(event) {
        // Loguj lokalno pre slanja u Sentry
        if (event.level === 'error' || event.level === 'fatal') {
          logger.error('Sentry error captured', {
            message: event.message,
            level: event.level,
            tags: event.tags,
          });
        }
        return event;
      },
    });

    logger.info('✅ Sentry initialized for error monitoring');
  } else {
    logger.info('Sentry skipped (not in production mode)');
  }
}
