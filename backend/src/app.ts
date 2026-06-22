import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { httpLogger } from './shared/logger';
import { authRouter } from './modules/auth';
import { usersRouter } from './modules/users';
import { catalogRouter } from './modules/catalog';
import { vendorBooksRouter } from './modules/vendor-books';
import { cartRouter } from './modules/cart';
import { ordersRouter } from './modules/orders';
import { paymentsRouter } from './modules/payments';
import { entitlementsRouter, downloadRouter } from './modules/entitlements';
import { wishlistRouter } from './modules/wishlist';
import { meReviewsRouter, bookReviewsRouter, vendorReviewsRouter } from './modules/reviews';
import { vendorCouponsRouter, meCouponsRouter } from './modules/coupons';
import { loyaltyRouter } from './modules/loyalty';
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
  app.use('/api/v1/cart', cartRouter);
  app.use('/api/v1/orders', ordersRouter);
  app.use('/api/v1/payments', paymentsRouter);
  app.use('/api/v1/me/ebooks', entitlementsRouter);
  app.use('/api/v1/me/wishlist', wishlistRouter);
  app.use('/api/v1/me/reviews', meReviewsRouter);
  app.use('/api/v1/books/:idOrSlug/reviews', bookReviewsRouter);
  app.use('/api/v1/vendor/reviews', vendorReviewsRouter);
  app.use('/api/v1/vendor/coupons', vendorCouponsRouter);
  app.use('/api/v1/me/coupons', meCouponsRouter);
  app.use('/api/v1/download', downloadRouter);
  app.use('/api/v1/me/loyalty', loyaltyRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
};
