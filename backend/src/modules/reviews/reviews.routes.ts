import { Router } from 'express';
import { auth } from '../../shared/middleware/auth';
import { requireRole } from '../../shared/middleware/rbac';
import * as c from './reviews.controller';

// ── /api/v1/me/reviews ────────────────────────────────────────────────────────
export const meReviewsRouter = Router();

meReviewsRouter.post('/', auth, requireRole('user'), c.createReview);

// ── /api/v1/books/:idOrSlug/reviews ──────────────────────────────────────────
export const bookReviewsRouter = Router({ mergeParams: true });

bookReviewsRouter.get('/', c.listByBook);

// ── /api/v1/vendor/reviews ────────────────────────────────────────────────────
export const vendorReviewsRouter = Router();

vendorReviewsRouter.post('/:id/reply', auth, requireRole('vendor'), c.vendorReply);
