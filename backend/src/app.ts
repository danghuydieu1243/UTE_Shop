import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { httpLogger } from './shared/logger';
import { authRouter } from './modules/auth';
import { usersRouter } from './modules/users';
import { catalogRouter } from './modules/catalog';
import { vendorBooksRouter } from './modules/vendor-books';
import { notFound } from './shared/middleware/notFound';
import { errorHandler } from './shared/middleware/errorHandler';
import { env } from './config/env';

export const createApp = () => {
  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(httpLogger);

  // Serve cover images publicly; private e-book files are NOT served
  const coversDir = path.resolve(env.UPLOAD_DIR, 'covers');
  app.use('/uploads/covers', express.static(coversDir));

  app.get('/health', (_req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });

  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/users', usersRouter);
  app.use('/api/v1/catalog', catalogRouter);
  app.use('/api/v1/vendor/books', vendorBooksRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
};
