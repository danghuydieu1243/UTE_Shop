import { Book } from '../../db/models';
import { AppError } from '../../shared/errors/AppError';
import * as repo from './wishlist.repository';
import { WishlistItemDTO, WishlistBookDTO, PaginationMeta } from './wishlist.schema';

// ── addItem ───────────────────────────────────────────────────────────────────

export interface AddItemResult {
  bookId: number;
  addedAt: Date;
  book: WishlistBookDTO;
}

export async function addItem(userId: number, bookId: number): Promise<AddItemResult> {
  // Kiểm sách tồn tại
  const book = await Book.findByPk(bookId);
  if (!book) throw AppError.from('BOOK_NOT_FOUND', 'Không tìm thấy sách');

  // Kiểm sách phải published
  if (book.status !== 'published') {
    throw AppError.from('BOOK_NOT_PUBLISHED', 'Sách chưa được xuất bản');
  }

  // Idempotent: findOrCreate
  const { item } = await repo.findOrCreateItem(userId, bookId);

  return {
    bookId: Number(item.bookId),
    addedAt: item.created_at,
    book: {
      id: Number(book.id),
      slug: book.slug ?? null,
      title: book.title ?? '',
      coverImageUrl: (book as any).coverImageUrl ?? null,
      price: Number(book.price ?? 0),
      ratingAvg: (book as any).ratingAvg != null ? Number((book as any).ratingAvg) : null,
    },
  };
}

// ── removeItem (idempotent) ───────────────────────────────────────────────────

export async function removeItem(userId: number, bookId: number): Promise<void> {
  await repo.removeItem(userId, bookId);
}

// ── list ──────────────────────────────────────────────────────────────────────

export interface WishlistListResult {
  items: WishlistItemDTO[];
  pagination: PaginationMeta;
}

export async function list(
  userId: number,
  page: number,
  limit: number,
): Promise<WishlistListResult> {
  return repo.listItems(userId, page, limit);
}
