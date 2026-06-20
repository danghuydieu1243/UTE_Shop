import { Op, fn, col, literal } from 'sequelize';
import { Book, Author, Publisher, Category, BookImage, BookFile, Vendor, User } from '../../db/models';
import { ListBooksQuery } from './catalog.schema';

// ── Shared includes ──────────────────────────────────────────────────────────
const bookIncludes = [
  { model: Author, as: 'author', attributes: ['id', 'name', 'slug'] },
  { model: Publisher, as: 'publisher', attributes: ['id', 'name', 'slug'] },
  { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
  { model: BookImage, as: 'images', attributes: ['url', 'alt', 'sortOrder'] },
];

const vendorInclude = {
  model: User,
  as: 'vendor',
  attributes: [],
  include: [
    {
      model: Vendor as typeof Vendor,
      as: 'vendor',
      attributes: ['shopName', 'shopSlug'],
    },
  ],
};

// ── Book Card DTO mapper ─────────────────────────────────────────────────────
// No originalPrice column in DB yet — set null per spec note
// bookIncludes does not eager-load BookFile; read fileSizeBytes directly from Book row.
export function toBookCard(b: Book & Record<string, any>) {
  const author = b.author as any;
  return {
    id: b.id,
    slug: b.slug,
    title: b.title,
    author: author?.name ?? null,
    authorSlug: author?.slug ?? null,
    coverImageUrl: b.coverImageUrl ?? null,
    price: b.price,
    originalPrice: null,   // No DB column yet (Phase 2 note)
    discountPercent: null, // No DB column yet (Phase 2 note)
    fileFormat: b.fileFormat,
    fileSizeBytes: b.fileSizeBytes ?? null,
    ratingAvg: b.ratingAvg ? Number(b.ratingAvg) : 0,
    ratingCount: b.ratingCount ?? 0,
    purchaseCount: b.purchaseCount ?? 0,
    tag: null,
  };
}

// ── Home ─────────────────────────────────────────────────────────────────────
export async function getNewReleases(limit = 10): Promise<Book[]> {
  return Book.findAll({
    where: { status: 'published' },
    include: bookIncludes,
    order: [['published_at', 'DESC']],
    limit,
  });
}

export async function getBestsellers(limit = 10): Promise<Book[]> {
  return Book.findAll({
    where: { status: 'published' },
    include: bookIncludes,
    order: [['purchase_count', 'DESC'], ['published_at', 'DESC']],
    limit,
  });
}

export async function getFeatured(limit = 10): Promise<Book[]> {
  return Book.findAll({
    where: { status: 'published' },
    include: bookIncludes,
    order: [['rating_avg', 'DESC'], ['published_at', 'DESC']],
    limit,
  });
}

export async function getCategoriesWithCount(): Promise<Array<{ id: number; slug: string | null; name: string; parentId: number | null; sortOrder: number; bookCount: number }>> {
  const categories = await Category.findAll({
    attributes: ['id', 'slug', 'name', 'parentId', 'sortOrder'],
    order: [['sort_order', 'ASC']],
  });

  // Count published books per category
  const bookCounts = await Book.findAll({
    where: { status: 'published' },
    attributes: ['categoryId', [fn('COUNT', col('id')), 'cnt']],
    group: ['category_id'],
    raw: true,
  }) as any[];

  const countMap: Record<number, number> = {};
  for (const row of bookCounts) {
    countMap[Number(row.categoryId)] = Number(row.cnt);
  }

  return categories.map((c) => ({
    id: c.id,
    slug: c.slug ?? null,
    name: c.name,
    parentId: (c as any).parentId ?? null,
    sortOrder: (c as any).sortOrder ?? 0,
    bookCount: countMap[c.id] ?? 0,
  }));
}

// ── List/Filter ──────────────────────────────────────────────────────────────
export async function listBooks(q: ListBooksQuery): Promise<{ rows: Book[]; count: number }> {
  const where: Record<string, any> = { status: 'published' };

  if (q.priceMin !== undefined || q.priceMax !== undefined) {
    where['price'] = {
      ...(q.priceMin !== undefined ? { [Op.gte]: q.priceMin } : {}),
      ...(q.priceMax !== undefined ? { [Op.lte]: q.priceMax } : {}),
    };
  }

  if (q.rating !== undefined) {
    where['rating_avg'] = { [Op.gte]: q.rating };
  }

  if (q.format && q.format.length > 0) {
    where['file_format'] = { [Op.in]: q.format };
  }

  // Build include array with optional where clauses
  const authorInclude: any = { model: Author, as: 'author', attributes: ['id', 'name', 'slug'] };
  const publisherInclude: any = { model: Publisher, as: 'publisher', attributes: ['id', 'name', 'slug'] };
  const categoryInclude: any = { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] };

  if (q.author && q.author.length > 0) {
    authorInclude.where = { slug: { [Op.in]: q.author } };
    authorInclude.required = true;
  }

  if (q.publisher && q.publisher.length > 0) {
    publisherInclude.where = { slug: { [Op.in]: q.publisher } };
    publisherInclude.required = true;
  }

  if (q.category) {
    categoryInclude.where = { slug: q.category };
    categoryInclude.required = true;
  }

  // Text search: title LIKE or author name LIKE
  // When an author slug filter is active it is a hard AND constraint; the q author-name
  // arm must NOT widen results to authors outside that slug set.
  if (q.q) {
    const pattern = `%${q.q}%`;
    // Find authors whose name matches q, honouring any active author-slug constraint.
    const authorWhere: Record<string, any> = { name: { [Op.like]: pattern } };
    if (q.author && q.author.length > 0) {
      authorWhere['slug'] = { [Op.in]: q.author };
    }
    const matchingAuthors = await Author.findAll({
      where: authorWhere,
      attributes: ['id'],
    });
    const authorIds = matchingAuthors.map((a) => a.id);

    const titleCond = { title: { [Op.like]: pattern } };
    if (authorIds.length > 0) {
      where[Op.or as any] = [titleCond, { authorId: { [Op.in]: authorIds } }];
    } else {
      Object.assign(where, titleCond);
    }
  }

  // Sort
  let order: any[];
  switch (q.sort) {
    case 'newest':
      order = [['published_at', 'DESC']];
      break;
    case 'bestselling':
      order = [['purchase_count', 'DESC'], ['published_at', 'DESC']];
      break;
    case 'price_asc':
      order = [['price', 'ASC']];
      break;
    case 'price_desc':
      order = [['price', 'DESC']];
      break;
    case 'relevant':
    default:
      order = [['published_at', 'DESC']];
  }

  const offset = (q.page - 1) * q.limit;

  const { rows, count } = await Book.findAndCountAll({
    where,
    include: [
      authorInclude,
      publisherInclude,
      categoryInclude,
      { model: BookImage, as: 'images', attributes: ['url', 'alt', 'sortOrder'] },
    ],
    order,
    limit: q.limit,
    offset,
    distinct: true,
  });

  return { rows, count };
}

// ── Detail ───────────────────────────────────────────────────────────────────
export async function findBookByIdOrSlug(idOrSlug: string): Promise<Book | null> {
  const where = /^\d+$/.test(idOrSlug)
    ? { id: Number(idOrSlug), status: 'published' }
    : { slug: idOrSlug, status: 'published' };

  return Book.findOne({
    where,
    include: [
      ...bookIncludes,
      { model: BookFile, as: 'file', attributes: ['fileFormat', 'fileSizeBytes'] },
      vendorInclude,
    ],
  });
}

export async function getRelatedByAuthor(book: Book, limit = 10): Promise<Book[]> {
  if (!book.authorId) return [];
  return Book.findAll({
    where: { status: 'published', authorId: book.authorId, id: { [Op.ne]: book.id } },
    include: bookIncludes,
    order: [['published_at', 'DESC']],
    limit,
  });
}

export async function getRelatedByCategory(book: Book, limit = 10): Promise<Book[]> {
  if (!book.categoryId) return [];
  return Book.findAll({
    where: { status: 'published', categoryId: book.categoryId, id: { [Op.ne]: book.id } },
    include: bookIncludes,
    order: [['published_at', 'DESC']],
    limit,
  });
}

export async function incrementViewCount(bookId: number): Promise<void> {
  await Book.increment('viewCount', { where: { id: bookId } });
}

// ── Filters ──────────────────────────────────────────────────────────────────
export interface FilterOptions {
  authors: Array<{ slug: string | null; name: string; count: number }>;
  publishers: Array<{ slug: string | null; name: string; count: number }>;
  priceRange: { min: number; max: number };
  formats: Array<{ value: string; count: number }>;
}

export async function getFilterOptions(): Promise<FilterOptions> {
  // Authors with published book counts
  const authorRows = await Book.findAll({
    where: { status: 'published', authorId: { [Op.ne]: null } },
    attributes: ['authorId', [fn('COUNT', col('Book.id')), 'cnt']],
    include: [{ model: Author, as: 'author', attributes: ['name', 'slug'] }],
    group: ['author_id', 'author.id', 'author.name', 'author.slug'],
    order: [[literal('cnt'), 'DESC']],
    raw: false,
  }) as any[];

  const authors = authorRows.map((r: any) => ({
    slug: r.author?.slug ?? null,
    name: r.author?.name ?? '',
    count: Number((r as any).getDataValue ? (r as any).getDataValue('cnt') : r.cnt),
  }));

  // Publishers with published book counts
  const publisherRows = await Book.findAll({
    where: { status: 'published', publisherId: { [Op.ne]: null } },
    attributes: ['publisherId', [fn('COUNT', col('Book.id')), 'cnt']],
    include: [{ model: Publisher, as: 'publisher', attributes: ['name', 'slug'] }],
    group: ['publisher_id', 'publisher.id', 'publisher.name', 'publisher.slug'],
    order: [[literal('cnt'), 'DESC']],
    raw: false,
  }) as any[];

  const publishers = publisherRows.map((r: any) => ({
    slug: r.publisher?.slug ?? null,
    name: r.publisher?.name ?? '',
    count: Number((r as any).getDataValue ? (r as any).getDataValue('cnt') : r.cnt),
  }));

  // Price range
  const priceRow = await Book.findOne({
    where: { status: 'published' },
    attributes: [[fn('MIN', col('price')), 'minP'], [fn('MAX', col('price')), 'maxP']],
    raw: true,
  }) as any;
  const priceRange = {
    min: Number(priceRow?.minP ?? 0),
    max: Number(priceRow?.maxP ?? 0),
  };

  // Formats
  const formatRows = await Book.findAll({
    where: { status: 'published' },
    attributes: ['fileFormat', [fn('COUNT', col('id')), 'cnt']],
    group: ['file_format'],
    raw: true,
  }) as any[];

  const formats = formatRows.map((r: any) => ({
    value: r.fileFormat ?? r.file_format,
    count: Number(r.cnt),
  }));

  return { authors, publishers, priceRange, formats };
}
