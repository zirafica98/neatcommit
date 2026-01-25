import Redis from 'ioredis';
import env from './env';
import { logger } from '../utils/logger';

const redisConfig = {
  host: env.REDIS_HOST,
  port: parseInt(env.REDIS_PORT, 10),
  password: env.REDIS_PASSWORD || undefined,
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
};

export const redis = new Redis(redisConfig);

redis.on('connect', () => {
  logger.info('✅ Redis connected successfully');
});

redis.on('ready', () => {
  logger.info('Redis ready');
});

redis.on('error', (error) => {
  logger.error('Redis error:', error);
});

redis.on('close', () => {
  logger.warn('Redis connection closed');
});

redis.on('reconnecting', () => {
  logger.info('Redis reconnecting...');
});

// Test connection
export async function testRedisConnection(): Promise<boolean> {
  try {
    await redis.ping();
    logger.info('Redis ping successful');
    return true;
  } catch (error) {
    logger.error('Redis ping failed:', error);
    return false;
  }
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await redis.quit();
  logger.info('Redis connection closed');
});

export default redis;
