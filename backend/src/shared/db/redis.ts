import Redis from 'ioredis';
import { env } from '../../config/env';

export const redis = new Redis(env.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });

export const connectRedis = async (): Promise<void> => {
  if (env.NODE_ENV === 'test') return;
  try {
    await redis.connect();
  } catch {
    // P1: Redis optional — chỉ scaffold; không fail app nếu Redis chưa chạy
  }
};
