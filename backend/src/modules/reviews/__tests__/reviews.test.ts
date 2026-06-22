import request from 'supertest';
import { createApp } from '../../../app';
import {
  User,
  Vendor,
  Book,
  Order,
  OrderItem,
  Review,
  LoyaltyAccount,
} from '../../../db/models';
import { signAccessToken } from '../../auth/token.service';

const app = createApp();

// ── Seed helpers ─────────────────────────────────────────────────────────────

let _suffix = 0;
function uniq(prefix: string) {
  return `${prefix}-${Date.now()}-${++_suffix}`;
}

async function seedUser(role: 'user' | 'vendor' | 'admin' = 'user', label = '') {
  return User.create({
    email: `${uniq('rv-' + role + label)}@test.com`,
    passwordHash: 'hash',
    role,
    fullName: `Test ${role} ${label}`,
    status: 'active',
  });
}

async function seedBook(vendorUserId: number): Promise<Book> {
  return Book.create({
    vendorUserId,
    title: `Sách Review Test ${uniq('b')}`,
    slug: uniq('rv-slug'),
    price: 79000,
    fileFormat: 'PDF',
    status: 'published',
  });
}

async function seedCompletedOrder(userId: number, bookId: number): Promise<Order> {
  const code = uniq('ATH');
  const order = await Order.create({
    userId,
    code,
    status: 'COMPLETED',
    subtotal: 79000,
    total: 79000,
    currency: 'VND',
  });
  await OrderItem.create({
    orderId: Number(order.id),
    bookId,
    vendorUserId: 1,             // not checked by reviews service
    titleSnapshot: 'snap',
    unitPrice: 79000,
  });
  return order;
}

function makeToken(userId: number, role = 'user') {
  return signAccessToken({ id: userId, role });
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('Reviews API', () => {
  let userA: User;
  let vendorUser: User;
  let vendorUser2: User;
  let bookA: Book;
  let tokenA: string;
  let tokenV: string;
  let tokenV2: string;

  beforeAll(async () => {
    vendorUser = await seedUser('vendor', 'rv-v1');
    await Vendor.create({
      userId: vendorUser.id,
      shopName: `RV Shop ${Date.now()}`,
      shopSlug: uniq('rv-shop'),
    });

    vendorUser2 = await seedUser('vendor', 'rv-v2');
    await Vendor.create({
      userId: vendorUser2.id,
      shopName: `RV Shop2 ${Date.now()}`,
      shopSlug: uniq('rv-shop2'),
    });

    userA = await seedUser('user', 'rv-ua');
    bookA = await seedBook(vendorUser.id);

    tokenA = makeToken(userA.id, 'user');
    tokenV = makeToken(vendorUser.id, 'vendor');
    tokenV2 = makeToken(vendorUser2.id, 'vendor');
  });

  // ── 1. create review with COMPLETED order → OK + loyalty + rating ─────────

  describe('POST /api/v1/me/reviews', () => {
    it('1. create review khi có đơn COMPLETED → 201 + balance +50 + rating_avg/count cập nhật', async () => {
      const userB = await seedUser('user', 'rv-ub1');
      const book = await seedBook(vendorUser.id);
      await seedCompletedOrder(userB.id, book.id);
      const tokenB = makeToken(userB.id, 'user');

      const res = await request(app)
        .post('/api/v1/me/reviews')
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ bookId: book.id, rating: 4, comment: 'Hay lắm!' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const d = res.body.data;
      expect(d.rating).toBe(4);
      expect(d.comment).toBe('Hay lắm!');

      // Assert DB: LoyaltyAccount balance == 50
      const account = await LoyaltyAccount.findOne({ where: { userId: userB.id } });
      expect(account).not.toBeNull();
      expect(Number(account!.balancePoints)).toBe(50);

      // Assert DB: Book rating updated
      const updatedBook = await Book.findByPk(book.id);
      expect(Number(updatedBook!.ratingCount)).toBe(1);
      expect(Number(updatedBook!.ratingAvg)).toBe(4);
    });

    // ── 2. create when user never purchased → REVIEW_NOT_ALLOWED ─────────────

    it('2. create khi chưa mua sách → 403 REVIEW_NOT_ALLOWED', async () => {
      const userNoBuy = await seedUser('user', 'rv-nobuy');
      const tokenNoBuy = makeToken(userNoBuy.id, 'user');

      const res = await request(app)
        .post('/api/v1/me/reviews')
        .set('Authorization', `Bearer ${tokenNoBuy}`)
        .send({ bookId: bookA.id, rating: 3 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('REVIEW_NOT_ALLOWED');
    });

    // ── 3. order status NEW (not COMPLETED) → REVIEW_NOT_ALLOWED ─────────────

    it('3. create khi đơn hàng còn NEW (chưa hoàn thành) → 403 REVIEW_NOT_ALLOWED', async () => {
      const userNew = await seedUser('user', 'rv-new-ord');
      const book = await seedBook(vendorUser.id);
      // Create order with status NEW (not COMPLETED)
      const code = uniq('ATH-NEW');
      const order = await Order.create({
        userId: userNew.id,
        code,
        status: 'NEW',
        subtotal: 79000,
        total: 79000,
        currency: 'VND',
      });
      await OrderItem.create({
        orderId: Number(order.id),
        bookId: book.id,
        vendorUserId: vendorUser.id,
        titleSnapshot: 'snap',
        unitPrice: 79000,
      });

      const tokenNew = makeToken(userNew.id, 'user');
      const res = await request(app)
        .post('/api/v1/me/reviews')
        .set('Authorization', `Bearer ${tokenNew}`)
        .send({ bookId: book.id, rating: 3 });

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('REVIEW_NOT_ALLOWED');
    });

    // ── 4. duplicate review → REVIEW_DUPLICATE + balance NOT increased again ──

    it('4. create trùng (same user+book) → 409 REVIEW_DUPLICATE + balance vẫn là 50', async () => {
      const userDup = await seedUser('user', 'rv-dup');
      const book = await seedBook(vendorUser.id);
      await seedCompletedOrder(userDup.id, book.id);
      const tokenDup = makeToken(userDup.id, 'user');

      // First review
      await request(app)
        .post('/api/v1/me/reviews')
        .set('Authorization', `Bearer ${tokenDup}`)
        .send({ bookId: book.id, rating: 5 });

      // Second review (duplicate)
      const res = await request(app)
        .post('/api/v1/me/reviews')
        .set('Authorization', `Bearer ${tokenDup}`)
        .send({ bookId: book.id, rating: 4 });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('REVIEW_DUPLICATE');

      // Balance must still be 50 (not doubled)
      const account = await LoyaltyAccount.findOne({ where: { userId: userDup.id } });
      expect(Number(account!.balancePoints)).toBe(50);
    });

    // ── 5. validation — rating 0 and rating 6 ─────────────────────────────────

    it('5a. rating=0 → 422 VALIDATION_ERROR', async () => {
      const userV = await seedUser('user', 'rv-val0');
      const tokenVU = makeToken(userV.id, 'user');

      const res = await request(app)
        .post('/api/v1/me/reviews')
        .set('Authorization', `Bearer ${tokenVU}`)
        .send({ bookId: bookA.id, rating: 0 });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('5b. rating=6 → 422 VALIDATION_ERROR', async () => {
      const userV = await seedUser('user', 'rv-val6');
      const tokenVU = makeToken(userV.id, 'user');

      const res = await request(app)
        .post('/api/v1/me/reviews')
        .set('Authorization', `Bearer ${tokenVU}`)
        .send({ bookId: bookA.id, rating: 6 });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ── 6. GET /api/v1/books/:idOrSlug/reviews — public ──────────────────────

  describe('GET /api/v1/books/:idOrSlug/reviews', () => {
    it('6. list reviews public → 200 + reviews array + pagination', async () => {
      const userR1 = await seedUser('user', 'rv-r1');
      const userR2 = await seedUser('user', 'rv-r2');
      const book = await seedBook(vendorUser.id);
      await seedCompletedOrder(userR1.id, book.id);
      await seedCompletedOrder(userR2.id, book.id);

      // Create two reviews via API
      await request(app)
        .post('/api/v1/me/reviews')
        .set('Authorization', `Bearer ${makeToken(userR1.id, 'user')}`)
        .send({ bookId: book.id, rating: 3 });
      await request(app)
        .post('/api/v1/me/reviews')
        .set('Authorization', `Bearer ${makeToken(userR2.id, 'user')}`)
        .send({ bookId: book.id, rating: 5 });

      // No auth needed
      const res = await request(app)
        .get(`/api/v1/books/${book.id}/reviews`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(2);

      // Check DTO fields
      const item = res.body.data[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('rating');
      expect(item).toHaveProperty('comment');
      expect(item).toHaveProperty('userName');
      expect(item).toHaveProperty('createdAt');
      expect(item).toHaveProperty('vendorReply');
      expect(item).toHaveProperty('vendorRepliedAt');

      // Pagination
      expect(res.body.meta?.pagination).toBeDefined();
      expect(res.body.meta.pagination.total).toBe(2);
    });
  });

  // ── 7. vendor reply ────────────────────────────────────────────────────────

  describe('POST /api/v1/vendor/reviews/:id/reply', () => {
    let reviewId: number;
    let bookForReply: Book;

    beforeAll(async () => {
      // Create a review for bookA owned by vendorUser
      bookForReply = await seedBook(vendorUser.id);
      const userForReply = await seedUser('user', 'rv-reply');
      await seedCompletedOrder(userForReply.id, bookForReply.id);

      const reviewRes = await request(app)
        .post('/api/v1/me/reviews')
        .set('Authorization', `Bearer ${makeToken(userForReply.id, 'user')}`)
        .send({ bookId: bookForReply.id, rating: 4, comment: 'Good book' });

      reviewId = reviewRes.body.data.id;
    });

    it('7. vendor owner trả lời → 200 + vendor_reply được lưu', async () => {
      const res = await request(app)
        .post(`/api/v1/vendor/reviews/${reviewId}/reply`)
        .set('Authorization', `Bearer ${tokenV}`)
        .send({ reply: 'Cảm ơn bạn đã đánh giá!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.vendorReply).toBe('Cảm ơn bạn đã đánh giá!');
      expect(res.body.data.vendorRepliedAt).not.toBeNull();

      // Verify in DB
      const review = await Review.findByPk(reviewId);
      expect(review!.vendorReply).toBe('Cảm ơn bạn đã đánh giá!');
    });

    it('8. vendor khác trả lời → 403', async () => {
      const res = await request(app)
        .post(`/api/v1/vendor/reviews/${reviewId}/reply`)
        .set('Authorization', `Bearer ${tokenV2}`)
        .send({ reply: 'Không phải sách của tôi' });

      expect(res.status).toBe(403);
    });

    it('9. vendor reply vào book không thuộc về mình → 403', async () => {
      // Create a book owned by vendorUser2, with a review from a user
      const book2 = await seedBook(vendorUser2.id);
      const userOther = await seedUser('user', 'rv-other');
      await seedCompletedOrder(userOther.id, book2.id);

      const r = await request(app)
        .post('/api/v1/me/reviews')
        .set('Authorization', `Bearer ${makeToken(userOther.id, 'user')}`)
        .send({ bookId: book2.id, rating: 2 });

      const rid = r.body.data.id;

      // vendorUser (not the owner) tries to reply
      const res = await request(app)
        .post(`/api/v1/vendor/reviews/${rid}/reply`)
        .set('Authorization', `Bearer ${tokenV}`)
        .send({ reply: 'I should not be able to reply' });

      expect(res.status).toBe(403);
    });
  });

  // ── rating_avg multi-review recompute assertion ───────────────────────────

  it('rating_avg recompute is correct for multiple reviews', async () => {
    const userC1 = await seedUser('user', 'rv-c1');
    const userC2 = await seedUser('user', 'rv-c2');
    const userC3 = await seedUser('user', 'rv-c3');
    const bookC = await seedBook(vendorUser.id);
    await seedCompletedOrder(userC1.id, bookC.id);
    await seedCompletedOrder(userC2.id, bookC.id);
    await seedCompletedOrder(userC3.id, bookC.id);

    await request(app)
      .post('/api/v1/me/reviews')
      .set('Authorization', `Bearer ${makeToken(userC1.id, 'user')}`)
      .send({ bookId: bookC.id, rating: 3 });
    await request(app)
      .post('/api/v1/me/reviews')
      .set('Authorization', `Bearer ${makeToken(userC2.id, 'user')}`)
      .send({ bookId: bookC.id, rating: 5 });
    await request(app)
      .post('/api/v1/me/reviews')
      .set('Authorization', `Bearer ${makeToken(userC3.id, 'user')}`)
      .send({ bookId: bookC.id, rating: 4 });

    const updatedBook = await Book.findByPk(bookC.id);
    expect(Number(updatedBook!.ratingCount)).toBe(3);
    // avg = (3+5+4)/3 = 4.0
    expect(Number(updatedBook!.ratingAvg)).toBe(4);
  });
});
