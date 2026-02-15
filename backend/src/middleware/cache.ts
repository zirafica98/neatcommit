/**
 * Redis Caching Middleware
 * 
 * Caches API responses in Redis for performance
 */

import { Request, Response, NextFunction } from 'express';
import { getRedisClient } from '../config/redis';
import { logger } from '../utils/logger';
import crypto from 'crypto';

const CACHE_TTL = 300; // 5 minutes default
const CACHEABLE_METHODS = ['GET'];

/**
 * Generate cache key from request
 */
function generateCacheKey(req: Request): string {
  const key = `${req.method}:${req.originalUrl}:${JSON.stringify(req.query)}`;
  return crypto.createHash('md5').update(key).digest('hex');
}

/**
 * Cache middleware
 */
export function cacheMiddleware(ttl: number = CACHE_TTL) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (!CACHEABLE_METHODS.includes(req.method)) {
      return next();
    }

    // Skip cache for authenticated requests (they might have user-specific data)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return next();
    }

    try {
      const redis = getRedisClient();
      const cacheKey = `cache:${generateCacheKey(req)}`;

      // Try to get from cache
      const cached = await redis.get(cacheKey);
      if (cached) {
        logger.debug('Cache hit', { key: cacheKey });
        const data = JSON.parse(cached);
        return res.json(data);
      }

      // Cache miss - override res.json to cache response
      const originalJson = res.json.bind(res);
      res.json = function (body: any) {
        // Cache the response
        redis.setex(cacheKey, ttl, JSON.stringify(body)).catch((error) => {
          logger.error('Failed to cache response', { error, key: cacheKey });
        });
        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error('Cache middleware error', { error });
      // Continue without caching if Redis fails
      next();
    }
  };
}

/**
 * Clear cache for a specific pattern
 */
export async function clearCache(pattern: string): Promise<void> {
  try {
    const redis = getRedisClient();
    const keys = await redis.keys(`cache:${pattern}*`);
    if (keys.length > 0) {
      await redis.del(...keys);
      logger.info('Cache cleared', { pattern, keysCleared: keys.length });
    }
  } catch (error) {
    logger.error('Failed to clear cache', { error, pattern });
  }
}
