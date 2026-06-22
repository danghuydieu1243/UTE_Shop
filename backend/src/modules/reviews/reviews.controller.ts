import { asyncHandler } from '../../shared/http/asyncHandler';
import { ok, created } from '../../shared/http/response';
import { AppError } from '../../shared/errors/AppError';
import {
  createReviewBodySchema,
  replyBodySchema,
} from './reviews.schema';
import * as reviewsService from './reviews.service';

// ── POST /api/v1/me/reviews ──────────────────────────────────────────────────

export const createReview = asyncHandler(async (req, res) => {
  const result = createReviewBodySchema.safeParse(req.body);
  if (!result.success) {
    throw AppError.from('VALIDATION', 'Dữ liệu không hợp lệ', result.error.issues);
  }
  const userId = req.user!.id;
  const review = await reviewsService.createReview(userId, result.data);
  created(res, review);
});

// ── GET /api/v1/books/:idOrSlug/reviews ─────────────────────────────────────

export const listByBook = asyncHandler(async (req, res) => {
  const { idOrSlug } = req.params;
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20));

  const { data, pagination } = await reviewsService.listByBook(idOrSlug, page, limit);
  ok(res, data, { pagination });
});

// ── POST /api/v1/vendor/reviews/:id/reply ────────────────────────────────────

export const vendorReply = asyncHandler(async (req, res) => {
  const result = replyBodySchema.safeParse(req.body);
  if (!result.success) {
    throw AppError.from('VALIDATION', 'Dữ liệu không hợp lệ', result.error.issues);
  }

  const reviewId = parseInt(req.params.id, 10);
  if (!reviewId || isNaN(reviewId)) {
    throw AppError.from('VALIDATION', 'reviewId không hợp lệ');
  }

  const vendorUserId = req.user!.id;
  const review = await reviewsService.vendorReply(vendorUserId, reviewId, result.data.reply);
  ok(res, review);
});
