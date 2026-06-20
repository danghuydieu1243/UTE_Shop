import { createApp } from './app';
import { env } from './config/env';
import { sequelize } from './shared/db/sequelize';
import { connectRedis } from './shared/db/redis';
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
  app.listen(env.PORT, () => logger.info(`Server running on port ${env.PORT}`));
};

void start();
