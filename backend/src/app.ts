import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { httpLogger } from './shared/logger';
import { authRouter } from './modules/auth';
import { usersRouter } from './modules/users';
import { notFound } from './shared/middleware/notFound';
import { errorHandler } from './shared/middleware/errorHandler';

export const createApp = () => {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(httpLogger);

  app.get('/health', (_req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', usersRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
};
