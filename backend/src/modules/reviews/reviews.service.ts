import { UniqueConstraintError } from 'sequelize';
import {
  sequelize,
  Review,
  LoyaltyAccount,
  LoyaltyTransaction,
  User,
} from '../../db/models';
import { AppError } from '../../shared/errors/AppError';
import * as repo from './reviews.repository';
import { CreateReviewBody, UpdateReviewBody, ReviewDTO, PaginationMeta } from './reviews.schema';

const REVIEW_EARN_POINTS = 50;

// ── createReview ─────────────────────────────────────────────────────────────

export async function createReview(
  userId: number,
  body: CreateReviewBody,
): Promise<ReviewDTO> {
  const { bookId, rating, comment } = body;

  // Gate: must have a COMPLETED order containing this book
  const completedOrder = await repo.findCompletedOrderContainingBook(userId, bookId);
  if (!completedOrder) {
    throw AppError.from('REVIEW_NOT_ALLOWED', 'Bạn cần mua và hoàn thành đơn hàng chứa sách này trước khi đánh giá');
  }

  const { review, userName } = await sequelize.transaction(async (t) => {
    // 0. Fetch requesting user's name for the response DTO
    const userRecord = await User.findByPk(userId, { attributes: ['fullName'], transaction: t });

    // 1. Create review — UNIQUE(user_id, book_id) guard via catch
    let newReview: Review;
    try {
      newReview = await Review.create(
        {
          userId,
          bookId,
          orderId: Number(completedOrder.id),
          rating,
          comment: comment ?? null,
        },
        { transaction: t },
      );
    } catch (err) {
      if (err instanceof UniqueConstraintError) {
        throw AppError.from('REVIEW_DUPLICATE', 'Bạn đã đánh giá sách này rồi');
      }
      throw err;
    }

    // 2. Recompute book rating_avg + rating_count (D13)
    await repo.recomputeBookRating(bookId, t);

    // 3. Earn +50 loyalty points (D12) — findOrCreate account, increment, log tx
    const [account] = await LoyaltyAccount.findOrCreate({
      where: { userId },
      defaults: { userId, balancePoints: 0 },
      transaction: t,
    });

    await account.increment('balancePoints', { by: REVIEW_EARN_POINTS, transaction: t });

    await LoyaltyTransaction.create(
      {
        userId,
        type: 'earn',
        points: REVIEW_EARN_POINTS,
        reviewId: Number(newReview.id),
        note: `Đánh giá sách #${bookId}`,
      },
      { transaction: t },
    );

    return { review: newReview, userName: userRecord?.fullName ?? '' };
  });

  return {
    id: Number(review.id),
    userId,
    rating: review.rating,
    comment: review.comment ?? null,
    userName,
    createdAt: review.created_at ?? null,
    vendorReply: null,
    vendorRepliedAt: null,
  };
}

// ── getMyReview ───────────────────────────────────────────────────────────────
// Trả về đánh giá của chính user cho 1 sách (hoặc null nếu chưa đánh giá)

export async function getMyReview(
  userId: number,
  bookId: number,
): Promise<ReviewDTO | null> {
  const review = await repo.findUserReviewForBook(userId, bookId);
  return review ? repo.mapReviewDTO(review) : null;
}

// ── updateReview ──────────────────────────────────────────────────────────────
// Sửa đánh giá đã có của chính user (không cộng điểm loyalty lại)

export async function updateReview(
  userId: number,
  bookId: number,
  body: UpdateReviewBody,
): Promise<ReviewDTO> {
  const review = await repo.findUserReviewForBook(userId, bookId);
  if (!review) {
    throw AppError.from('REVIEW_NOT_ALLOWED', 'Bạn chưa đánh giá sách này');
  }

  await sequelize.transaction(async (t) => {
    await review.update(
      { rating: body.rating, comment: body.comment ?? null },
      { transaction: t },
    );
    await repo.recomputeBookRating(bookId, t);
  });

  return repo.mapReviewDTO(review);
}

// ── listByBook ────────────────────────────────────────────────────────────────

export async function listByBook(
  idOrSlug: string,
  page: number,
  limit: number,
): Promise<{ data: ReviewDTO[]; pagination: PaginationMeta }> {
  const bookId = await repo.findBookIdByIdOrSlug(idOrSlug);
  if (bookId === null) {
    throw AppError.from('BOOK_NOT_FOUND', 'Không tìm thấy sách');
  }

  const { rows, count } = await repo.listReviewsByBookId(bookId, page, limit);

  return {
    data: rows.map(repo.mapReviewDTO),
    pagination: repo.buildPaginationMeta(page, limit, count),
  };
}

// ── vendorReply ───────────────────────────────────────────────────────────────

export async function vendorReply(
  vendorUserId: number,
  reviewId: number,
  reply: string,
): Promise<ReviewDTO> {
  const review = await repo.findReviewById(reviewId);
  if (!review) {
    throw AppError.from('NOT_FOUND', 'Không tìm thấy đánh giá');
  }

  const book = (review as any).book as any;
  if (!book || Number(book.vendorUserId) !== vendorUserId) {
    throw AppError.from('FORBIDDEN', 'Bạn không có quyền trả lời đánh giá này');
  }

  await review.update({ vendorReply: reply, vendorRepliedAt: new Date() });

  return {
    id: Number(review.id),
    userId: Number(review.userId),
    rating: review.rating,
    comment: review.comment ?? null,
    userName: '',
    createdAt: review.created_at ?? null,
    vendorReply: review.vendorReply ?? null,
    vendorRepliedAt: review.vendorRepliedAt ?? null,
  };
}
