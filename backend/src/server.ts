import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { sequelize } from './shared/db/sequelize';
import { connectRedis } from './shared/db/redis';
import { initIO } from './shared/realtime/io';
import { logger } from './shared/logger';

const start = async (): Promise<void> => {
  try {
    await sequelize.authenticate();
    logger.info('Database connected');
  } catch (e) {
    logger.error({ err: e }, 'Database connection failed');
  }
  await connectRedis();
  const app = createApp();
  const httpServer = http.createServer(app);
  initIO(httpServer);
  httpServer.listen(env.PORT, () => logger.info(`Server running on port ${env.PORT}`));
};

void start();
