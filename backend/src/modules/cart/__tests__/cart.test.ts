import request from 'supertest';
import { createApp } from '../../../app';
import { User, Vendor, Author, Book, Cart, CartItem, Entitlement, Order } from '../../../db/models';
import { signAccessToken } from '../../auth/token.service';

const app = createApp();

// ── Seed helpers ─────────────────────────────────────────────────────────────

async function seedUser(role: 'user' | 'vendor' | 'admin' = 'user', suffix = '') {
  return User.create({
    email: `${role}${suffix}${Date.now()}@test.com`,
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
  const slug = `test-book-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return Book.create({
    vendorUserId,
    title: 'Sách Test',
    slug,
    price: opts.price ?? 99000,
    fileFormat: 'PDF',
    status: opts.status ?? 'published',
  });
}

function makeToken(userId: number, role = 'user') {
  return signAccessToken({ id: userId, role });
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('Cart API', () => {
  let userA: User;
  let vendorUser: User;
  let publishedBook: Book;
  let draftBook: Book;
  let tokenA: string;

  beforeAll(async () => {
    userA = await seedUser('user', 'a');
    vendorUser = await seedUser('vendor', 'v');
    await Vendor.create({ userId: vendorUser.id, shopName: 'Shop', shopSlug: `shop-${Date.now()}` });

    publishedBook = await seedBook(vendorUser.id, { price: 79000 });
    draftBook = await seedBook(vendorUser.id, { status: 'draft' });

    tokenA = makeToken(userA.id, 'user');
  });

  // ── 1. GET /cart — giỏ rỗng ban đầu ──────────────────────────────────────

  describe('GET /api/v1/cart', () => {
    it('1. trả về giỏ rỗng khi user chưa có cart', async () => {
      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      const d = res.body.data;
      expect(d.items).toEqual([]);
      expect(d.subtotal).toBe(0);
      expect(d.itemCount).toBe(0);
      expect(d.currency).toBe('VND');
    });
  });

  // ── 2. POST /cart/items — thêm sách OK ────────────────────────────────────

  describe('POST /api/v1/cart/items', () => {
    it('2. thêm sách published vào giỏ → 201 + giỏ đầy đủ', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ bookId: publishedBook.id });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const d = res.body.data;
      expect(d.items).toHaveLength(1);
      expect(d.items[0].book.id).toBe(publishedBook.id);
      expect(d.items[0].unitPrice).toBe(79000);
      expect(d.subtotal).toBe(79000);
      expect(d.itemCount).toBe(1);
      expect(d.currency).toBe('VND');
    });

    it('3. thêm trùng sách đã có trong giỏ → idempotent, vẫn 1 item', async () => {
      // Thêm lần 2 cùng sách
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ bookId: publishedBook.id });
      expect(res.status).toBe(201);
      const d = res.body.data;
      expect(d.items).toHaveLength(1);
    });

    it('4. thêm sách draft → 409 BOOK_NOT_PUBLISHED', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ bookId: draftBook.id });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('BOOK_NOT_PUBLISHED');
    });

    it('5. thêm sách không tồn tại → 404 BOOK_NOT_FOUND', async () => {
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ bookId: 999999 });
      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('BOOK_NOT_FOUND');
    });

    it('6. user đã có entitlement → 409 ALREADY_OWNED', async () => {
      // Tạo user mới để test riêng
      const userB = await seedUser('user', 'b');
      const tokenB = makeToken(userB.id, 'user');
      const bookForEntitlement = await seedBook(vendorUser.id, { price: 50000 });

      // Tạo fake order để gắn entitlement
      const fakeOrder = await Order.create({
        userId: userB.id,
        code: `ORD-TEST-${Date.now()}`,
        status: 'COMPLETED',
        subtotal: 50000,
        total: 50000,
        currency: 'VND',
        completedAt: new Date(),
      });
      await Entitlement.create({
        userId: userB.id,
        bookId: bookForEntitlement.id,
        orderId: fakeOrder.id,
        grantedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ bookId: bookForEntitlement.id });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ALREADY_OWNED');
    });
  });

  // ── 7. DELETE /cart/items/:bookId ─────────────────────────────────────────

  describe('DELETE /api/v1/cart/items/:bookId', () => {
    it('7. xóa item khỏi giỏ → 200 + giỏ không còn item đó', async () => {
      // Chắc chắn item đang có (từ test 2 — vẫn còn)
      const res = await request(app)
        .delete(`/api/v1/cart/items/${publishedBook.id}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      const d = res.body.data;
      expect(d.items).toHaveLength(0);
      expect(d.subtotal).toBe(0);
      expect(d.itemCount).toBe(0);
    });

    it('7b. xóa item không tồn tại trong giỏ → idempotent 200', async () => {
      const res = await request(app)
        .delete(`/api/v1/cart/items/${publishedBook.id}`)
        .set('Authorization', `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(0);
    });
  });

  // ── 8. GET /cart subtotal/itemCount đúng ─────────────────────────────────

  describe('subtotal và itemCount chính xác', () => {
    it('8. getCart trả subtotal và itemCount đúng khi có nhiều sách', async () => {
      const userC = await seedUser('user', 'c');
      const tokenC = makeToken(userC.id, 'user');
      const book1 = await seedBook(vendorUser.id, { price: 45000 });
      const book2 = await seedBook(vendorUser.id, { price: 55000 });

      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${tokenC}`)
        .send({ bookId: book1.id });
      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${tokenC}`)
        .send({ bookId: book2.id });

      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${tokenC}`);
      expect(res.status).toBe(200);
      const d = res.body.data;
      expect(d.itemCount).toBe(2);
      expect(d.subtotal).toBe(100000);
    });
  });

  // ── 9. DELETE /cart — xóa sạch ────────────────────────────────────────────

  describe('DELETE /api/v1/cart', () => {
    it('9. xóa sạch giỏ → 200 + giỏ rỗng', async () => {
      const userD = await seedUser('user', 'd');
      const tokenD = makeToken(userD.id, 'user');
      const book3 = await seedBook(vendorUser.id, { price: 30000 });

      await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${tokenD}`)
        .send({ bookId: book3.id });

      const res = await request(app)
        .delete('/api/v1/cart')
        .set('Authorization', `Bearer ${tokenD}`);
      expect(res.status).toBe(200);
      const d = res.body.data;
      expect(d.items).toEqual([]);
      expect(d.subtotal).toBe(0);
      expect(d.itemCount).toBe(0);
    });
  });

  // ── 10. RBAC: vendor bị 403 ───────────────────────────────────────────────

  describe('RBAC', () => {
    it('10. vendor gọi GET /cart → 403', async () => {
      const tokenV = makeToken(vendorUser.id, 'vendor');
      const res = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${tokenV}`);
      expect(res.status).toBe(403);
    });

    it('10b. vendor gọi POST /cart/items → 403', async () => {
      const tokenV = makeToken(vendorUser.id, 'vendor');
      const res = await request(app)
        .post('/api/v1/cart/items')
        .set('Authorization', `Bearer ${tokenV}`)
        .send({ bookId: publishedBook.id });
      expect(res.status).toBe(403);
    });

    it('10c. không có token → 401', async () => {
      const res = await request(app).get('/api/v1/cart');
      expect(res.status).toBe(401);
    });
  });
});
