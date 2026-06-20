import { Op } from 'sequelize';
import { Book, Author, Publisher, Category, BookImage, BookFile } from '../../db/models';
import { ListVendorBooksQuery } from './vendor-books.schema';

// ── Slug helpers ──────────────────────────────────────────────────────────────
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 260);
}

export async function uniqueBookSlug(base: string): Promise<string> {
  const candidate = slugify(base);
  const existing = await Book.findOne({ where: { slug: candidate } });
  if (!existing) return candidate;

  // Try with numeric suffix
  for (let i = 2; i <= 999; i++) {
    const withSuffix = `${candidate}-${i}`;
    const conflict = await Book.findOne({ where: { slug: withSuffix } });
    if (!conflict) return withSuffix;
  }
  return `${candidate}-${Date.now()}`;
}

// ── Author / Publisher find-or-create ─────────────────────────────────────────
export async function findOrCreateAuthor(name: string): Promise<Author> {
  const slug = slugify(name);
  const [author] = await Author.findOrCreate({ where: { slug }, defaults: { name, slug } });
  return author;
}

export async function findOrCreatePublisher(name: string): Promise<Publisher> {
  const slug = slugify(name);
  const [publisher] = await Publisher.findOrCreate({ where: { slug }, defaults: { name, slug } });
  return publisher;
}

// ── CRUD ──────────────────────────────────────────────────────────────────────
export async function createBook(data: {
  vendorUserId: number;
  title: string;
  slug: string;
  description?: string;
  tableOfContents?: string;
  price: number;
  originalPrice?: number | null;
  authorId?: number;
  publisherId?: number | null;
  categoryId?: number;
  fileFormat: string;
  fileSizeBytes?: number;
  coverImageUrl?: string | null;
  status: string;
  publishedAt?: Date | null;
}): Promise<Book> {
  return Book.create(data as any);
}

export async function createBookImages(
  bookId: number,
  images: Array<{ url: string; alt?: string; sortOrder: number }>,
): Promise<void> {
  if (images.length === 0) return;
  await BookImage.bulkCreate(images.map((img) => ({ ...img, bookId })));
}

export async function createBookFile(data: {
  bookId: number;
  storageKey: string;
  fileFormat: string;
  fileSizeBytes: number;
  version: number;
}): Promise<BookFile> {
  return BookFile.create(data as any);
}

export async function findBookById(id: number): Promise<Book | null> {
  return Book.findByPk(id, {
    include: [
      { model: Author, as: 'author', attributes: ['id', 'name', 'slug'] },
      { model: Publisher, as: 'publisher', attributes: ['id', 'name', 'slug'] },
      { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
      { model: BookImage, as: 'images', attributes: ['id', 'url', 'alt', 'sortOrder'] },
      { model: BookFile, as: 'file', attributes: ['id', 'fileFormat', 'fileSizeBytes', 'version', 'storageKey'] },
    ],
  });
}

export async function updateBook(id: number, data: Partial<{
  title: string;
  description: string | null;
  tableOfContents: string | null;
  price: number;
  originalPrice: number | null;
  authorId: number | null;
  publisherId: number | null;
  categoryId: number;
  fileFormat: string;
  fileSizeBytes: number | null;
  coverImageUrl: string | null;
  status: string;
  publishedAt: Date | null;
  slug: string;
}>): Promise<void> {
  await Book.update(data, { where: { id } });
}

export async function deleteBookImages(bookId: number): Promise<void> {
  await BookImage.destroy({ where: { bookId } });
}

export async function getLatestBookFile(bookId: number): Promise<BookFile | null> {
  return BookFile.findOne({
    where: { bookId },
    order: [['version', 'DESC']],
  });
}

export async function listVendorBooks(
  vendorUserId: number,
  q: ListVendorBooksQuery,
): Promise<{ rows: Book[]; count: number }> {
  const where: Record<string, any> = { vendorUserId };

  if (q.status) {
    where['status'] = q.status;
  }

  if (q.q) {
    where['title'] = { [Op.like]: `%${q.q}%` };
  }

  const offset = (q.page - 1) * q.limit;

  return Book.findAndCountAll({
    where,
    include: [{ model: Author, as: 'author', attributes: ['name'] }],
    order: [['updated_at', 'DESC']],
    limit: q.limit,
    offset,
    distinct: true,
  });
}
