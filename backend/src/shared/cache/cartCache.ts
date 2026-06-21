import { redis } from '../db/redis';
import { logger } from '../logger';

const TTL_SECONDS = 60 * 15; // 15 phút

function key(userId: number): string {
  return `cart:${userId}`;
}

function isReady(): boolean {
  return redis.status === 'ready';
}

export async function getCart(userId: number): Promise<unknown | null> {
  if (!isReady()) return null;
  try {
    const raw = await redis.get(key(userId));
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    logger.debug({ err }, 'cartCache.getCart error — bỏ qua');
    return null;
  }
}

export async function setCart(userId: number, data: unknown): Promise<void> {
  if (!isReady()) return;
  try {
    await redis.set(key(userId), JSON.stringify(data), 'EX', TTL_SECONDS);
  } catch (err) {
    logger.debug({ err }, 'cartCache.setCart error — bỏ qua');
  }
}

export async function delCart(userId: number): Promise<void> {
  if (!isReady()) return;
  try {
    await redis.del(key(userId));
  } catch (err) {
    logger.debug({ err }, 'cartCache.delCart error — bỏ qua');
  }
}
