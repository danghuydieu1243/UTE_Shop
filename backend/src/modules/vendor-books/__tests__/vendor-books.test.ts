import os from 'os';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { createApp } from '../../../app';
import { User, Vendor, Category, Book, BookFile, Cart, CartItem, Wishlist } from '../../../db/models';
import { signAccessToken } from '../../auth/token.service';
import * as service from '../vendor-books.service';
import * as repo from '../vendor-books.repository';
import { enforceCoverSize } from '../../../shared/upload';
import * as cartCache from '../../../shared/cache/cartCache';

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
      { covers: [makeFakeCoverFile()], ebookFile: [ebookFile] },
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
      { covers: [makeFakeCoverFile()], ebookFile: [ebookFile] },
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
      { covers: [makeFakeCoverFile()], ebookFile: [ebookFile] },
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
      { covers: [makeFakeCoverFile()], ebookFile: [ebookFile1] },
    );
    const r2 = await service.createBook(
      vendorUser.id,
      { title: 'Slug Test Book', categoryId: category.id, price: 10000, authorName: 'Auth', status: 'draft' },
      { covers: [makeFakeCoverFile()], ebookFile: [ebookFile2] },
    );
    expect(r1.slug).not.toBe(r2.slug);
    expect(r2.slug).toMatch(/-2$/);
  });

  it('create: requires at least one cover image', async () => {
    await expect(
      service.createBook(
        vendorUser.id,
        {
          title: 'Book Missing Cover',
          categoryId: category.id,
          price: 15000,
          authorName: 'Auth',
          status: 'draft',
        },
        { ebookFile: [makeFakeEbookFile()] },
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  it('create: stores all uploaded cover images and uses first as coverImageUrl', async () => {
    const firstCover = makeFakeCoverFile();
    const secondCover = makeFakeCoverFile();

    const result = await service.createBook(
      vendorUser.id,
      {
        title: 'Multi Image Book',
        categoryId: category.id,
        price: 55000,
        authorName: 'Gallery Author',
        status: 'published',
      },
      {
        covers: [firstCover, secondCover],
        ebookFile: [makeFakeEbookFile()],
      },
    );

    const book = await service.getVendorBook(vendorUser.id, result.id);
    expect(book.coverImageUrl).toBe(`/uploads/covers/${path.basename(firstCover.path)}`);
    expect(book.images).toHaveLength(2);
    expect(book.images.map((img) => img.url)).toEqual([
      `/uploads/covers/${path.basename(firstCover.path)}`,
      `/uploads/covers/${path.basename(secondCover.path)}`,
    ]);
  });

  // ── Test 5: CATEGORY_NOT_FOUND ───────────────────────────────────────────────
  it('create: throws CATEGORY_NOT_FOUND for missing category', async () => {
    const ebookFile = makeFakeEbookFile();
    await expect(
      service.createBook(
        vendorUser.id,
        { title: 'No Cat Book', categoryId: 999999, price: 10000, authorName: 'Auth', status: 'draft' },
        { covers: [makeFakeCoverFile()], ebookFile: [ebookFile] },
      ),
    ).rejects.toMatchObject({ code: 'CATEGORY_NOT_FOUND' });
  });

  // ── Test 5b: publishYear/isbn round-trip + originalPrice update keeps when omitted ──
  it('create+update: publishYear/isbn persist and reload; originalPrice kept when omitted', async () => {
    const r = await service.createBook(
      vendorUser.id,
      {
        title: 'Metadata Book',
        categoryId: category.id,
        price: 60000,
        originalPrice: 90000,
        authorName: 'Meta Author',
        publishYear: 2021,
        isbn: '978-604-1-23456',
        status: 'draft',
      },
      { covers: [makeFakeCoverFile()], ebookFile: [makeFakeEbookFile()] },
    );

    const created = await service.getVendorBook(vendorUser.id, r.id);
    expect(created.publishYear).toBe(2021);
    expect(created.isbn).toBe('978-604-1-23456');
    expect(created.originalPrice).toBe(90000);

    // update publishYear/isbn; omit originalPrice → must keep prior value
    await service.updateBook(
      vendorUser.id,
      r.id,
      { publishYear: 2022, isbn: '978-604-1-99999' } as any,
      {},
    );

    const updated = await service.getVendorBook(vendorUser.id, r.id);
    expect(updated.publishYear).toBe(2022);
    expect(updated.isbn).toBe('978-604-1-99999');
    expect(updated.originalPrice).toBe(90000);
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

  it('listVendorBooks: shared q searches title, author, publisher, and isbn; title matches rank first', async () => {
    const searchCategory = await seedCategory();

    const titleMatch = await service.createBook(
      vendorUser.id,
      {
        title: 'Solar Archive',
        categoryId: searchCategory.id,
        price: 61000,
        authorName: 'Nguyen Van A',
        publisherName: 'Doc Sach',
        isbn: '111-AAA',
        status: 'published',
      },
      { covers: [makeFakeCoverFile()], ebookFile: [makeFakeEbookFile()] },
    );

    const authorMatch = await service.createBook(
      vendorUser.id,
      {
        title: 'Hidden Patterns',
        categoryId: searchCategory.id,
        price: 62000,
        authorName: 'Solar Writer',
        publisherName: 'Doc Sach',
        isbn: '222-BBB',
        status: 'published',
      },
      { covers: [makeFakeCoverFile()], ebookFile: [makeFakeEbookFile()] },
    );

    const publisherMatch = await service.createBook(
      vendorUser.id,
      {
        title: 'Quiet Signals',
        categoryId: searchCategory.id,
        price: 63000,
        authorName: 'Pham B',
        publisherName: 'Solar Press',
        isbn: '333-CCC',
        status: 'published',
      },
      { covers: [makeFakeCoverFile()], ebookFile: [makeFakeEbookFile()] },
    );

    const isbnMatch = await service.createBook(
      vendorUser.id,
      {
        title: 'Numeric Trails',
        categoryId: searchCategory.id,
        price: 64000,
        authorName: 'Le C',
        publisherName: 'Doc Sach',
        isbn: 'Solar-7788',
        status: 'published',
      },
      { covers: [makeFakeCoverFile()], ebookFile: [makeFakeEbookFile()] },
    );

    const { data } = await service.listVendorBooks(vendorUser.id, {
      page: 1,
      limit: 20,
      q: 'Solar',
    });

    const ids = data.books.map((b: any) => b.id);
    expect(ids).toEqual(expect.arrayContaining([
      titleMatch.id,
      authorMatch.id,
      publisherMatch.id,
      isbnMatch.id,
    ]));
    expect(ids[0]).toBe(titleMatch.id);
  });

  it('listVendorBooks: supports categoryId and format filters for narrowing quick search results', async () => {
    const uniqueSuffix = Date.now();
    const pdfCategory = await Category.create({ name: 'PDF Cat', slug: `pdf-cat-${uniqueSuffix}`, sortOrder: 1 });
    const epubCategory = await Category.create({ name: 'EPUB Cat', slug: `epub-cat-${uniqueSuffix}`, sortOrder: 2 });

    const pdfBook = await service.createBook(
      vendorUser.id,
      {
        title: 'Filter Me PDF',
        categoryId: pdfCategory.id,
        price: 45000,
        authorName: 'Loc Nguyen',
        publisherName: 'Narrow House',
        status: 'published',
      },
      { covers: [makeFakeCoverFile()], ebookFile: [makeFakeEbookFile('application/pdf')] },
    );

    await service.createBook(
      vendorUser.id,
      {
        title: 'Filter Me EPUB',
        categoryId: epubCategory.id,
        price: 46000,
        authorName: 'Loc Nguyen',
        publisherName: 'Narrow House',
        status: 'published',
      },
      { covers: [makeFakeCoverFile()], ebookFile: [makeFakeEbookFile('application/epub+zip')] },
    );

    const { data } = await service.listVendorBooks(vendorUser.id, {
      page: 1,
      limit: 20,
      q: 'Filter Me',
      categoryId: pdfCategory.id,
      format: 'PDF',
    } as any);

    expect(data.books.map((b: any) => b.id)).toEqual([pdfBook.id]);
    expect(data.books[0]).toMatchObject({
      fileFormat: 'PDF',
      categoryId: pdfCategory.id,
      publisher: 'Narrow House',
    });
  });

  it('listVendorBooks: supports title, price, sold, and status sorting for vendor table columns', async () => {
    const sortCategory = await seedCategory();

    const zebra = await service.createBook(
      vendorUser.id,
      {
        title: 'Zebra Notes',
        categoryId: sortCategory.id,
        price: 99000,
        authorName: 'Sort Author',
        status: 'draft',
      },
      { covers: [makeFakeCoverFile()], ebookFile: [makeFakeEbookFile()] },
    );

    const alpha = await service.createBook(
      vendorUser.id,
      {
        title: 'Alpha Notes',
        categoryId: sortCategory.id,
        price: 45000,
        authorName: 'Sort Author',
        status: 'published',
      },
      { covers: [makeFakeCoverFile()], ebookFile: [makeFakeEbookFile()] },
    );

    const hidden = await service.createBook(
      vendorUser.id,
      {
        title: 'Hidden Notes',
        categoryId: sortCategory.id,
        price: 70000,
        authorName: 'Sort Author',
        status: 'draft',
      },
      { covers: [makeFakeCoverFile()], ebookFile: [makeFakeEbookFile()] },
    );
    await service.patchStatus(vendorUser.id, hidden.id, { status: 'hidden' });

    await Book.update({ purchaseCount: 15 }, { where: { id: zebra.id } });
    await Book.update({ purchaseCount: 2 }, { where: { id: alpha.id } });
    await Book.update({ purchaseCount: 8 }, { where: { id: hidden.id } });

    const titleSorted = await service.listVendorBooks(vendorUser.id, { page: 1, limit: 50, q: 'Notes', sort: 'titleAsc' } as any);
    expect(titleSorted.data.books.findIndex((b: any) => b.id === alpha.id))
      .toBeLessThan(titleSorted.data.books.findIndex((b: any) => b.id === zebra.id));

    const priceSorted = await service.listVendorBooks(vendorUser.id, { page: 1, limit: 50, q: 'Notes', sort: 'priceDesc' } as any);
    expect(priceSorted.data.books.findIndex((b: any) => b.id === zebra.id))
      .toBeLessThan(priceSorted.data.books.findIndex((b: any) => b.id === alpha.id));

    const soldSorted = await service.listVendorBooks(vendorUser.id, { page: 1, limit: 50, q: 'Notes', sort: 'soldDesc' } as any);
    expect(soldSorted.data.books.findIndex((b: any) => b.id === zebra.id))
      .toBeLessThan(soldSorted.data.books.findIndex((b: any) => b.id === hidden.id));

    const statusSorted = await service.listVendorBooks(vendorUser.id, { page: 1, limit: 50, q: 'Notes', sort: 'statusAsc' } as any);
    expect(statusSorted.data.books.findIndex((b: any) => b.id === alpha.id))
      .toBeLessThan(statusSorted.data.books.findIndex((b: any) => b.id === hidden.id));
  });

  // ── Test 7: patchStatus sets publishedAt on first publish ────────────────────
  it('patchStatus: published sets publishedAt on first publish', async () => {
    const ebookFile = makeFakeEbookFile();
    const r = await service.createBook(
      vendorUser.id,
      { title: 'Status Patch Book', categoryId: category.id, price: 20000, authorName: 'Auth', status: 'draft' },
      { covers: [makeFakeCoverFile()], ebookFile: [ebookFile] },
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
      { covers: [makeFakeCoverFile()], ebookFile: [ebookFile] },
    );

    await service.deleteBook(vendorUser.id, r.id);
    const book = await Book.findByPk(r.id);
    expect(book!.status).toBe('hidden');
  });

  it('deleteBook: removes hidden book from user carts and wishlists automatically', async () => {
    const buyer = await User.create({
      email: `buyer-${Date.now()}@test.com`,
      passwordHash: 'hash',
      role: 'user',
      fullName: 'Buyer Test',
      status: 'active',
    });

    const cart = await Cart.create({ userId: buyer.id });
    const created = await service.createBook(
      vendorUser.id,
      {
        title: 'Cleanup Me',
        categoryId: category.id,
        price: 33000,
        authorName: 'Cleanup Author',
        status: 'published',
      },
      {
        covers: [makeFakeCoverFile()],
        ebookFile: [makeFakeEbookFile()],
      },
    );

    await CartItem.create({ cartId: cart.id, bookId: created.id, unitPrice: 33000 });
    await Wishlist.create({ userId: buyer.id, bookId: created.id });

    expect(await CartItem.count({ where: { bookId: created.id } })).toBe(1);
    expect(await Wishlist.count({ where: { bookId: created.id } })).toBe(1);

    await service.deleteBook(vendorUser.id, created.id);

    expect((await Book.findByPk(created.id))!.status).toBe('hidden');
    expect(await CartItem.count({ where: { bookId: created.id } })).toBe(0);
    expect(await Wishlist.count({ where: { bookId: created.id } })).toBe(0);
  });

  it('deleteBook: invalidates cart cache for every affected buyer cart', async () => {
    const buyer = await User.create({
      email: `buyer-cache-${Date.now()}@test.com`,
      passwordHash: 'hash',
      role: 'user',
      fullName: 'Buyer Cache Test',
      status: 'active',
    });

    const otherBuyer = await User.create({
      email: `buyer-cache-2-${Date.now()}@test.com`,
      passwordHash: 'hash',
      role: 'user',
      fullName: 'Buyer Cache Test 2',
      status: 'active',
    });

    const buyerCart = await Cart.create({ userId: buyer.id });
    const otherCart = await Cart.create({ userId: otherBuyer.id });
    const delCartSpy = jest.spyOn(cartCache, 'delCart').mockResolvedValue();

    const created = await service.createBook(
      vendorUser.id,
      {
        title: 'Cleanup Buyer Cache',
        categoryId: category.id,
        price: 36000,
        authorName: 'Cleanup Cache Author',
        status: 'published',
      },
      {
        covers: [makeFakeCoverFile()],
        ebookFile: [makeFakeEbookFile()],
      },
    );

    await CartItem.create({ cartId: buyerCart.id, bookId: created.id, unitPrice: 36000 });
    await CartItem.create({ cartId: otherCart.id, bookId: created.id, unitPrice: 36000 });

    await service.deleteBook(vendorUser.id, created.id);

    expect(delCartSpy).toHaveBeenCalledWith(Number(buyer.id));
    expect(delCartSpy).toHaveBeenCalledWith(Number(otherBuyer.id));
    expect(delCartSpy).toHaveBeenCalledTimes(2);

    delCartSpy.mockRestore();
  });

  // ── Test 9: bookFile version increments on PUT with new file ─────────────────
  it('updateBook: new ebookFile creates version+1 book_file record', async () => {
    const ebookFile1 = makeFakeEbookFile();
    const r = await service.createBook(
      vendorUser.id,
      { title: 'Version Test Book', categoryId: category.id, price: 20000, authorName: 'Auth', status: 'draft' },
      { covers: [makeFakeCoverFile()], ebookFile: [ebookFile1] },
    );

    const ebookFile2 = makeFakeEbookFile();
    await service.updateBook(vendorUser.id, r.id, {}, { ebookFile: [ebookFile2] });

    const files = await BookFile.findAll({ where: { bookId: r.id }, order: [['version', 'ASC']] });
    expect(files.length).toBe(2);
    expect(files[0].version).toBe(1);
    expect(files[1].version).toBe(2);
  });

  it('updateBook: preserves retained images and appends new uploaded images', async () => {
    const initialCover = makeFakeCoverFile();
    const created = await service.createBook(
      vendorUser.id,
      {
        title: 'Append Images Book',
        categoryId: category.id,
        price: 25000,
        authorName: 'Auth',
        status: 'draft',
      },
      {
        covers: [initialCover],
        ebookFile: [makeFakeEbookFile()],
      },
    );

    const secondCover = makeFakeCoverFile();
    await service.updateBook(
      vendorUser.id,
      created.id,
      { existingImageUrls: [`/uploads/covers/${path.basename(initialCover.path)}`] } as any,
      { covers: [secondCover] },
    );

    const updated = await service.getVendorBook(vendorUser.id, created.id);
    expect(updated.coverImageUrl).toBe(`/uploads/covers/${path.basename(initialCover.path)}`);
    expect(updated.images.map((img) => img.url)).toEqual([
      `/uploads/covers/${path.basename(initialCover.path)}`,
      `/uploads/covers/${path.basename(secondCover.path)}`,
    ]);
  });

  it('updateBook: rejects removing the final remaining cover image', async () => {
    const created = await service.createBook(
      vendorUser.id,
      {
        title: 'Cannot Remove Last Cover',
        categoryId: category.id,
        price: 25000,
        authorName: 'Auth',
        status: 'draft',
      },
      {
        covers: [makeFakeCoverFile()],
        ebookFile: [makeFakeEbookFile()],
      },
    );

    await expect(
      service.updateBook(
        vendorUser.id,
        created.id,
        { existingImageUrls: [] } as any,
        {},
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });

  // ── Test 10: list returns only vendor's own books ─────────────────────────────
  it('listVendorBooks: does not return books from other vendors', async () => {
    const otherEbook = makeFakeEbookFile();
    const otherBookCat = await seedCategory();
    await service.createBook(
      otherVendor.id,
      { title: 'Other Vendor Book', categoryId: otherBookCat.id, price: 10000, authorName: 'Other', status: 'published' },
      { covers: [makeFakeCoverFile()], ebookFile: [otherEbook] },
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
      .attach('covers', TINY_PNG, { filename: 'cover.png', contentType: 'image/png' })
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

// ─────────────────────────────────────────────────────────────────────────────
describe('enforceCoverSize middleware', () => {
  const COVER_SIZE_LIMIT = 5 * 1024 * 1024; // 5MB

  function makeReq(coverSize: number, ebookPath?: string) {
    const coverPath = path.join(TEMP_UPLOAD_DIR, 'covers', `cover-${Date.now()}.png`);
    fs.mkdirSync(path.dirname(coverPath), { recursive: true });
    fs.writeFileSync(coverPath, TINY_PNG);

    const files: Record<string, Express.Multer.File[]> = {
      covers: [
        {
          fieldname: 'covers',
          originalname: 'cover.png',
          encoding: '7bit',
          mimetype: 'image/png',
          size: coverSize,
          destination: path.dirname(coverPath),
          filename: path.basename(coverPath),
          path: coverPath,
          buffer: TINY_PNG,
          stream: null as any,
        },
      ],
    };

    if (ebookPath) {
      files['ebookFile'] = [
        {
          fieldname: 'ebookFile',
          originalname: 'book.pdf',
          encoding: '7bit',
          mimetype: 'application/pdf',
          size: 100,
          destination: path.dirname(ebookPath),
          filename: path.basename(ebookPath),
          path: ebookPath,
          buffer: TINY_PDF,
          stream: null as any,
        },
      ];
    }

    return { files } as any;
  }

  // ── M3: cover > 5MB → FILE_TOO_LARGE AppError ────────────────────────────────
  it('rejects cover > 5MB with FILE_TOO_LARGE and deletes saved ebook file', (done) => {
    const ebookPath = path.join(TEMP_UPLOAD_DIR, 'private', `ebook-${Date.now()}.pdf`);
    fs.mkdirSync(path.dirname(ebookPath), { recursive: true });
    fs.writeFileSync(ebookPath, TINY_PDF);

    const oversizedCoverSize = COVER_SIZE_LIMIT + 1;
    const req = makeReq(oversizedCoverSize, ebookPath);
    const res = {} as any;

    enforceCoverSize(req, res, (err: any) => {
      expect(err).toBeDefined();
      expect(err.code).toBe('FILE_TOO_LARGE');
      expect(err.status).toBe(400);
      // ebook file should have been deleted as part of atomic cleanup
      expect(fs.existsSync(ebookPath)).toBe(false);
      done();
    });
  });

  // ── cover exactly at limit is OK ─────────────────────────────────────────────
  it('allows cover exactly at 5MB limit', (done) => {
    const req = makeReq(COVER_SIZE_LIMIT);
    const res = {} as any;

    enforceCoverSize(req, res, (err: any) => {
      expect(err).toBeUndefined();
      done();
    });
  });
});
