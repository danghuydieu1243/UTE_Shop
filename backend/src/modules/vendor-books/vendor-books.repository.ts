import { Op, literal } from 'sequelize';
import { Book, Author, Publisher, Category, BookImage, BookFile } from '../../db/models';
import { sequelize } from '../../shared/db/sequelize';
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

export async function uniqueBookSlug(base: string, excludeId?: number): Promise<string> {
  const candidate = slugify(base);
  const baseWhere = excludeId ? { slug: candidate, id: { [Op.ne]: excludeId } } : { slug: candidate };
  const existing = await Book.findOne({ where: baseWhere });
  if (!existing) return candidate;

  // Try with numeric suffix
  for (let i = 2; i <= 999; i++) {
    const withSuffix = `${candidate}-${i}`;
    const suffixWhere = excludeId
      ? { slug: withSuffix, id: { [Op.ne]: excludeId } }
      : { slug: withSuffix };
    const conflict = await Book.findOne({ where: suffixWhere });
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
  publishYear?: number | null;
  isbn?: string | null;
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
      { model: BookFile, as: 'file', attributes: ['id', 'fileFormat', 'fileSizeBytes', 'version'] },
    ],
  });
}

export async function updateBook(id: number, data: Partial<{
  title: string;
  description: string | null;
  tableOfContents: string | null;
  price: number;
  originalPrice: number | null;
  publishYear: number | null;
  isbn: string | null;
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
  const include: any[] = [
    { model: Author, as: 'author', attributes: ['name'] },
    { model: Publisher, as: 'publisher', attributes: ['name'] },
    { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
  ];

  if (q.status) {
    where['status'] = q.status;
  }

  if (q.categoryId !== undefined) {
    where['categoryId'] = q.categoryId;
  }

  if (q.format) {
    where['fileFormat'] = q.format;
  }

  if (q.q) {
    const pattern = `%${q.q.trim()}%`;
    where[Op.or as any] = [
      { title: { [Op.like]: pattern } },
      { isbn: { [Op.like]: pattern } },
      { '$author.name$': { [Op.like]: pattern } },
      { '$publisher.name$': { [Op.like]: pattern } },
    ];
  }

  const escapedStartsWith = q.q ? sequelize.escape(`${q.q.trim()}%`) : null;
  const escapedContains = q.q ? sequelize.escape(`%${q.q.trim()}%`) : null;

  let order: any[];
  switch (q.sort) {
    case 'titleAsc':
      order = [['title', 'ASC'], ['updated_at', 'DESC']];
      break;
    case 'titleDesc':
      order = [['title', 'DESC'], ['updated_at', 'DESC']];
      break;
    case 'priceAsc':
      order = [['price', 'ASC'], ['updated_at', 'DESC']];
      break;
    case 'priceDesc':
      order = [['price', 'DESC'], ['updated_at', 'DESC']];
      break;
    case 'soldAsc':
      order = [['purchase_count', 'ASC'], ['updated_at', 'DESC']];
      break;
    case 'soldDesc':
      order = [['purchase_count', 'DESC'], ['updated_at', 'DESC']];
      break;
    case 'statusAsc':
      order = [[literal(`CASE
        WHEN status = 'published' THEN 0
        WHEN status = 'draft' THEN 1
        WHEN status = 'hidden' THEN 2
        ELSE 3
      END`), 'ASC'], ['updated_at', 'DESC']];
      break;
    case 'statusDesc':
      order = [[literal(`CASE
        WHEN status = 'hidden' THEN 0
        WHEN status = 'draft' THEN 1
        WHEN status = 'published' THEN 2
        ELSE 3
      END`), 'ASC'], ['updated_at', 'DESC']];
      break;
    case 'publishedAtDesc':
      order = [['published_at', 'DESC'], ['updated_at', 'DESC']];
      break;
    case 'updatedAtDesc':
      order = [['updated_at', 'DESC']];
      break;
    case 'relevance':
    default:
      if (q.q && escapedStartsWith && escapedContains) {
        order = [[literal(`CASE
          WHEN title LIKE ${escapedStartsWith} THEN 0
          WHEN title LIKE ${escapedContains} THEN 1
          WHEN author.name LIKE ${escapedContains} THEN 2
          WHEN publisher.name LIKE ${escapedContains} THEN 3
          WHEN isbn LIKE ${escapedContains} THEN 4
          ELSE 5
        END`), 'ASC'], ['updated_at', 'DESC']];
      } else {
        order = [['updated_at', 'DESC']];
      }
  }

  const offset = (q.page - 1) * q.limit;

  return Book.findAndCountAll({
    where,
    include,
    order,
    limit: q.limit,
    offset,
    distinct: true,
  });
}
