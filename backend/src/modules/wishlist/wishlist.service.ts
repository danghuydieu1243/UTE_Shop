import { Book } from '../../db/models';
import { AppError } from '../../shared/errors/AppError';
import * as repo from './wishlist.repository';
import { WishlistItemDTO, PaginationMeta } from './wishlist.schema';

// ── addItem ───────────────────────────────────────────────────────────────────

export async function addItem(userId: number, bookId: number): Promise<WishlistItemDTO> {
  // Kiểm sách tồn tại
  const book = await Book.findByPk(bookId);
  if (!book) throw AppError.from('BOOK_NOT_FOUND', 'Không tìm thấy sách');

  // Kiểm sách phải published
  if (book.status !== 'published') {
    throw AppError.from('BOOK_NOT_PUBLISHED', 'Sách chưa được xuất bản');
  }

  // Idempotent: findOrCreate — trả về WishlistItemDTO đầy đủ từ repository
  const { item } = await repo.findOrCreateItem(userId, bookId);
  return item;
}

// ── removeItem (idempotent) ───────────────────────────────────────────────────

export async function removeItem(userId: number, bookId: number): Promise<void> {
  await repo.removeItem(userId, bookId);
}

// ── clearAll (idempotent) ─────────────────────────────────────────────────────

export async function clearAll(userId: number): Promise<void> {
  await repo.clearAll(userId);
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
