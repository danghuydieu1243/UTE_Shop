import os from 'os';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { createApp } from '../../../app';
import { User, Vendor, Category, Book, BookFile } from '../../../db/models';
import { signAccessToken } from '../../auth/token.service';
import * as service from '../vendor-books.service';
import * as repo from '../vendor-books.repository';

// ── Setup temp UPLOAD_DIR before anything imports env ────────────────────────
// env.ts is imported at module load time, so we patch process.env here
// Jest clears mocks but NOT process.env; we set a temp dir for tests.
const TEMP_UPLOAD_DIR = path.join(os.tmpdir(), `vendor-books-test-${Date.now()}`);
process.env.UPLOAD_DIR = TEMP_UPLOAD_DIR;

const app = createApp();

// ── Helpers ──────────────────────────────────────────────────────────────────
async function seedVendor(suffix = '') {
  const user = await User.create({
    email: `vendor${suffix}${Date.now()}@test.com`,
    passwordHash: 'hash',
    role: 'vendor',
    fullName: 'Vendor Test',
    status: 'active',
  });
  await Vendor.create({ userId: user.id, shopName: 'Test Shop', shopSlug: `test-shop${suffix}` });
  return user;
}

async function seedCategory() {
  return Category.create({ name: 'Test Cat', slug: `test-cat-${Date.now()}`, sortOrder: 1 });
}

function makeToken(userId: number, role = 'vendor') {
  return signAccessToken({ id: userId, role });
}

// Tiny valid PDF header buffer
const TINY_PDF = Buffer.from('%PDF-1.4\n%%EOF\n');
// Tiny valid PNG buffer (1x1 pixel PNG)
const TINY_PNG = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6260000000020001e221bc330000000049454e44ae426082',
  'hex',
);

// ── Cleanup ───────────────────────────────────────────────────────────────────
afterAll(() => {
  try {
    fs.rmSync(TEMP_UPLOAD_DIR, { recursive: true, force: true });
  } catch { /* ignore */ }
});

// ─────────────────────────────────────────────────────────────────────────────
describe('vendor-books service', () => {
  let vendorUser: User;
  let category: Category;
  let otherVendor: User;

  beforeAll(async () => {
    vendorUser = await seedVendor('svc');
    otherVendor = await seedVendor('svc2');
    category = await seedCategory();
  });

  // ── helpers ──────────────────────────────────────────────────────────────────
  function makeFakeEbookFile(mime = 'application/pdf', size = 1000): Express.Multer.File {
    const filePath = path.join(TEMP_UPLOAD_DIR, 'private', `test-${Date.now()}.pdf`);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, TINY_PDF);
    return {
      fieldname: 'ebookFile',
      originalname: 'test.pdf',
      encoding: '7bit',
      mimetype: mime,
      size,
      destination: path.dirname(filePath),
      filename: path.basename(filePath),
      path: filePath,
      buffer: TINY_PDF,
      stream: null as any,
    };
  }

  function makeFakeCoverFile(): Express.Multer.File {
    const filePath = path.join(TEMP_UPLOAD_DIR, 'covers', `cover-${Date.now()}.png`);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, TINY_PNG);
    return {
      fieldname: 'covers',
      originalname: 'cover.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: TINY_PNG.length,
      destination: path.dirname(filePath),
      filename: path.basename(filePath),
      path: filePath,
      buffer: TINY_PNG,
      stream: null as any,
    };
  }

  // ── Test 1: create book (published sets publishedAt) ─────────────────────────
  it('create: published status sets publishedAt', async () => {
    const ebookFile = makeFakeEbookFile();
    const result = await service.createBook(
      vendorUser.id,
      {
        title: 'Test Book Published',
        categoryId: category.id,
        price: 50000,
        authorName: 'Test Author',
        status: 'published',
      },
      { ebookFile: [ebookFile] },
    );
    expect(result.id).toBeDefined();
    expect(result.status).toBe('published');

    const book = await Book.findByPk(result.id);
    expect(book!.publishedAt).not.toBeNull();
  });

  // ── Test 2: create book (draft does NOT set publishedAt) ─────────────────────
  it('create: draft status does NOT set publishedAt', async () => {
    const ebookFile = makeFakeEbookFile();
    const result = await service.createBook(
      vendorUser.id,
      {
        title: 'Test Book Draft',
        categoryId: category.id,
        price: 30000,
        authorName: 'Test Author',
        status: 'draft',
      },
      { ebookFile: [ebookFile] },
    );
    const book = await Book.findByPk(result.id);
    expect(book!.publishedAt).toBeNull();
  });

  // ── Test 3: ownership 403 ────────────────────────────────────────────────────
  it('getVendorBook: ownership check throws FORBIDDEN for wrong vendor', async () => {
    const ebookFile = makeFakeEbookFile();
    const result = await service.createBook(
      vendorUser.id,
      {
        title: 'Book by Vendor A',
        categoryId: category.id,
        price: 40000,
        authorName: 'Author A',
        status: 'draft',
      },
      { ebookFile: [ebookFile] },
    );

    await expect(service.getVendorBook(otherVendor.id, result.id)).rejects.toMatchObject({
      code: 'AUTH_FORBIDDEN',
    });
  });

  // ── Test 4: slug uniqueness with numeric suffix ──────────────────────────────
  it('create: duplicate title gets numeric suffix on slug', async () => {
    const ebookFile1 = makeFakeEbookFile();
    const ebookFile2 = makeFakeEbookFile();
    const r1 = await service.createBook(
      vendorUser.id,
      { title: 'Slug Test Book', categoryId: category.id, price: 10000, authorName: 'Auth', status: 'draft' },
      { ebookFile: [ebookFile1] },
    );
    const r2 = await service.createBook(
      vendorUser.id,
      { title: 'Slug Test Book', categoryId: category.id, price: 10000, authorName: 'Auth', status: 'draft' },
      { ebookFile: [ebookFile2] },
    );
    expect(r1.slug).not.toBe(r2.slug);
    expect(r2.slug).toMatch(/-2$/);
  });

  // ── Test 5: CATEGORY_NOT_FOUND ───────────────────────────────────────────────
  it('create: throws CATEGORY_NOT_FOUND for missing category', async () => {
    const ebookFile = makeFakeEbookFile();
    await expect(
      service.createBook(
        vendorUser.id,
        { title: 'No Cat Book', categoryId: 999999, price: 10000, authorName: 'Auth', status: 'draft' },
        { ebookFile: [ebookFile] },
      ),
    ).rejects.toMatchObject({ code: 'CATEGORY_NOT_FOUND' });
  });

  // ── Test 6: list filter by status (own-only) ─────────────────────────────────
  it('listVendorBooks: returns only own books and respects status filter', async () => {
    const { data, meta } = await service.listVendorBooks(vendorUser.id, {
      page: 1,
      limit: 20,
      status: 'draft',
    });
    for (const book of data.books) {
      expect(book.status).toBe('draft');
    }
    expect(meta.pagination.total).toBeGreaterThan(0);
  });

  // ── Test 7: patchStatus sets publishedAt on first publish ────────────────────
  it('patchStatus: published sets publishedAt on first publish', async () => {
    const ebookFile = makeFakeEbookFile();
    const r = await service.createBook(
      vendorUser.id,
      { title: 'Status Patch Book', categoryId: category.id, price: 20000, authorName: 'Auth', status: 'draft' },
      { ebookFile: [ebookFile] },
    );
    expect((await Book.findByPk(r.id))!.publishedAt).toBeNull();

    await service.patchStatus(vendorUser.id, r.id, { status: 'published' });
    const updated = await Book.findByPk(r.id);
    expect(updated!.publishedAt).not.toBeNull();
  });

  // ── Test 8: delete → hidden (soft delete) ────────────────────────────────────
  it('deleteBook: sets status to hidden (soft delete)', async () => {
    const ebookFile = makeFakeEbookFile();
    const r = await service.createBook(
      vendorUser.id,
      { title: 'Book to Delete', categoryId: category.id, price: 20000, authorName: 'Auth', status: 'published' },
      { ebookFile: [ebookFile] },
    );

    await service.deleteBook(vendorUser.id, r.id);
    const book = await Book.findByPk(r.id);
    expect(book!.status).toBe('hidden');
  });

  // ── Test 9: bookFile version increments on PUT with new file ─────────────────
  it('updateBook: new ebookFile creates version+1 book_file record', async () => {
    const ebookFile1 = makeFakeEbookFile();
    const r = await service.createBook(
      vendorUser.id,
      { title: 'Version Test Book', categoryId: category.id, price: 20000, authorName: 'Auth', status: 'draft' },
      { ebookFile: [ebookFile1] },
    );

    const ebookFile2 = makeFakeEbookFile();
    await service.updateBook(vendorUser.id, r.id, {}, { ebookFile: [ebookFile2] });

    const files = await BookFile.findAll({ where: { bookId: r.id }, order: [['version', 'ASC']] });
    expect(files.length).toBe(2);
    expect(files[0].version).toBe(1);
    expect(files[1].version).toBe(2);
  });

  // ── Test 10: list returns only vendor's own books ─────────────────────────────
  it('listVendorBooks: does not return books from other vendors', async () => {
    const otherEbook = makeFakeEbookFile();
    const otherBookCat = await seedCategory();
    await service.createBook(
      otherVendor.id,
      { title: 'Other Vendor Book', categoryId: otherBookCat.id, price: 10000, authorName: 'Other', status: 'published' },
      { ebookFile: [otherEbook] },
    );

    const { data } = await service.listVendorBooks(vendorUser.id, { page: 1, limit: 100 });
    const ids = data.books.map((b: any) => b.id);

    // Get other vendor's book id
    const otherBooks = await Book.findAll({ where: { vendorUserId: otherVendor.id } });
    for (const ob of otherBooks) {
      expect(ids).not.toContain(ob.id);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('vendor-books routes (supertest)', () => {
  let vendorUser: User;
  let category: Category;
  let token: string;

  beforeAll(async () => {
    vendorUser = await seedVendor('route');
    category = await seedCategory();
    token = makeToken(vendorUser.id);
  });

  // ── Route test 1: POST creates book and returns 201 ──────────────────────────
  it('POST /api/v1/vendor/books: creates book with file', async () => {
    const res = await request(app)
      .post('/api/v1/vendor/books')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Route Test Book')
      .field('price', '50000')
      .field('categoryId', String(category.id))
      .field('authorName', 'Route Author')
      .field('status', 'published')
      .attach('ebookFile', TINY_PDF, { filename: 'test.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.status).toBe('published');
  });

  // ── Route test 2: FILE_TYPE_INVALID rejected ──────────────────────────────────
  it('POST /api/v1/vendor/books: rejects invalid file type', async () => {
    const res = await request(app)
      .post('/api/v1/vendor/books')
      .set('Authorization', `Bearer ${token}`)
      .field('title', 'Bad File Book')
      .field('price', '50000')
      .field('categoryId', String(category.id))
      .field('authorName', 'Route Author')
      .field('status', 'draft')
      .attach('ebookFile', Buffer.from('not a real file'), { filename: 'evil.exe', contentType: 'application/octet-stream' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_TYPE_INVALID');
  });

  // ── Route test 3: no auth → 401 ───────────────────────────────────────────────
  it('GET /api/v1/vendor/books: returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/vendor/books');
    expect(res.status).toBe(401);
  });

  // ── Route test 4: non-vendor role → 403 ──────────────────────────────────────
  it('GET /api/v1/vendor/books: returns 403 for non-vendor role', async () => {
    const userToken = makeToken(vendorUser.id, 'user');
    const res = await request(app)
      .get('/api/v1/vendor/books')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.status).toBe(403);
  });
});
