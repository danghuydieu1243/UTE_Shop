import request from 'supertest';
import { createApp } from '../../../app';
import { User, Vendor, Book, Wishlist, Entitlement, Order } from '../../../db/models';
import { signAccessToken } from '../../auth/token.service';

const app = createApp();

// ── Seed helpers ─────────────────────────────────────────────────────────────

async function seedUser(role: 'user' | 'vendor' | 'admin' = 'user', suffix = '') {
  return User.create({
    email: `wishlist-${role}${suffix}${Date.now()}@test.com`,
    passwordHash: 'hash',
    role,
    fullName: `Test ${role}`,
    status: 'active',
  });
}

async function seedBook(
  vendorUserId: number,
  opts: { status?: string; price?: number } = {},
): Promise<Book> {
  const slug = `wl-book-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return Book.create({
    vendorUserId,
    title: 'Sách Wishlist Test',
    slug,
    price: opts.price ?? 89000,
    fileFormat: 'PDF',
    status: opts.status ?? 'published',
  });
}

function makeToken(userId: number, role = 'user') {
  return signAccessToken({ id: userId, role });
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('Wishlist API', () => {
  let userA: User;
  let vendorUser: User;
  let publishedBook: Book;
  let draftBook: Book;
  let tokenA: string;
  let tokenV: string;

  beforeAll(async () => {
    userA = await seedUser('user', 'wla');
    vendorUser = await seedUser('vendor', 'wlv');
    await Vendor.create({
      userId: vendorUser.id,
      shopName: 'WL Shop',
      shopSlug: `wl-shop-${Date.now()}`,
    });

    publishedBook = await seedBook(vendorUser.id, { price: 79000 });
    draftBook = await seedBook(vendorUser.id, { status: 'draft' });

    tokenA = makeToken(userA.id, 'user');
    tokenV = makeToken(vendorUser.id, 'vendor');
  });

  // ── 1. POST /me/wishlist — thêm sách OK ──────────────────────────────────

  describe('POST /api/v1/me/wishlist', () => {
    it('1. thêm sách published vào wishlist → 201 + item trả về (cùng shape với list item)', async () => {
      const res = await request(app)
        .post('/api/v1/me/wishlist')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ bookId: publishedBook.id });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const d = res.body.data;
      expect(d.bookId).toBe(publishedBook.id);
      // add response phải trả cùng shape với list item (bao gồm wishlistId)
      expect(typeof d.wishlistId).toBe('number');
      expect(d).toHaveProperty('addedAt');
      expect(d).toHaveProperty('book');
      expect(d.book).toHaveProperty('id');

      // Kiểm tra DB thực sự có 1 row
      const rows = await Wishlist.count({ where: { userId: userA.id, bookId: publishedBook.id } });
      expect(rows).toBe(1);
    });

    it('2. thêm trùng sách đã có trong wishlist → idempotent, vẫn 1 row, trả 201', async () => {
      // Thêm lần 2 cùng sách
      const res = await request(app)
        .post('/api/v1/me/wishlist')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ bookId: publishedBook.id });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);

      // Chỉ 1 row trong DB
      const rows = await Wishlist.count({ where: { userId: userA.id, bookId: publishedBook.id } });
      expect(rows).toBe(1);
    });

    it('3. thêm sách draft → 409 BOOK_NOT_PUBLISHED', async () => {
      const res = await request(app)
        .post('/api/v1/me/wishlist')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ bookId: draftBook.id });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('BOOK_NOT_PUBLISHED');
    });

    it('3b. thêm sách đã sở hữu → 409 ALREADY_OWNED', async () => {
      const owner = await seedUser('user', 'wl-owned');
      const token = makeToken(owner.id, 'user');
      const ownedBook = await seedBook(vendorUser.id, { price: 99000 });
      const order = await Order.create({
        userId: owner.id,
        code: `ATH-WL-${Date.now()}`,
        status: 'COMPLETED',
        subtotal: 99000,
        total: 99000,
        currency: 'VND',
        completedAt: new Date(),
      });
      await Entitlement.create({
        userId: owner.id,
        bookId: Number(ownedBook.id),
        orderId: Number(order.id),
        grantedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/v1/me/wishlist')
        .set('Authorization', `Bearer ${token}`)
        .send({ bookId: ownedBook.id });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_OWNED');

      // Không tạo row wishlist
      const rows = await Wishlist.count({ where: { userId: owner.id, bookId: ownedBook.id } });
      expect(rows).toBe(0);
    });
  });

  // ── 4. DELETE /me/wishlist/:bookId ───────────────────────────────────────

  describe('DELETE /api/v1/me/wishlist/:bookId', () => {
    it('4. xóa sách khỏi wishlist → 200 idempotent', async () => {
      const res = await request(app)
        .delete(`/api/v1/me/wishlist/${publishedBook.id}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // DB phải không còn row
      const rows = await Wishlist.count({ where: { userId: userA.id, bookId: publishedBook.id } });
      expect(rows).toBe(0);
    });

    it('5. xóa sách không tồn tại trong wishlist → idempotent 200', async () => {
      const res = await request(app)
        .delete(`/api/v1/me/wishlist/${publishedBook.id}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ── 6. GET /me/wishlist — list + pagination ───────────────────────────────

  describe('GET /api/v1/me/wishlist', () => {
    it('6. list trả sách đã lưu + pagination meta', async () => {
      // Tạo user mới để test riêng (tránh ảnh hưởng bởi test trên đã xóa)
      const userB = await seedUser('user', 'wlb');
      const tokenB = makeToken(userB.id, 'user');
      const book1 = await seedBook(vendorUser.id, { price: 45000 });
      const book2 = await seedBook(vendorUser.id, { price: 55000 });

      await request(app)
        .post('/api/v1/me/wishlist')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ bookId: book1.id });
      await request(app)
        .post('/api/v1/me/wishlist')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ bookId: book2.id });

      const res = await request(app)
        .get('/api/v1/me/wishlist')
        .set('Authorization', `Bearer ${tokenB}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const items = res.body.data;
      expect(Array.isArray(items)).toBe(true);
      expect(items).toHaveLength(2);

      // Kiểm tra DTO fields — item có nested book với các fields theo brief
      const item = items[0];
      expect(item).toHaveProperty('bookId');
      expect(item).toHaveProperty('book');
      expect(item.book).toHaveProperty('id');
      expect(item.book).toHaveProperty('slug');
      expect(item.book).toHaveProperty('title');
      expect(item.book).toHaveProperty('coverImageUrl');
      expect(item.book).toHaveProperty('price');
      expect(item.book).toHaveProperty('ratingAvg');

      // Kiểm tra pagination meta
      const meta = res.body.meta?.pagination;
      expect(meta).toBeDefined();
      expect(meta.total).toBe(2);
      expect(meta.page).toBe(1);
      expect(meta.totalPages).toBe(1);
    });
  });

  // ── 8. DELETE /me/wishlist — clear all ───────────────────────────────────

  describe('DELETE /api/v1/me/wishlist (clear all)', () => {
    it('8. seed 2 items, clear-all → 200 + 0 rows trong DB', async () => {
      const userC = await seedUser('user', 'wlc');
      const tokenC = makeToken(userC.id, 'user');
      const book1 = await seedBook(vendorUser.id);
      const book2 = await seedBook(vendorUser.id);

      // Seed 2 items
      await request(app)
        .post('/api/v1/me/wishlist')
        .set('Authorization', `Bearer ${tokenC}`)
        .send({ bookId: book1.id });
      await request(app)
        .post('/api/v1/me/wishlist')
        .set('Authorization', `Bearer ${tokenC}`)
        .send({ bookId: book2.id });

      // Kiểm tra có 2 row trước khi clear
      const beforeCount = await Wishlist.count({ where: { userId: userC.id } });
      expect(beforeCount).toBe(2);

      // Clear all
      const res = await request(app)
        .delete('/api/v1/me/wishlist')
        .set('Authorization', `Bearer ${tokenC}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cleared).toBe(true);

      // DB phải có 0 row
      const afterCount = await Wishlist.count({ where: { userId: userC.id } });
      expect(afterCount).toBe(0);
    });

    it('8b. clear-all trên wishlist rỗng → idempotent 200', async () => {
      const userD = await seedUser('user', 'wld');
      const tokenD = makeToken(userD.id, 'user');

      const res = await request(app)
        .delete('/api/v1/me/wishlist')
        .set('Authorization', `Bearer ${tokenD}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('8c. DELETE /:bookId vẫn còn hoạt động sau khi thêm route clear-all', async () => {
      const userE = await seedUser('user', 'wle');
      const tokenE = makeToken(userE.id, 'user');
      const book = await seedBook(vendorUser.id);

      await request(app)
        .post('/api/v1/me/wishlist')
        .set('Authorization', `Bearer ${tokenE}`)
        .send({ bookId: book.id });

      const res = await request(app)
        .delete(`/api/v1/me/wishlist/${book.id}`)
        .set('Authorization', `Bearer ${tokenE}`);
      expect(res.status).toBe(200);
      expect(res.body.data.removed).toBe(true);

      const count = await Wishlist.count({ where: { userId: userE.id, bookId: book.id } });
      expect(count).toBe(0);
    });
  });

  // ── 7. RBAC: vendor bị 403 ───────────────────────────────────────────────

  describe('RBAC', () => {
    it('7. vendor gọi GET /me/wishlist → 403', async () => {
      const res = await request(app)
        .get('/api/v1/me/wishlist')
        .set('Authorization', `Bearer ${tokenV}`);
      expect(res.status).toBe(403);
    });

    it('7b. vendor gọi POST /me/wishlist → 403', async () => {
      const res = await request(app)
        .post('/api/v1/me/wishlist')
        .set('Authorization', `Bearer ${tokenV}`)
        .send({ bookId: publishedBook.id });
      expect(res.status).toBe(403);
    });

    it('7c. không có token → 401', async () => {
      const res = await request(app).get('/api/v1/me/wishlist');
      expect(res.status).toBe(401);
    });
  });
});
