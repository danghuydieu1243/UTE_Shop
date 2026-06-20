import Redis from 'ioredis';
import { env } from '../../config/env';
import { logger } from '../logger';

// P1: Redis optional (chỉ scaffold). retryStrategy null → không retry vô hạn khi Redis chưa chạy.
export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: 1,
  retryStrategy: () => null,
});

// Bắt 'error' để tránh "Unhandled error event" làm spam log khi Redis chưa chạy.
redis.on('error', () => {
  /* nuốt lỗi kết nối — Redis optional ở P1; trạng thái đã log ở connectRedis */
});

export const connectRedis = async (): Promise<void> => {
  if (env.NODE_ENV === 'test') return;
  try {
    await redis.connect();
    logger.info('Redis connected');
  } catch {
    logger.warn('Redis không kết nối được (P1 optional) — bỏ qua, dùng MySQL/in-memory');
    redis.disconnect();
  }
};
