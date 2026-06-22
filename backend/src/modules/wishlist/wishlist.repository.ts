import { Wishlist, Book } from '../../db/models';
import { WishlistItemDTO, WishlistBookDTO, PaginationMeta } from './wishlist.schema';

// ── Book include ──────────────────────────────────────────────────────────────

const bookAttributes = ['id', 'slug', 'title', 'coverImageUrl', 'price', 'ratingAvg'];

const wishlistBookInclude = [
  {
    model: Book,
    as: 'book',
    attributes: bookAttributes,
  },
];

// ── Map helpers ───────────────────────────────────────────────────────────────

function mapBookDTO(book: any): WishlistBookDTO {
  return {
    id: Number(book.id),
    slug: book.slug ?? null,
    title: book.title ?? '',
    coverImageUrl: book.coverImageUrl ?? null,
    price: Number(book.price ?? 0),
    ratingAvg: book.ratingAvg != null ? Number(book.ratingAvg) : null,
  };
}

function mapItemDTO(row: Wishlist): WishlistItemDTO {
  const book = (row as any).book as any;
  return {
    wishlistId: Number(row.id),
    bookId: Number(row.bookId),
    addedAt: row.created_at,
    book: mapBookDTO(book),
  };
}

// ── findItem ─────────────────────────────────────────────────────────────────

export async function findItem(userId: number, bookId: number): Promise<Wishlist | null> {
  return Wishlist.findOne({ where: { userId, bookId } });
}

// ── addItem (findOrCreate) ────────────────────────────────────────────────────

export async function findOrCreateItem(
  userId: number,
  bookId: number,
): Promise<{ item: Wishlist; created: boolean }> {
  const [item, created] = await Wishlist.findOrCreate({
    where: { userId, bookId },
    defaults: { userId, bookId },
  });
  return { item, created };
}

// ── removeItem (idempotent) ───────────────────────────────────────────────────

export async function removeItem(userId: number, bookId: number): Promise<void> {
  await Wishlist.destroy({ where: { userId, bookId } });
}

// ── list with pagination ─────────────────────────────────────────────────────

export interface WishlistPage {
  items: WishlistItemDTO[];
  pagination: PaginationMeta;
}

export async function listItems(
  userId: number,
  page: number,
  limit: number,
): Promise<WishlistPage> {
  const offset = (page - 1) * limit;

  const { rows, count } = await Wishlist.findAndCountAll({
    where: { userId },
    include: wishlistBookInclude,
    order: [['created_at', 'DESC']],
    limit,
    offset,
  });

  const totalPages = Math.ceil(count / limit);

  return {
    items: rows.map(mapItemDTO),
    pagination: {
      page,
      limit,
      total: count,
      totalPages,
    },
  };
}
