import path from 'path';
import { Category } from '../../db/models';
import { AppError } from '../../shared/errors/AppError';
import { mimeToFormat } from '../../shared/upload';
import * as repo from './vendor-books.repository';
import {
  CreateBookInput,
  UpdateBookInput,
  PatchStatusInput,
  ListVendorBooksQuery,
} from './vendor-books.schema';

// ── Helpers ──────────────────────────────────────────────────────────────────
async function assertCategoryExists(categoryId: number): Promise<void> {
  const cat = await Category.findByPk(categoryId);
  if (!cat) throw AppError.from('CATEGORY_NOT_FOUND', 'Danh mục không tồn tại');
}

function assertOwnership(bookVendorUserId: number | string, requestUserId: number): void {
  if (Number(bookVendorUserId) !== requestUserId) {
    throw AppError.from('FORBIDDEN', 'Bạn không có quyền thực hiện hành động này');
  }
}

function storageKeyFromFile(file: Express.Multer.File): string {
  return path.basename(file.path);
}

function coverUrlFromFile(file: Express.Multer.File): string {
  return `/uploads/covers/${path.basename(file.path)}`;
}

// ── Create ────────────────────────────────────────────────────────────────────
export async function createBook(
  vendorUserId: number,
  input: CreateBookInput,
  files: {
    covers?: Express.Multer.File[];
    ebookFile?: Express.Multer.File[];
  },
) {
  const ebookFile = files.ebookFile?.[0];
  if (!ebookFile) {
    throw AppError.from('VALIDATION', 'File E-book là bắt buộc khi tạo sách');
  }

  await assertCategoryExists(input.categoryId);

  const author = await repo.findOrCreateAuthor(input.authorName);
  const publisher = input.publisherName
    ? await repo.findOrCreatePublisher(input.publisherName)
    : null;

  const slug = await repo.uniqueBookSlug(input.title);
  const fileFormat = mimeToFormat(ebookFile.mimetype);

  const covers = files.covers ?? [];
  const coverImageUrl = covers.length > 0 ? coverUrlFromFile(covers[0]) : null;

  const isPublished = input.status === 'published';

  const book = await repo.createBook({
    vendorUserId,
    title: input.title,
    slug,
    description: input.description,
    tableOfContents: input.tableOfContents,
    price: input.price,
    originalPrice: input.originalPrice ?? null,
    authorId: author.id,
    publisherId: publisher?.id ?? null,
    categoryId: input.categoryId,
    fileFormat,
    fileSizeBytes: ebookFile.size,
    coverImageUrl,
    status: input.status,
    publishedAt: isPublished ? new Date() : null,
  });

  // Save e-book file (private)
  await repo.createBookFile({
    bookId: book.id,
    storageKey: storageKeyFromFile(ebookFile),
    fileFormat,
    fileSizeBytes: ebookFile.size,
    version: 1,
  });

  // Save cover images
  if (covers.length > 0) {
    await repo.createBookImages(
      book.id,
      covers.map((f, i) => ({ url: coverUrlFromFile(f), sortOrder: i })),
    );
  }

  return { id: book.id, slug: book.slug, status: book.status };
}

// ── Get one (owner) ───────────────────────────────────────────────────────────
export async function getVendorBook(vendorUserId: number, bookId: number) {
  const book = await repo.findBookById(bookId);
  if (!book) throw AppError.from('BOOK_NOT_FOUND', 'Không tìm thấy sách');
  assertOwnership(book.vendorUserId, vendorUserId);

  const author = (book as any).author as any;
  const publisher = (book as any).publisher as any;
  const category = (book as any).category as any;
  const images = (book as any).images as any[];
  const file = (book as any).file as any;

  return {
    id: book.id,
    slug: book.slug ?? null,
    title: book.title,
    description: book.description ?? null,
    tableOfContents: book.tableOfContents ?? null,
    price: Number(book.price),
    originalPrice: book.originalPrice != null ? Number(book.originalPrice) : null,
    categoryId: book.categoryId ?? null,
    authorName: author?.name ?? null,
    publisherName: publisher?.name ?? null,
    fileFormat: book.fileFormat,
    fileSizeBytes: file?.fileSizeBytes ?? book.fileSizeBytes ?? null,
    coverImageUrl: book.coverImageUrl ?? null,
    images: (images ?? []).map((img: any) => ({
      id: img.id,
      url: img.url,
      alt: img.alt ?? null,
      sortOrder: img.sortOrder ?? 0,
    })),
    status: book.status,
    publishedAt: book.publishedAt ?? null,
  };
}

// ── List ──────────────────────────────────────────────────────────────────────
export async function listVendorBooks(vendorUserId: number, q: ListVendorBooksQuery) {
  const { rows, count } = await repo.listVendorBooks(vendorUserId, q);
  const totalPages = Math.ceil(count / q.limit);

  return {
    data: {
      books: rows.map((b) => {
        const author = (b as any).author as any;
        return {
          id: b.id,
          title: b.title,
          author: author?.name ?? null,
          coverImageUrl: b.coverImageUrl ?? null,
          price: Number(b.price),
          status: b.status,
          purchaseCount: b.purchaseCount ?? 0,
          updatedAt: b.updated_at,
        };
      }),
    },
    meta: {
      pagination: { page: q.page, limit: q.limit, total: count, totalPages },
    },
  };
}

// ── Update ────────────────────────────────────────────────────────────────────
export async function updateBook(
  vendorUserId: number,
  bookId: number,
  input: UpdateBookInput,
  files: {
    covers?: Express.Multer.File[];
    ebookFile?: Express.Multer.File[];
  },
) {
  const book = await repo.findBookById(bookId);
  if (!book) throw AppError.from('BOOK_NOT_FOUND', 'Không tìm thấy sách');
  assertOwnership(book.vendorUserId, vendorUserId);

  if (input.categoryId !== undefined) {
    await assertCategoryExists(input.categoryId);
  }

  const updateData: Parameters<typeof repo.updateBook>[1] = {};

  if (input.title !== undefined) {
    updateData.title = input.title;
    updateData.slug = await repo.uniqueBookSlug(input.title);
  }
  if (input.description !== undefined) updateData.description = input.description ?? null;
  if (input.tableOfContents !== undefined) updateData.tableOfContents = input.tableOfContents ?? null;
  if (input.price !== undefined) updateData.price = input.price;
  if ('originalPrice' in input) updateData.originalPrice = input.originalPrice ?? null;
  if (input.categoryId !== undefined) updateData.categoryId = input.categoryId;
  if (input.status !== undefined) updateData.status = input.status;

  if (input.authorName !== undefined) {
    const author = await repo.findOrCreateAuthor(input.authorName);
    updateData.authorId = author.id;
  }
  if ('publisherName' in input) {
    if (input.publisherName) {
      const publisher = await repo.findOrCreatePublisher(input.publisherName);
      updateData.publisherId = publisher.id;
    } else {
      updateData.publisherId = null;
    }
  }

  // Handle new e-book file
  const newEbookFile = files.ebookFile?.[0];
  if (newEbookFile) {
    const fileFormat = mimeToFormat(newEbookFile.mimetype);
    const latest = await repo.getLatestBookFile(bookId);
    const newVersion = (latest?.version ?? 0) + 1;
    await repo.createBookFile({
      bookId,
      storageKey: storageKeyFromFile(newEbookFile),
      fileFormat,
      fileSizeBytes: newEbookFile.size,
      version: newVersion,
    });
    updateData.fileFormat = fileFormat;
    updateData.fileSizeBytes = newEbookFile.size;
  }

  // Handle new covers
  const newCovers = files.covers ?? [];
  if (newCovers.length > 0) {
    await repo.deleteBookImages(bookId);
    await repo.createBookImages(
      bookId,
      newCovers.map((f, i) => ({ url: coverUrlFromFile(f), sortOrder: i })),
    );
    updateData.coverImageUrl = coverUrlFromFile(newCovers[0]);
  }

  // Set publishedAt on first publish
  if (input.status === 'published' && !book.publishedAt) {
    updateData.publishedAt = new Date();
  }

  await repo.updateBook(bookId, updateData);
  return getVendorBook(vendorUserId, bookId);
}

// ── Patch status ──────────────────────────────────────────────────────────────
export async function patchStatus(
  vendorUserId: number,
  bookId: number,
  input: PatchStatusInput,
) {
  const book = await repo.findBookById(bookId);
  if (!book) throw AppError.from('BOOK_NOT_FOUND', 'Không tìm thấy sách');
  assertOwnership(book.vendorUserId, vendorUserId);

  const updateData: Record<string, any> = { status: input.status };

  // Set publishedAt on first publish
  if (input.status === 'published' && !book.publishedAt) {
    updateData.publishedAt = new Date();
  }

  await repo.updateBook(bookId, updateData);
  return { id: bookId, status: input.status };
}

// ── Delete (soft) ─────────────────────────────────────────────────────────────
export async function deleteBook(vendorUserId: number, bookId: number): Promise<void> {
  const book = await repo.findBookById(bookId);
  if (!book) throw AppError.from('BOOK_NOT_FOUND', 'Không tìm thấy sách');
  assertOwnership(book.vendorUserId, vendorUserId);

  await repo.updateBook(bookId, { status: 'hidden' });
}
