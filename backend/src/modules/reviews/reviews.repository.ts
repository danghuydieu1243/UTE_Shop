import { fn, col } from 'sequelize';
import {
  Review,
  User,
  Book,
  Order,
  OrderItem,
} from '../../db/models';
import { ReviewDTO, PaginationMeta } from './reviews.schema';

// ── idOrSlug → bookId ─────────────────────────────────────────────────────────

export async function findBookIdByIdOrSlug(idOrSlug: string): Promise<number | null> {
  const where = /^\d+$/.test(idOrSlug)
    ? { id: Number(idOrSlug) }
    : { slug: idOrSlug };

  const book = await Book.findOne({ where, attributes: ['id'] });
  return book ? Number(book.id) : null;
}

// ── Check if user has a COMPLETED order containing bookId ─────────────────────

export async function findCompletedOrderContainingBook(
  userId: number,
  bookId: number,
): Promise<Order | null> {
  return Order.findOne({
    where: { userId, status: 'COMPLETED' },
    include: [
      {
        model: OrderItem,
        as: 'items',
        where: { bookId },
        required: true,
      },
    ],
  });
}

// ── Map Review row → DTO ─────────────────────────────────────────────────────

export function mapReviewDTO(row: Review): ReviewDTO {
  const user = (row as any).user as any;
  return {
    id: Number(row.id),
    rating: row.rating,
    comment: row.comment ?? null,
    userName: user?.fullName ?? '',
    createdAt: row.created_at ?? null,
    vendorReply: row.vendorReply ?? null,
    vendorRepliedAt: row.vendorRepliedAt ?? null,
  };
}

// ── List reviews by bookId (paginated) ───────────────────────────────────────

export async function listReviewsByBookId(
  bookId: number,
  page: number,
  limit: number,
): Promise<{ rows: Review[]; count: number }> {
  const offset = (page - 1) * limit;

  const { rows, count } = await Review.findAndCountAll({
    where: { bookId },
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'fullName'],
      },
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  return { rows, count };
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

// ── Recompute book rating_avg and rating_count ────────────────────────────────
// Uses JS aggregate (works on both SQLite and MySQL)

export async function recomputeBookRating(
  bookId: number,
  transaction?: import('sequelize').Transaction,
): Promise<void> {
  const reviews = await Review.findAll({
    where: { bookId },
    attributes: ['rating'],
    transaction,
  });

  const count = reviews.length;
  const avg =
    count > 0
      ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 100) / 100
      : 0;

  await Book.update(
    { ratingAvg: avg, ratingCount: count },
    { where: { id: bookId }, transaction },
  );
}

// ── Find review by id (with book including vendorUserId) ─────────────────────

export async function findReviewById(id: number): Promise<Review | null> {
  return Review.findOne({
    where: { id },
    include: [
      {
        model: Book,
        as: 'book',
        attributes: ['id', 'vendorUserId'],
      },
    ],
  });
}
