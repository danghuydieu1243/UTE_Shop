import * as repo from './catalog.repository';
import { AppError } from '../../shared/errors/AppError';
import { ListBooksQuery } from './catalog.schema';

// ── Home ─────────────────────────────────────────────────────────────────────
export async function getHome() {
  const [newReleases, bestsellers, featured, categories] = await Promise.all([
    repo.getNewReleases(10),
    repo.getBestsellers(10),
    repo.getFeatured(10),
    repo.getCategoriesWithCount(),
  ]);

  return {
    newReleases: newReleases.map(repo.toBookCard),
    bestsellers: bestsellers.map(repo.toBookCard),
    featured: featured.map(repo.toBookCard),
    categories,
  };
}

// ── List/Filter ──────────────────────────────────────────────────────────────
export async function listBooks(q: ListBooksQuery) {
  const { rows, count } = await repo.listBooks(q);
  const totalPages = Math.ceil(count / q.limit);

  return {
    data: { books: rows.map(repo.toBookCard) },
    meta: {
      pagination: {
        page: q.page,
        limit: q.limit,
        total: count,
        totalPages,
      },
    },
  };
}

// ── Detail ───────────────────────────────────────────────────────────────────
export async function getBookDetail(idOrSlug: string) {
  const book = await repo.findBookByIdOrSlug(idOrSlug);
  if (!book) throw AppError.from('BOOK_NOT_FOUND', 'Không tìm thấy sách');

  // Increment view_count best-effort (don't block response)
  repo.incrementViewCount(book.id).catch(() => {
    // Best-effort: ignore errors
  });

  const [relatedByAuthor, relatedByCategory] = await Promise.all([
    repo.getRelatedByAuthor(book, 10),
    repo.getRelatedByCategory(book, 10),
  ]);

  const author = (book as any).author as any;
  const publisher = (book as any).publisher as any;
  const category = (book as any).category as any;
  const images = (book as any).images as any[];
  const file = (book as any).file as any;
  const vendorUser = (book as any).vendor as any;
  const vendorProfile = vendorUser?.vendor as any;

  return {
    id: book.id,
    slug: book.slug ?? null,
    title: book.title,
    author: author ? { id: author.id, name: author.name, slug: author.slug } : null,
    publisher: publisher ? { id: publisher.id, name: publisher.name } : null,
    category: category ? { id: category.id, name: category.name, slug: category.slug } : null,
    description: book.description ?? null,
    tableOfContents: book.tableOfContents
      ? book.tableOfContents.split('\n').filter((s) => s.trim() !== '')
      : [],
    price: Number(book.price),
    originalPrice: book.originalPrice != null ? Number(book.originalPrice) : null,
    discountPercent:
      book.originalPrice != null && Number(book.originalPrice) > Number(book.price)
        ? Math.round((1 - Number(book.price) / Number(book.originalPrice)) * 100)
        : null,
    fileFormat: book.fileFormat,
    fileSizeBytes: file?.fileSizeBytes ?? book.fileSizeBytes ?? null,
    coverImageUrl: book.coverImageUrl ?? null,
    images: (images ?? []).map((img: any) => ({
      url: img.url,
      alt: img.alt ?? null,
      sortOrder: img.sortOrder ?? 0,
    })),
    ratingAvg: book.ratingAvg ? Number(book.ratingAvg) : 0,
    ratingCount: book.ratingCount ?? 0,
    purchaseCount: book.purchaseCount ?? 0,
    publishedAt: book.publishedAt ?? null,
    vendor: vendorProfile
      ? { shopName: vendorProfile.shopName, shopSlug: vendorProfile.shopSlug }
      : null,
    relatedByAuthor: relatedByAuthor.map(repo.toBookCard),
    relatedByCategory: relatedByCategory.map(repo.toBookCard),
  };
}

// ── Categories ───────────────────────────────────────────────────────────────
// Single source: getCategoriesWithCount() already selects parentId + sortOrder.
export async function getCategories() {
  const cats = await repo.getCategoriesWithCount();

  return cats.map((c: any) => ({
    id: c.id,
    slug: c.slug ?? null,
    name: c.name,
    parentId: c.parentId ?? null,
    sortOrder: c.sortOrder ?? 0,
    bookCount: c.bookCount,
  }));
}

// ── Filters ──────────────────────────────────────────────────────────────────
export async function getFilters() {
  return repo.getFilterOptions();
}
