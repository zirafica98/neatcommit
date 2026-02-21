/**
 * Doc Cache Service
 *
 * Čuva generisanu .docx dokumentaciju u Redis-u kratkotrajno (npr. 15 min).
 * Jednom preuzeta ili posle TTL-a fajl više nije dostupan – korisnik mora ponovo da generiše.
 */

import { redis } from '../config/redis';
import { logger } from '../utils/logger';

const KEY_PREFIX = 'doc:';
const TTL_SECONDS = 15 * 60; // 15 minuta

export async function setDocBuffer(documentationId: string, buffer: Buffer): Promise<void> {
  const key = KEY_PREFIX + documentationId;
  await redis.setex(key, TTL_SECONDS, buffer);
  logger.debug('Documentation buffer cached for download', {
    documentationId,
    size: buffer.length,
    ttlSeconds: TTL_SECONDS,
  });
}

/**
 * Vraća buffer i briše ga iz cache-a (jednokratno preuzimanje).
 * Ako nema u cache-u (isteklo ili već preuzeto), vraća null.
 */
export async function getAndDeleteDocBuffer(documentationId: string): Promise<Buffer | null> {
  const key = KEY_PREFIX + documentationId;
  const value = await redis.getBuffer(key);
  if (value == null) return null;
  await redis.del(key);
  return value;
}
