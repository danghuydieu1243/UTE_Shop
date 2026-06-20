import request from 'supertest';
import { createApp } from '../../../app';
import { User, Vendor, Author, Publisher, Category, Book } from '../../../db/models';

const app = createApp();

// ── Seed helpers ─────────────────────────────────────────────────────────────
async function seedData() {
  // Vendor user
  const vendorUser = await User.create({
    email: 'vendor1@test.com',
    passwordHash: 'hash',
    role: 'vendor',
    fullName: 'Vendor One',
    status: 'active',
  });
  await Vendor.create({
    userId: vendorUser.id,
    shopName: 'Test Shop',
    shopSlug: 'test-shop',
  });

  // Author & Publisher
  const author1 = await Author.create({ name: 'Dale Carnegie', slug: 'dale-carnegie' });
  const author2 = await Author.create({ name: 'Napoleon Hill', slug: 'napoleon-hill' });
  const publisher = await Publisher.create({ name: 'NXB Trẻ', slug: 'nxb-tre' });

  // Categories
  const catVanHoc = await Category.create({ name: 'Văn học', slug: 'van-hoc', sortOrder: 1 });
  const catKinhTe = await Category.create({ name: 'Kinh tế', slug: 'kinh-te', sortOrder: 2 });

  // Books
  await Book.create({
    vendorUserId: vendorUser.id,
    title: 'Đắc Nhân Tâm',
    slug: 'dac-nhan-tam',
    authorId: author1.id,
    publisherId: publisher.id,
    categoryId: catVanHoc.id,
    price: 89000,
    fileFormat: 'PDF',
    fileSizeBytes: 5000000,
    status: 'published',
    purchaseCount: 500,
    ratingAvg: 4.8,
    ratingCount: 200,
    publishedAt: new Date('2024-01-01'),
  });

  await Book.create({
    vendorUserId: vendorUser.id,
    title: 'Nghĩ Giàu Làm Giàu',
    slug: 'nghi-giau-lam-giau',
    authorId: author2.id,
    publisherId: publisher.id,
    categoryId: catKinhTe.id,
    price: 120000,
    fileFormat: 'EPUB',
    fileSizeBytes: 3000000,
    status: 'published',
    purchaseCount: 1000,
    ratingAvg: 4.5,
    ratingCount: 300,
    publishedAt: new Date('2024-03-01'),
  });

  await Book.create({
    vendorUserId: vendorUser.id,
    title: 'Sách Rẻ Hơn',
    slug: 'sach-re-hon',
    authorId: author1.id,
    categoryId: catVanHoc.id,
    price: 50000,
    fileFormat: 'PDF',
    status: 'published',
    purchaseCount: 50,
    ratingAvg: 3.5,
    publishedAt: new Date('2024-06-01'),
  });

  // Draft book — should NOT appear in public catalog
  await Book.create({
    vendorUserId: vendorUser.id,
    title: 'Sách Nháp',
    slug: 'sach-nhap',
    price: 30000,
    fileFormat: 'PDF',
    status: 'draft',
  });

  return { catVanHoc, catKinhTe, author1, author2 };
}

// ── Test suite ───────────────────────────────────────────────────────────────
describe('Catalog API', () => {
  beforeAll(async () => {
    await seedData();
  });

  // ── Home ───────────────────────────────────────────────────────────────────
  describe('GET /api/v1/catalog/home', () => {
    it('returns 4 groups: newReleases, bestsellers, featured, categories', async () => {
      const res = await request(app).get('/api/v1/catalog/home');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const d = res.body.data;
      expect(Array.isArray(d.newReleases)).toBe(true);
      expect(Array.isArray(d.bestsellers)).toBe(true);
      expect(Array.isArray(d.featured)).toBe(true);
      expect(Array.isArray(d.categories)).toBe(true);
    });

    it('home does not include draft books', async () => {
      const res = await request(app).get('/api/v1/catalog/home');
      const titles = res.body.data.newReleases.map((b: any) => b.title);
      expect(titles).not.toContain('Sách Nháp');
    });

    it('bestsellers sorted by purchaseCount desc', async () => {
      const res = await request(app).get('/api/v1/catalog/home');
      const bs = res.body.data.bestsellers as any[];
      expect(bs.length).toBeGreaterThan(0);
      expect(bs[0].purchaseCount).toBeGreaterThanOrEqual(bs[bs.length - 1].purchaseCount);
    });

    it('categories include bookCount', async () => {
      const res = await request(app).get('/api/v1/catalog/home');
      const cats = res.body.data.categories as any[];
      expect(cats.length).toBeGreaterThan(0);
      for (const cat of cats) {
        expect(typeof cat.bookCount).toBe('number');
      }
    });
  });

  // ── List/Filter ────────────────────────────────────────────────────────────
  describe('GET /api/v1/catalog/books', () => {
    it('returns published books with pagination meta', async () => {
      const res = await request(app).get('/api/v1/catalog/books');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data.books)).toBe(true);
      const pg = res.body.meta.pagination;
      expect(pg).toMatchObject({ page: 1, limit: 20 });
      expect(typeof pg.total).toBe('number');
      expect(typeof pg.totalPages).toBe('number');
    });

    it('draft books excluded from list', async () => {
      const res = await request(app).get('/api/v1/catalog/books');
      const titles = res.body.data.books.map((b: any) => b.title);
      expect(titles).not.toContain('Sách Nháp');
    });

    it('filter by format=PDF', async () => {
      const res = await request(app).get('/api/v1/catalog/books?format=PDF');
      expect(res.status).toBe(200);
      for (const book of res.body.data.books) {
        expect(book.fileFormat).toBe('PDF');
      }
    });

    it('filter by format=EPUB returns only EPUB books', async () => {
      const res = await request(app).get('/api/v1/catalog/books?format=EPUB');
      expect(res.status).toBe(200);
      const books = res.body.data.books;
      expect(books.length).toBeGreaterThan(0);
      for (const book of books) {
        expect(book.fileFormat).toBe('EPUB');
      }
    });

    it('filter by priceMin/priceMax', async () => {
      const res = await request(app).get('/api/v1/catalog/books?priceMin=80000&priceMax=100000');
      expect(res.status).toBe(200);
      for (const book of res.body.data.books) {
        expect(book.price).toBeGreaterThanOrEqual(80000);
        expect(book.price).toBeLessThanOrEqual(100000);
      }
    });

    it('search by q (title LIKE)', async () => {
      const res = await request(app).get('/api/v1/catalog/books?q=Đắc');
      expect(res.status).toBe(200);
      const titles = res.body.data.books.map((b: any) => b.title);
      expect(titles).toContain('Đắc Nhân Tâm');
    });

    it('sort by price_asc', async () => {
      const res = await request(app).get('/api/v1/catalog/books?sort=price_asc');
      expect(res.status).toBe(200);
      const books = res.body.data.books as any[];
      for (let i = 1; i < books.length; i++) {
        expect(books[i].price).toBeGreaterThanOrEqual(books[i - 1].price);
      }
    });

    it('sort by bestselling', async () => {
      const res = await request(app).get('/api/v1/catalog/books?sort=bestselling');
      expect(res.status).toBe(200);
      const books = res.body.data.books as any[];
      expect(books.length).toBeGreaterThan(0);
      // First book should have highest purchase count
      expect(books[0].purchaseCount).toBeGreaterThanOrEqual(books[books.length - 1].purchaseCount);
    });

    it('pagination meta is correct with limit=1', async () => {
      const res = await request(app).get('/api/v1/catalog/books?limit=1&page=1');
      expect(res.status).toBe(200);
      const pg = res.body.meta.pagination;
      expect(pg.limit).toBe(1);
      expect(pg.page).toBe(1);
      expect(pg.total).toBeGreaterThan(1);
      expect(pg.totalPages).toBeGreaterThan(1);
      expect(res.body.data.books.length).toBe(1);
    });

    it('pagination page=2 returns different books', async () => {
      const res1 = await request(app).get('/api/v1/catalog/books?limit=1&page=1');
      const res2 = await request(app).get('/api/v1/catalog/books?limit=1&page=2');
      const id1 = res1.body.data.books[0]?.id;
      const id2 = res2.body.data.books[0]?.id;
      expect(id1).not.toEqual(id2);
    });

    it('invalid limit (too large) rejected with 422', async () => {
      const res = await request(app).get('/api/v1/catalog/books?limit=100');
      expect(res.status).toBe(422); // Zod max(60) rejects — value is NOT clamped, it is rejected
    });

    // ── q + author interaction (finding [1]) ───────────────────────────────
    it('q matches author name: book with non-matching title IS returned', async () => {
      // "Đắc Nhân Tâm" has title that does not contain "Carnegie", but its author is "Dale Carnegie"
      const res = await request(app).get('/api/v1/catalog/books?q=Carnegie');
      expect(res.status).toBe(200);
      const titles = res.body.data.books.map((b: any) => b.title);
      expect(titles).toContain('Đắc Nhân Tâm');
    });

    it('q + author slug: results do NOT leak books outside the specified author', async () => {
      // q=Hill matches Napoleon Hill (author name). author=dale-carnegie constrains to Carnegie.
      // Hill's book "Nghĩ Giàu Làm Giàu" must NOT appear; only Carnegie books are allowed.
      const res = await request(app).get('/api/v1/catalog/books?q=Hill&author=dale-carnegie');
      expect(res.status).toBe(200);
      const authors = res.body.data.books.map((b: any) => b.authorSlug);
      for (const slug of authors) {
        expect(slug).toBe('dale-carnegie');
      }
      const titles = res.body.data.books.map((b: any) => b.title);
      expect(titles).not.toContain('Nghĩ Giàu Làm Giàu');
    });
  });

  // ── Detail ─────────────────────────────────────────────────────────────────
  describe('GET /api/v1/catalog/books/:idOrSlug', () => {
    it('returns book detail by slug', async () => {
      const res = await request(app).get('/api/v1/catalog/books/dac-nhan-tam');
      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe('Đắc Nhân Tâm');
      expect(res.body.data.relatedByAuthor).toBeDefined();
      expect(res.body.data.relatedByCategory).toBeDefined();
    });

    it('returns book detail by id', async () => {
      // Get id first from slug
      const slugRes = await request(app).get('/api/v1/catalog/books/dac-nhan-tam');
      const bookId = slugRes.body.data.id;
      const res = await request(app).get(`/api/v1/catalog/books/${bookId}`);
      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(bookId);
    });

    it('returns 404 BOOK_NOT_FOUND for non-existent slug', async () => {
      const res = await request(app).get('/api/v1/catalog/books/non-existent-book');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('BOOK_NOT_FOUND');
    });

    it('returns 404 for draft book slug', async () => {
      const res = await request(app).get('/api/v1/catalog/books/sach-nhap');
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('BOOK_NOT_FOUND');
    });

    it('detail includes author object with id/name/slug', async () => {
      const res = await request(app).get('/api/v1/catalog/books/dac-nhan-tam');
      expect(res.body.data.author).toMatchObject({
        name: 'Dale Carnegie',
        slug: 'dale-carnegie',
      });
    });
  });

  // ── Categories ─────────────────────────────────────────────────────────────
  describe('GET /api/v1/catalog/categories', () => {
    it('returns categories array with bookCount', async () => {
      const res = await request(app).get('/api/v1/catalog/categories');
      expect(res.status).toBe(200);
      const cats = res.body.data.categories as any[];
      expect(cats.length).toBeGreaterThan(0);
      for (const cat of cats) {
        expect(cat).toHaveProperty('id');
        expect(cat).toHaveProperty('slug');
        expect(cat).toHaveProperty('name');
        expect(typeof cat.bookCount).toBe('number');
      }
    });
  });

  // ── Filters ────────────────────────────────────────────────────────────────
  describe('GET /api/v1/catalog/filters', () => {
    it('returns authors, publishers, priceRange, formats', async () => {
      const res = await request(app).get('/api/v1/catalog/filters');
      expect(res.status).toBe(200);
      const d = res.body.data;
      expect(Array.isArray(d.authors)).toBe(true);
      expect(Array.isArray(d.publishers)).toBe(true);
      expect(d.priceRange).toMatchObject({ min: expect.any(Number), max: expect.any(Number) });
      expect(Array.isArray(d.formats)).toBe(true);
    });

    it('formats only include published book formats', async () => {
      const res = await request(app).get('/api/v1/catalog/filters');
      const formats = res.body.data.formats.map((f: any) => f.value);
      expect(formats).toContain('PDF');
    });
  });
});
