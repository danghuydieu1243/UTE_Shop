/**
 * Test suite cho Payment simulation, Entitlement grant, và Signed-URL download.
 * Dùng SQLite in-memory (jest setup.ts sync({ force: true })).
 */

import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { createApp } from '../../../app';
import {
  User, Vendor, Book, BookFile,
  Order, OrderItem, Payment, Entitlement, Author,
  Coupon, CouponRedemption, Cart, CartItem, Notification, Wishlist,
} from '../../../db/models';
import { signAccessToken } from '../../auth/token.service';
import { env } from '../../../config/env';
import { completePayment } from '../payments.service';

const app = createApp();

// ── Upload dir tạm (test) ─────────────────────────────────────────────────────
const TEST_UPLOAD_DIR = env.UPLOAD_DIR;
const TEST_PRIVATE_DIR = path.resolve(TEST_UPLOAD_DIR, 'private');
const TEST_FILE_PATH = path.resolve(TEST_PRIVATE_DIR, 'test-book.pdf');

// ── Seed helpers ──────────────────────────────────────────────────────────────

async function seedUser(role: 'user' | 'vendor' | 'admin' = 'user', suffix = '') {
  return User.create({
    email: `${role}${suffix}${Date.now()}@test-payments.com`,
    passwordHash: 'hash',
    role,
    fullName: `Test ${role}`,
    status: 'active',
  });
}

async function seedBook(vendorUserId: number, opts: { price?: number; status?: string } = {}) {
  const slug = `test-book-pay-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return Book.create({
    vendorUserId,
    title: 'Sách Test Payments',
    slug,
    price: opts.price ?? 79000,
    fileFormat: 'PDF',
    status: opts.status ?? 'published',
  });
}

function makeToken(userId: number, role = 'user') {
  return signAccessToken({ id: userId, role });
}

/**
 * Tạo order + payment PENDING trong DB trực tiếp (không qua checkout endpoint)
 */
async function createPendingOrder(
  userId: number,
  vendorId: number,
  bookId: number,
  opts: { expiresAt?: Date | null } = {},
) {
  const code = `ATH-PAY-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const order = await Order.create({
    userId,
    code,
    status: 'NEW',
    subtotal: 79000,
    total: 79000,
    currency: 'VND',
  });
  await OrderItem.create({
    orderId: Number(order.id),
    bookId,
    vendorUserId: vendorId,
    titleSnapshot: 'Sách Test Payments',
    unitPrice: 79000,
  });
  const payment = await Payment.create({
    orderId: Number(order.id),
    provider: 'sepay',
    amount: 79000,
    currency: 'VND',
    status: 'PENDING',
    referenceCode: code,
    expiresAt: opts.expiresAt !== undefined
      ? opts.expiresAt
      : new Date(Date.now() + 15 * 60 * 1000), // 15 phút
  });
  return { order, payment };
}

// ── Global setup: tạo file test PDF tạm ──────────────────────────────────────

let vendorUser: User;
let testBook: Book;
let testBookWithFile: Book;

beforeAll(async () => {
  // Tạo thư mục private nếu chưa có
  if (!fs.existsSync(TEST_PRIVATE_DIR)) {
    fs.mkdirSync(TEST_PRIVATE_DIR, { recursive: true });
  }
  // Tạo file PDF giả để test stream
  fs.writeFileSync(TEST_FILE_PATH, '%PDF-1.4 test content');

  // Seed vendor
  vendorUser = await seedUser('vendor', `v-pay-${Date.now()}`);
  await Vendor.create({
    userId: vendorUser.id,
    shopName: 'Shop Payments',
    shopSlug: `shop-pay-${Date.now()}`,
  });

  // Seed sách có BookFile
  testBook = await seedBook(vendorUser.id);
  testBookWithFile = await seedBook(vendorUser.id);
  await BookFile.create({
    bookId: Number(testBookWithFile.id),
    storageKey: 'private/test-book.pdf',
    fileFormat: 'PDF',
    fileSizeBytes: 21,
  });
});

afterAll(async () => {
  // Dọn file test PDF
  if (fs.existsSync(TEST_FILE_PATH)) {
    fs.unlinkSync(TEST_FILE_PATH);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: simulate PENDING → PAID
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/payments/:id/simulate', () => {
  it('1. simulate PENDING → PAID: order COMPLETED + entitlement tạo + purchaseCount+1', async () => {
    const user = await seedUser('user', `sim1-${Date.now()}`);
    const token = makeToken(user.id);
    const book = await seedBook(vendorUser.id);

    const { payment } = await createPendingOrder(user.id, vendorUser.id, book.id);

    const res = await request(app)
      .post(`/api/v1/payments/${payment.id}/simulate`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const d = res.body.data;
    expect(d.status).toBe('COMPLETED');
    expect(d.payment.status).toBe('PAID');
    expect(d.payment.paidAt).toBeTruthy();

    // Kiểm DB: entitlement tạo
    const ent = await Entitlement.findOne({ where: { userId: user.id, bookId: book.id } });
    expect(ent).not.toBeNull();

    // Kiểm purchaseCount tăng
    const updatedBook = await Book.findByPk(book.id);
    expect(Number(updatedBook!.purchaseCount)).toBe(1);
  });

  // ── Test 2: Idempotent ────────────────────────────────────────────────────

  it('2. simulate lần 2 idempotent: 200 OK, purchaseCount KHÔNG tăng thêm, entitlement KHÔNG tạo thêm', async () => {
    const user = await seedUser('user', `sim2-${Date.now()}`);
    const token = makeToken(user.id);
    const book = await seedBook(vendorUser.id);

    const { payment } = await createPendingOrder(user.id, vendorUser.id, book.id);
    const payId = payment.id;

    // Lần 1
    const res1 = await request(app)
      .post(`/api/v1/payments/${payId}/simulate`)
      .set('Authorization', `Bearer ${token}`);
    expect(res1.status).toBe(200);

    // Lần 2 — idempotent
    const res2 = await request(app)
      .post(`/api/v1/payments/${payId}/simulate`)
      .set('Authorization', `Bearer ${token}`);
    expect(res2.status).toBe(200);
    expect(res2.body.data.status).toBe('COMPLETED');

    // purchaseCount vẫn là 1 (không tăng thêm lần 2)
    // NOTE: Theo logic hiện tại purchaseCount tăng mỗi lần gọi khi PAID idempotent path
    // không tăng thêm vì bước tăng chỉ xảy ra trên path PENDING→PAID
    const updatedBook = await Book.findByPk(book.id);
    expect(Number(updatedBook!.purchaseCount)).toBe(1);

    // Entitlement chỉ có 1 record
    const ents = await Entitlement.findAll({ where: { userId: user.id, bookId: book.id } });
    expect(ents).toHaveLength(1);
  });

  // ── Test 3: Payment hết hạn ───────────────────────────────────────────────

  it('3. simulate payment hết hạn → 409 PAYMENT_EXPIRED', async () => {
    const user = await seedUser('user', `sim3-${Date.now()}`);
    const token = makeToken(user.id);
    const book = await seedBook(vendorUser.id);

    const { payment } = await createPendingOrder(user.id, vendorUser.id, book.id, {
      expiresAt: new Date(Date.now() - 60 * 1000), // quá khứ
    });

    const res = await request(app)
      .post(`/api/v1/payments/${payment.id}/simulate`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PAYMENT_EXPIRED');
  });

  // ── Test 4: Payment của người khác → 404 ─────────────────────────────────

  it('4. simulate payment người khác → 404 PAYMENT_NOT_FOUND', async () => {
    const owner = await seedUser('user', `sim4-owner-${Date.now()}`);
    const other = await seedUser('user', `sim4-other-${Date.now()}`);
    const tokenOther = makeToken(other.id);
    const book = await seedBook(vendorUser.id);

    const { payment } = await createPendingOrder(owner.id, vendorUser.id, book.id);

    const res = await request(app)
      .post(`/api/v1/payments/${payment.id}/simulate`)
      .set('Authorization', `Bearer ${tokenOther}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('PAYMENT_NOT_FOUND');
  });

  // ── Test 5: Payment FAILED ────────────────────────────────────────────────

  it('5. simulate payment FAILED → 409 PAYMENT_ALREADY_FAILED', async () => {
    const user = await seedUser('user', `sim5-${Date.now()}`);
    const token = makeToken(user.id);
    const book = await seedBook(vendorUser.id);

    const { payment } = await createPendingOrder(user.id, vendorUser.id, book.id);
    await payment.update({ status: 'FAILED' });

    const res = await request(app)
      .post(`/api/v1/payments/${payment.id}/simulate`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('PAYMENT_ALREADY_FAILED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 6: GET /me/ebooks sau khi mua
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/v1/me/ebooks', () => {
  it('6. GET /me/ebooks sau khi mua → có sách trong danh sách', async () => {
    const user = await seedUser('user', `eb6-${Date.now()}`);
    const token = makeToken(user.id);
    const book = await seedBook(vendorUser.id);

    // Tạo entitlement trực tiếp
    const order = await Order.create({
      userId: user.id,
      code: `ATH-EB6-${Date.now()}`,
      status: 'COMPLETED',
      subtotal: 79000,
      total: 79000,
      currency: 'VND',
      completedAt: new Date(),
    });
    await Entitlement.create({
      userId: user.id,
      bookId: book.id,
      orderId: Number(order.id),
      grantedAt: new Date(),
    });

    const res = await request(app)
      .get('/api/v1/me/ebooks')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const ebook = res.body.data.find((e: any) => e.bookId === Number(book.id));
    expect(ebook).toBeDefined();
    expect(ebook.title).toBe('Sách Test Payments');
    expect(ebook.orderCode).toBe(order.code);
    // Sách không có tác giả → author phải là null
    expect(ebook.author).toBeNull();

    // Kiểm pagination meta
    expect(res.body.meta.pagination).toBeDefined();
    expect(res.body.meta.pagination.total).toBeGreaterThanOrEqual(1);
  });

  it('6b. GET /me/ebooks khi sách có tác giả → author trả tên tác giả', async () => {
    const user = await seedUser('user', `eb6b-${Date.now()}`);
    const token = makeToken(user.id);

    // Tạo author
    const author = await Author.create({ name: 'Nguyễn Văn A', slug: `author-6b-${Date.now()}` });

    // Tạo sách gắn author
    const slug = `test-book-eb6b-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const book = await Book.create({
      vendorUserId: vendorUser.id,
      title: 'Sách Có Tác Giả',
      slug,
      price: 59000,
      fileFormat: 'PDF',
      status: 'published',
      authorId: Number(author.id),
    } as any);

    const order = await Order.create({
      userId: user.id,
      code: `ATH-EB6B-${Date.now()}`,
      status: 'COMPLETED',
      subtotal: 59000,
      total: 59000,
      currency: 'VND',
      completedAt: new Date(),
    });
    await Entitlement.create({
      userId: user.id,
      bookId: book.id,
      orderId: Number(order.id),
      grantedAt: new Date(),
    });

    const res = await request(app)
      .get('/api/v1/me/ebooks')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    const ebook = res.body.data.find((e: any) => e.bookId === Number(book.id));
    expect(ebook).toBeDefined();
    expect(ebook.author).toBe('Nguyễn Văn A');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /me/ebooks/ids — danh sách bookId đã sở hữu (đánh dấu "đã mua" ở FE)
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/v1/me/ebooks/ids', () => {
  it('E-ids-1: trả mảng bookId đã sở hữu', async () => {
    const user = await seedUser('user', `ids1-${Date.now()}`);
    const token = makeToken(user.id);
    const book = await seedBook(vendorUser.id);

    const order = await Order.create({
      userId: user.id,
      code: `ATH-IDS1-${Date.now()}`,
      status: 'COMPLETED',
      subtotal: 79000,
      total: 79000,
      currency: 'VND',
      completedAt: new Date(),
    });
    await Entitlement.create({
      userId: user.id,
      bookId: book.id,
      orderId: Number(order.id),
      grantedAt: new Date(),
    });

    const res = await request(app)
      .get('/api/v1/me/ebooks/ids')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.bookIds)).toBe(true);
    expect(res.body.data.bookIds).toContain(Number(book.id));
    // Toàn bộ phần tử là number (khớp shape FE)
    expect(res.body.data.bookIds.every((id: unknown) => typeof id === 'number')).toBe(true);
  });

  it('E-ids-2: chưa sở hữu gì → mảng rỗng', async () => {
    const user = await seedUser('user', `ids2-${Date.now()}`);
    const token = makeToken(user.id);

    const res = await request(app)
      .get('/api/v1/me/ebooks/ids')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.bookIds).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Wishlist tự gỡ khi thanh toán hoàn tất
// ─────────────────────────────────────────────────────────────────────────────

describe('completePayment — gỡ sách khỏi wishlist', () => {
  it('WL-pay1: sách đang trong wishlist bị gỡ sau khi mua thành công', async () => {
    const buyer = await seedUser('user', `wlpay1-${Date.now()}`);
    const token = makeToken(buyer.id);
    const book = await seedBook(vendorUser.id);

    // User thêm sách vào wishlist trước khi mua
    await Wishlist.create({ userId: buyer.id, bookId: Number(book.id) });

    const { payment } = await createPendingOrder(buyer.id, vendorUser.id, book.id);

    const res = await request(app)
      .post(`/api/v1/payments/${payment.id}/simulate`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    // Wishlist không còn sách này
    const wl = await Wishlist.findOne({ where: { userId: buyer.id, bookId: Number(book.id) } });
    expect(wl).toBeNull();
  });

  it('WL-pay2: không có trong wishlist → completePayment vẫn ok (idempotent)', async () => {
    const buyer = await seedUser('user', `wlpay2-${Date.now()}`);
    const book = await seedBook(vendorUser.id);
    const { payment } = await createPendingOrder(buyer.id, vendorUser.id, book.id);

    await expect(completePayment(payment.id, { userId: buyer.id })).resolves.toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 7: POST /me/ebooks/:bookId/download → trả url + expiresAt
// ─────────────────────────────────────────────────────────────────────────────

describe('POST /api/v1/me/ebooks/:bookId/download', () => {
  it('7. download link → trả url + expiresAt', async () => {
    const user = await seedUser('user', `dl7-${Date.now()}`);
    const token = makeToken(user.id);

    // Tạo entitlement cho sách có BookFile
    const order = await Order.create({
      userId: user.id,
      code: `ATH-DL7-${Date.now()}`,
      status: 'COMPLETED',
      subtotal: 79000,
      total: 79000,
      currency: 'VND',
      completedAt: new Date(),
    });
    await Entitlement.create({
      userId: user.id,
      bookId: testBookWithFile.id,
      orderId: Number(order.id),
      grantedAt: new Date(),
    });

    const res = await request(app)
      .post(`/api/v1/me/ebooks/${testBookWithFile.id}/download`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    const d = res.body.data;
    expect(d.url).toMatch(/^\/api\/v1\/download\?token=/);
    expect(d.expiresAt).toBeTruthy();
    expect(d.fileFormat).toBe('PDF');
    expect(d.fileSizeBytes).toBe(21);
  });

  // ── Test 10: chưa sở hữu → ENTITLEMENT_MISSING ───────────────────────────

  it('10. POST download khi chưa sở hữu → 403 ENTITLEMENT_MISSING', async () => {
    const user = await seedUser('user', `dl10-${Date.now()}`);
    const token = makeToken(user.id);
    const book = await seedBook(vendorUser.id);

    const res = await request(app)
      .post(`/api/v1/me/ebooks/${book.id}/download`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ENTITLEMENT_MISSING');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 8 & 9: GET /download?token=...
// ─────────────────────────────────────────────────────────────────────────────

describe('GET /api/v1/download', () => {
  it('8. GET /download?token=<valid> → 200 stream với Content-Disposition', async () => {
    const user = await seedUser('user', `stream8-${Date.now()}`);
    const token = makeToken(user.id);

    // Tạo entitlement cho sách có file
    const order = await Order.create({
      userId: user.id,
      code: `ATH-STR8-${Date.now()}`,
      status: 'COMPLETED',
      subtotal: 79000,
      total: 79000,
      currency: 'VND',
      completedAt: new Date(),
    });
    await Entitlement.create({
      userId: user.id,
      bookId: testBookWithFile.id,
      orderId: Number(order.id),
      grantedAt: new Date(),
    });

    // Lấy download token qua endpoint
    const linkRes = await request(app)
      .post(`/api/v1/me/ebooks/${testBookWithFile.id}/download`)
      .set('Authorization', `Bearer ${token}`);
    expect(linkRes.status).toBe(200);

    const downloadUrl = linkRes.body.data.url; // '/api/v1/download?token=...'

    const res = await request(app).get(downloadUrl);

    expect(res.status).toBe(200);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    expect(res.headers['content-disposition']).toMatch(/test-book\.pdf/);
    expect(res.headers['content-type']).toMatch(/application\/octet-stream/);
    // Nội dung file (supertest trả buffer khi binary)
    const body = res.body instanceof Buffer ? res.body.toString() : res.text ?? '';
    expect(body).toContain('%PDF');
  });

  it('9. GET /download?token=<invalid> → 401 DOWNLOAD_TOKEN_INVALID', async () => {
    const res = await request(app)
      .get('/api/v1/download?token=invalid_token_here');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('DOWNLOAD_TOKEN_INVALID');
  });
});

// ── Test 11/12: coupon used_count on completePayment (D10) ───────────────────

describe('completePayment — coupon used_count wiring', () => {
  it('11. completePayment with coupon → usedCount==1', async () => {
    const user = await seedUser('user', `wc11-${Date.now()}`);
    const token = makeToken(user.id);

    const vendor = await seedUser('vendor', `wv11-${Date.now()}`);
    const book = await seedBook(vendor.id);

    const coupon = await Coupon.create({
      vendorUserId: vendor.id,
      code: `WTEST11-${Date.now()}`,
      type: 'fixed',
      value: 5000,
      status: 'active',
    });

    const { order, payment } = await createPendingOrder(user.id, vendor.id, book.id);
    // Set couponId on order
    await order.update({ couponId: Number(coupon.id), couponDiscount: 5000 });

    const res = await request(app)
      .post(`/api/v1/payments/${payment.id}/simulate`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);

    const updatedCoupon = await Coupon.findByPk(coupon.id);
    expect(Number(updatedCoupon!.usedCount)).toBe(1);
  });

  it('12. simulate twice → usedCount stays 1 (idempotent)', async () => {
    const user = await seedUser('user', `wc12-${Date.now()}`);
    const token = makeToken(user.id);

    const vendor = await seedUser('vendor', `wv12-${Date.now()}`);
    const book = await seedBook(vendor.id);

    const coupon = await Coupon.create({
      vendorUserId: vendor.id,
      code: `WTEST12-${Date.now()}`,
      type: 'fixed',
      value: 5000,
      status: 'active',
    });

    const { order, payment } = await createPendingOrder(user.id, vendor.id, book.id);
    await order.update({ couponId: Number(coupon.id), couponDiscount: 5000 });

    // First simulate
    await request(app).post(`/api/v1/payments/${payment.id}/simulate`).set('Authorization', `Bearer ${token}`);
    // Second simulate (idempotent — payment already PAID)
    await request(app).post(`/api/v1/payments/${payment.id}/simulate`).set('Authorization', `Bearer ${token}`);

    const updatedCoupon = await Coupon.findByPk(coupon.id);
    expect(Number(updatedCoupon!.usedCount)).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// NT-pay1/NT-pay2: Notification idempotency on completePayment (6a-T3)
// ─────────────────────────────────────────────────────────────────────────────

describe('completePayment — notification ebook (6a-T3)', () => {
  it('NT-pay1: completePayment lần đầu tạo đúng 1 notification ebook', async () => {
    const buyer = await seedUser('user', `ntpay1-${Date.now()}`);
    const book = await seedBook(vendorUser.id);
    const { payment } = await createPendingOrder(buyer.id, vendorUser.id, book.id);

    await completePayment(payment.id, { userId: buyer.id });

    const notifs = await Notification.findAll({ where: { userId: buyer.id, type: 'ebook' } });
    expect(notifs.length).toBe(1);
    expect(notifs[0].title).toMatch(/hoàn thành|sẵn sàng/i);
  });

  it('NT-pay2: gọi completePayment lần 2 (idempotent) KHÔNG tạo notification thứ 2', async () => {
    const buyer = await seedUser('user', `ntpay2-${Date.now()}`);
    const book = await seedBook(vendorUser.id);
    const { payment } = await createPendingOrder(buyer.id, vendorUser.id, book.id);

    await completePayment(payment.id, { userId: buyer.id });
    await completePayment(payment.id, { userId: buyer.id }); // idempotent return

    const notifs = await Notification.findAll({ where: { userId: buyer.id, type: 'ebook' } });
    expect(notifs.length).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test 13: E2E payment+coupon amount — createOrder through real service
// ─────────────────────────────────────────────────────────────────────────────

describe('E2E payment+coupon amount via real createOrder (D10)', () => {
  it('13. payment.amount === subtotal − couponDiscount when coupon applied at checkout', async () => {
    const user = await seedUser('user', `e2ec13-${Date.now()}`);
    const token = makeToken(user.id);

    const vendor = await seedUser('vendor', `e2ev13-${Date.now()}`);
    await Vendor.create({
      userId: vendor.id,
      shopName: `Shop E2E13 ${Date.now()}`,
      shopSlug: `shop-e2e13-${Date.now()}`,
    });

    // Book: 100000 VND
    const book = await seedBook(vendor.id, { price: 100000 });

    // Coupon: fixed 20000 for this vendor
    const coupon = await Coupon.create({
      vendorUserId: vendor.id,
      code: `E2EC13-${Date.now()}`,
      type: 'fixed',
      value: 20000,
      status: 'active',
    });

    // Add book to cart via DB (mimics addBookToCart in orders tests)
    const [cart] = await Cart.findOrCreate({ where: { userId: user.id }, defaults: { userId: user.id } });
    await CartItem.create({ cartId: cart.id, bookId: book.id, unitPrice: Number(book.price) });

    // Checkout with coupon via real orders API (uses createOrder service with couponCode)
    const checkoutRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${token}`)
      .send({ couponCode: coupon.code });

    expect(checkoutRes.status).toBe(201);
    const d = checkoutRes.body.data;

    // subtotal = 100000, couponDiscount = 20000, total = 80000
    expect(d.subtotal).toBe(100000);
    expect(d.couponDiscount).toBe(20000);
    expect(d.total).toBe(80000);

    // payment.amount must equal discounted total (NOT full subtotal)
    expect(d.payment.amount).toBe(80000);

    // Simulate payment to complete order
    const paymentId = d.payment.id;
    const simRes = await request(app)
      .post(`/api/v1/payments/${paymentId}/simulate`)
      .set('Authorization', `Bearer ${token}`);
    expect(simRes.status).toBe(200);
    expect(simRes.body.data.status).toBe('COMPLETED');

    // Coupon used_count must be exactly 1 after payment completes
    const updatedCoupon = await Coupon.findByPk(coupon.id);
    expect(Number(updatedCoupon!.usedCount)).toBe(1);

    // CouponRedemption row exists with correct discountAmount
    const order = await Order.findOne({ where: { code: d.code } });
    const redemption = await CouponRedemption.findOne({ where: { orderId: order!.id } });
    expect(redemption).not.toBeNull();
    expect(Number(redemption!.discountAmount)).toBe(20000);
  });
});
