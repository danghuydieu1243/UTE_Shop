import request from 'supertest';
import { createApp } from '../../../app';
import {
  User, Vendor, Author, Book,
  Cart, CartItem,
  Order, OrderItem, Payment, Entitlement,
  Coupon, CouponRedemption, LoyaltyAccount, LoyaltyTransaction,
} from '../../../db/models';
import { signAccessToken } from '../../auth/token.service';

const app = createApp();

// ── Seed helpers ─────────────────────────────────────────────────────────────

async function seedUser(role: 'user' | 'vendor' | 'admin' = 'user', suffix = '') {
  return User.create({
    email: `${role}${suffix}${Date.now()}@test-orders.com`,
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
  const slug = `test-book-ord-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return Book.create({
    vendorUserId,
    title: 'Sách Test Orders',
    slug,
    price: opts.price ?? 99000,
    fileFormat: 'PDF',
    status: opts.status ?? 'published',
  });
}

function makeToken(userId: number, role = 'user') {
  return signAccessToken({ id: userId, role });
}

async function addToCart(userId: number, bookId: number, token: string) {
  return request(app)
    .post('/api/v1/cart/items')
    .set('Authorization', `Bearer ${token}`)
    .send({ bookId });
}

// ── Suite ─────────────────────────────────────────────────────────────────────

describe('Orders API', () => {
  let userA: User;
  let userB: User;
  let vendorUser: User;
  let bookA: Book;
  let bookB: Book;
  let tokenA: string;
  let tokenB: string;

  beforeAll(async () => {
    vendorUser = await seedUser('vendor', `v-ord-${Date.now()}`);
    await Vendor.create({
      userId: vendorUser.id,
      shopName: 'Shop Orders',
      shopSlug: `shop-ord-${Date.now()}`,
    });
    userA = await seedUser('user', `a-ord-${Date.now()}`);
    userB = await seedUser('user', `b-ord-${Date.now()}`);

    bookA = await seedBook(vendorUser.id, { price: 79000 });
    bookB = await seedBook(vendorUser.id, { price: 49000 });

    tokenA = makeToken(userA.id, 'user');
    tokenB = makeToken(userB.id, 'user');
  });

  // ── Test 1: Checkout giỏ rỗng → CART_EMPTY ───────────────────────────────

  describe('POST /api/v1/orders — checkout', () => {
    it('1. checkout giỏ rỗng → 409 CART_EMPTY', async () => {
      const userEmpty = await seedUser('user', `empty-${Date.now()}`);
      const tokenEmpty = makeToken(userEmpty.id, 'user');

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${tokenEmpty}`)
        .send({});

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CART_EMPTY');
    });

    // ── Test 2: Checkout OK → order NEW + payment PENDING + cart bị xóa ─────

    it('2. checkout OK → tạo order NEW + payment PENDING + cart bị xóa + subtotal đúng', async () => {
      // Setup userA giỏ có 2 sách
      const userCheckout = await seedUser('user', `chk-${Date.now()}`);
      const tokenCheckout = makeToken(userCheckout.id, 'user');
      const book1 = await seedBook(vendorUser.id, { price: 79000 });
      const book2 = await seedBook(vendorUser.id, { price: 49000 });

      await addToCart(userCheckout.id, book1.id, tokenCheckout);
      await addToCart(userCheckout.id, book2.id, tokenCheckout);

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${tokenCheckout}`)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      const d = res.body.data;

      // order fields
      expect(d.status).toBe('NEW');
      expect(d.code).toMatch(/^ATH/);
      expect(d.subtotal).toBe(128000); // 79000 + 49000
      expect(d.total).toBe(128000);
      expect(d.currency).toBe('VND');
      expect(d.couponDiscount).toBe(0);
      expect(d.loyaltyDiscount).toBe(0);
      expect(d.items).toHaveLength(2);

      // payment
      expect(d.payment).not.toBeNull();
      expect(d.payment.status).toBe('PENDING');
      expect(d.payment.amount).toBe(128000);
      expect(d.payment.referenceCode).toBe(d.code);
      expect(d.payment.qrPayload).toBeTruthy();
      expect(d.payment.expiresAt).toBeTruthy();
      // KHÔNG lộ providerTxnId
      expect(d.payment.providerTxnId).toBeUndefined();

      // Cart đã bị xóa sau checkout
      const cartRes = await request(app)
        .get('/api/v1/cart')
        .set('Authorization', `Bearer ${tokenCheckout}`);
      expect(cartRes.body.data.itemCount).toBe(0);
    });

    // ── Test 3: Checkout lọc sách đã sở hữu ──────────────────────────────────

    it('3. checkout lọc sách đã sở hữu khỏi đơn', async () => {
      const userOwn = await seedUser('user', `own-${Date.now()}`);
      const tokenOwn = makeToken(userOwn.id, 'user');
      const bookOwned = await seedBook(vendorUser.id, { price: 60000 });
      const bookNew = await seedBook(vendorUser.id, { price: 40000 });

      // Tạo entitlement giả cho bookOwned
      const fakeOrder = await Order.create({
        userId: userOwn.id,
        code: `ATH-FAKE-${Date.now()}`,
        status: 'COMPLETED',
        subtotal: 60000,
        total: 60000,
        currency: 'VND',
        completedAt: new Date(),
      });
      await Entitlement.create({
        userId: userOwn.id,
        bookId: bookOwned.id,
        orderId: fakeOrder.id,
        grantedAt: new Date(),
      });

      // Thêm cả 2 vào giỏ trực tiếp qua model
      const cart = await Cart.findOrCreate({ where: { userId: userOwn.id }, defaults: { userId: userOwn.id } });
      await CartItem.create({ cartId: cart[0].id, bookId: bookOwned.id, unitPrice: 60000 });
      await CartItem.create({ cartId: cart[0].id, bookId: bookNew.id, unitPrice: 40000 });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${tokenOwn}`)
        .send({});

      expect(res.status).toBe(201);
      const d = res.body.data;
      // chỉ còn bookNew
      expect(d.items).toHaveLength(1);
      expect(d.items[0].bookId).toBe(bookNew.id);
      expect(d.subtotal).toBe(40000);
    });

    it('3b. checkout khi tất cả sách đã sở hữu → CART_EMPTY', async () => {
      const userAllOwned = await seedUser('user', `allown-${Date.now()}`);
      const tokenAllOwned = makeToken(userAllOwned.id, 'user');
      const bookAllOwned = await seedBook(vendorUser.id, { price: 50000 });

      const fakeOrder2 = await Order.create({
        userId: userAllOwned.id,
        code: `ATH-FAKE2-${Date.now()}`,
        status: 'COMPLETED',
        subtotal: 50000,
        total: 50000,
        currency: 'VND',
        completedAt: new Date(),
      });
      await Entitlement.create({
        userId: userAllOwned.id,
        bookId: bookAllOwned.id,
        orderId: fakeOrder2.id,
        grantedAt: new Date(),
      });

      const cart2 = await Cart.findOrCreate({ where: { userId: userAllOwned.id }, defaults: { userId: userAllOwned.id } });
      await CartItem.create({ cartId: cart2[0].id, bookId: bookAllOwned.id, unitPrice: 50000 });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${tokenAllOwned}`)
        .send({});

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CART_EMPTY');
    });
  });

  // ── Test 4: GET /orders list + pagination + filter status ─────────────────

  describe('GET /api/v1/orders — list', () => {
    let userList: User;
    let tokenList: string;

    beforeAll(async () => {
      userList = await seedUser('user', `list-${Date.now()}`);
      tokenList = makeToken(userList.id, 'user');
      // Tạo 3 đơn trực tiếp: 2 NEW, 1 CANCELLED
      for (let i = 0; i < 2; i++) {
        await Order.create({
          userId: userList.id,
          code: `ATH-LIST-${Date.now()}-${i}`,
          status: 'NEW',
          subtotal: 50000,
          total: 50000,
          currency: 'VND',
        });
        // small delay to avoid same timestamp
        await new Promise((r) => setTimeout(r, 5));
      }
      await Order.create({
        userId: userList.id,
        code: `ATH-LIST-CANCELLED-${Date.now()}`,
        status: 'CANCELLED',
        subtotal: 30000,
        total: 30000,
        currency: 'VND',
        cancelledAt: new Date(),
      });
    });

    it('4. list orders mặc định → trả pagination meta đúng', async () => {
      const res = await request(app)
        .get('/api/v1/orders')
        .set('Authorization', `Bearer ${tokenList}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      const meta = res.body.meta.pagination;
      expect(meta.page).toBe(1);
      expect(meta.limit).toBe(10);
      expect(typeof meta.total).toBe('number');
      expect(typeof meta.totalPages).toBe('number');
      // OrderSummaryDTO fields
      const first = res.body.data[0];
      expect(first).toHaveProperty('code');
      expect(first).toHaveProperty('status');
      expect(first).toHaveProperty('itemCount');
      expect(first).toHaveProperty('total');
      expect(first).toHaveProperty('currency');
      expect(first).toHaveProperty('createdAt');
    });

    it('4b. lọc theo status=CANCELLED → chỉ trả đơn CANCELLED', async () => {
      const res = await request(app)
        .get('/api/v1/orders?status=CANCELLED')
        .set('Authorization', `Bearer ${tokenList}`);

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.length).toBeGreaterThanOrEqual(1);
      data.forEach((o: any) => expect(o.status).toBe('CANCELLED'));
    });

    it('4c. pagination page=1&limit=1 → trả đúng 1 đơn', async () => {
      const res = await request(app)
        .get('/api/v1/orders?page=1&limit=1')
        .set('Authorization', `Bearer ${tokenList}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      const meta = res.body.meta.pagination;
      expect(meta.limit).toBe(1);
      expect(meta.total).toBeGreaterThanOrEqual(3);
      expect(meta.totalPages).toBeGreaterThanOrEqual(3);
    });
  });

  // ── Test 5: GET /orders/:code — detail + owner check ──────────────────────

  describe('GET /api/v1/orders/:code — detail', () => {
    let orderCode: string;
    let userOwner: User;
    let tokenOwner: string;

    beforeAll(async () => {
      userOwner = await seedUser('user', `owner-${Date.now()}`);
      tokenOwner = makeToken(userOwner.id, 'user');
      const bookDetail = await seedBook(vendorUser.id, { price: 55000 });

      // Checkout để tạo order
      const cart = await Cart.findOrCreate({ where: { userId: userOwner.id }, defaults: { userId: userOwner.id } });
      await CartItem.create({ cartId: cart[0].id, bookId: bookDetail.id, unitPrice: 55000 });

      const res = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${tokenOwner}`)
        .send({});

      orderCode = res.body.data.code;
    });

    it('5. getOrder chủ đơn → 200 OrderDetailDTO đầy đủ', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${orderCode}`)
        .set('Authorization', `Bearer ${tokenOwner}`);

      expect(res.status).toBe(200);
      const d = res.body.data;
      expect(d.code).toBe(orderCode);
      expect(d.status).toBe('NEW');
      expect(d.items).toBeDefined();
      expect(Array.isArray(d.items)).toBe(true);
      expect(d.payment).not.toBeNull();
      // PaymentDTO KHÔNG chứa providerTxnId
      expect(d.payment.providerTxnId).toBeUndefined();
      // items có đủ fields
      expect(d.items[0]).toHaveProperty('bookId');
      expect(d.items[0]).toHaveProperty('title');
      expect(d.items[0]).toHaveProperty('unitPrice');
    });

    it('5b. getOrder người khác → 404 ORDER_NOT_FOUND', async () => {
      const res = await request(app)
        .get(`/api/v1/orders/${orderCode}`)
        .set('Authorization', `Bearer ${tokenB}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
    });

    it('5c. getOrder code không tồn tại → 404 ORDER_NOT_FOUND', async () => {
      const res = await request(app)
        .get('/api/v1/orders/ATH-NOTEXIST-9999')
        .set('Authorization', `Bearer ${tokenOwner}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ORDER_NOT_FOUND');
    });
  });

  // ── Test 6: POST /orders/:code/cancel ────────────────────────────────────

  describe('POST /api/v1/orders/:code/cancel', () => {
    it('6. cancel đơn NEW OK → order CANCELLED + payment FAILED', async () => {
      const userCancel = await seedUser('user', `cancel-${Date.now()}`);
      const tokenCancel = makeToken(userCancel.id, 'user');
      const bookCancel = await seedBook(vendorUser.id, { price: 65000 });

      const cart = await Cart.findOrCreate({ where: { userId: userCancel.id }, defaults: { userId: userCancel.id } });
      await CartItem.create({ cartId: cart[0].id, bookId: bookCancel.id, unitPrice: 65000 });

      const checkoutRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${tokenCancel}`)
        .send({});
      const code = checkoutRes.body.data.code;
      const paymentId = checkoutRes.body.data.payment.id;

      const res = await request(app)
        .post(`/api/v1/orders/${code}/cancel`)
        .set('Authorization', `Bearer ${tokenCancel}`);

      expect(res.status).toBe(200);
      const d = res.body.data;
      expect(d.status).toBe('CANCELLED');
      expect(d.cancelledAt).toBeTruthy();

      // Kiểm payment đã FAILED
      const payment = await Payment.findByPk(paymentId);
      expect(payment?.status).toBe('FAILED');
    });

    it('6b. cancel đơn COMPLETED → 409 ORDER_NOT_CANCELLABLE', async () => {
      const userComp = await seedUser('user', `comp-${Date.now()}`);
      const orderComp = await Order.create({
        userId: userComp.id,
        code: `ATH-COMP-${Date.now()}`,
        status: 'COMPLETED',
        subtotal: 50000,
        total: 50000,
        currency: 'VND',
        completedAt: new Date(),
      });

      const tokenComp = makeToken(userComp.id, 'user');
      const res = await request(app)
        .post(`/api/v1/orders/${orderComp.code}/cancel`)
        .set('Authorization', `Bearer ${tokenComp}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ORDER_NOT_CANCELLABLE');
    });

    it('6c. cancel đơn đã CANCELLED → 409 ORDER_NOT_CANCELLABLE', async () => {
      const userCancelDone = await seedUser('user', `cancelDone-${Date.now()}`);
      const orderCancelDone = await Order.create({
        userId: userCancelDone.id,
        code: `ATH-CNCL-${Date.now()}`,
        status: 'CANCELLED',
        subtotal: 50000,
        total: 50000,
        currency: 'VND',
        cancelledAt: new Date(),
      });

      const tokenCancelDone = makeToken(userCancelDone.id, 'user');
      const res = await request(app)
        .post(`/api/v1/orders/${orderCancelDone.code}/cancel`)
        .set('Authorization', `Bearer ${tokenCancelDone}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ORDER_NOT_CANCELLABLE');
    });
  });

  // ── Test 7: POST /orders/:code/payment — tạo lại QR ──────────────────────

  describe('POST /api/v1/orders/:code/payment — recreate payment', () => {
    it('7. tạo lại payment khi đơn NEW và payment cũ đã FAILED → 200 PaymentDTO mới', async () => {
      const userReQR = await seedUser('user', `reqr-${Date.now()}`);
      const tokenReQR = makeToken(userReQR.id, 'user');
      const bookReQR = await seedBook(vendorUser.id, { price: 70000 });

      const cart = await Cart.findOrCreate({ where: { userId: userReQR.id }, defaults: { userId: userReQR.id } });
      await CartItem.create({ cartId: cart[0].id, bookId: bookReQR.id, unitPrice: 70000 });

      const checkoutRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${tokenReQR}`)
        .send({});
      const code = checkoutRes.body.data.code;
      const firstPaymentId = checkoutRes.body.data.payment.id;

      // Mark payment đầu FAILED
      await Payment.update({ status: 'FAILED' }, { where: { id: firstPaymentId } });

      const res = await request(app)
        .post(`/api/v1/orders/${code}/payment`)
        .set('Authorization', `Bearer ${tokenReQR}`);

      expect(res.status).toBe(200);
      const p = res.body.data;
      expect(p.status).toBe('PENDING');
      expect(p.id).not.toBe(firstPaymentId); // intent MỚI
      expect(p.expiresAt).toBeTruthy();
      // KHÔNG lộ providerTxnId
      expect(p.providerTxnId).toBeUndefined();
    });

    it('7b. tạo lại payment khi đơn CANCELLED → 409 ORDER_NOT_PAYABLE', async () => {
      const userNotPayable = await seedUser('user', `notpay-${Date.now()}`);
      const orderNotPayable = await Order.create({
        userId: userNotPayable.id,
        code: `ATH-NOTPAY-${Date.now()}`,
        status: 'CANCELLED',
        subtotal: 50000,
        total: 50000,
        currency: 'VND',
        cancelledAt: new Date(),
      });

      const tokenNotPayable = makeToken(userNotPayable.id, 'user');
      const res = await request(app)
        .post(`/api/v1/orders/${orderNotPayable.code}/payment`)
        .set('Authorization', `Bearer ${tokenNotPayable}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ORDER_NOT_PAYABLE');
    });

    it('7d. tạo lại payment khi đơn NEW nhưng còn PENDING hợp lệ → 409 ORDER_NOT_PAYABLE', async () => {
      // I1 guard: nếu payment PENDING chưa hết hạn thì từ chối tạo thêm
      const userGuard = await seedUser('user', `guard-${Date.now()}`);
      const tokenGuard = makeToken(userGuard.id, 'user');
      const bookGuard = await seedBook(vendorUser.id, { price: 55000 });

      const cart = await Cart.findOrCreate({
        where: { userId: userGuard.id },
        defaults: { userId: userGuard.id },
      });
      await CartItem.create({ cartId: cart[0].id, bookId: bookGuard.id, unitPrice: 55000 });

      // Checkout → tạo đơn NEW với payment PENDING còn hiệu lực
      const checkoutRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${tokenGuard}`)
        .send({});
      expect(checkoutRes.status).toBe(201);
      const code = checkoutRes.body.data.code;

      // Gọi recreatePayment ngay khi payment PENDING vẫn còn hạn → phải bị từ chối
      const res = await request(app)
        .post(`/api/v1/orders/${code}/payment`)
        .set('Authorization', `Bearer ${tokenGuard}`);

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('ORDER_NOT_PAYABLE');
    });

    it('7c. PaymentDTO TUYỆT ĐỐI KHÔNG chứa providerTxnId', async () => {
      const userPayDTO = await seedUser('user', `paydto-${Date.now()}`);
      const tokenPayDTO = makeToken(userPayDTO.id, 'user');
      const bookPayDTO = await seedBook(vendorUser.id, { price: 30000 });

      const cart = await Cart.findOrCreate({ where: { userId: userPayDTO.id }, defaults: { userId: userPayDTO.id } });
      await CartItem.create({ cartId: cart[0].id, bookId: bookPayDTO.id, unitPrice: 30000 });

      const checkoutRes = await request(app)
        .post('/api/v1/orders')
        .set('Authorization', `Bearer ${tokenPayDTO}`)
        .send({});

      const d = checkoutRes.body.data;
      // Kiểm trong orderDetailDTO.payment
      expect(d.payment).not.toHaveProperty('providerTxnId');
      // Kiểm trong items
      expect(d.items[0]).not.toHaveProperty('providerTxnId');
    });
  });
});

// ── Pricing Tests (5b/5c) ────────────────────────────────────────────────────

describe('Orders Pricing — coupon/points/cancel wiring', () => {
  let vendorPricing: User;
  let userPricing: User;
  let tokenPricing: string;
  let bookPricingA: Book; // vendor's book
  let bookPricingB: Book; // different vendor's book
  let differentVendor: User;

  beforeAll(async () => {
    vendorPricing = await seedUser('vendor', `vp-${Date.now()}`);
    await Vendor.create({ userId: vendorPricing.id, shopName: 'Pricing Shop', shopSlug: `priceshop-${Date.now()}` });
    differentVendor = await seedUser('vendor', `vdiff-${Date.now()}`);
    await Vendor.create({ userId: differentVendor.id, shopName: 'Diff Shop', shopSlug: `diffshop-${Date.now()}` });
    userPricing = await seedUser('user', `up-${Date.now()}`);
    tokenPricing = makeToken(userPricing.id, 'user');
    bookPricingA = await seedBook(vendorPricing.id, { price: 100000 });
    bookPricingB = await seedBook(differentVendor.id, { price: 50000 });
  });

  async function addBookToCart(userId: number, bookId: number) {
    const [cart] = await Cart.findOrCreate({ where: { userId }, defaults: { userId } });
    await CartItem.create({ cartId: cart.id, bookId, unitPrice: 0 });
    return cart;
  }

  async function seedCoupon(vendorUserId: number, opts: { type?: string; value?: number; code?: string; maxUses?: number } = {}) {
    return Coupon.create({
      vendorUserId,
      code: opts.code ?? `COUP-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      type: opts.type ?? 'percent',
      value: opts.value ?? 10,
      status: 'active',
      maxUses: opts.maxUses ?? null,
    });
  }

  // P8a: no coupon/points → total === subtotal (P3 regression)
  it('P8a. no coupon/points → total === subtotal (P3 regression)', async () => {
    const u = await seedUser('user', `p8a-${Date.now()}`);
    const t = makeToken(u.id, 'user');
    const b = await seedBook(vendorPricing.id, { price: 80000 });
    await addBookToCart(u.id, b.id);

    const res = await request(app).post('/api/v1/orders').set('Authorization', `Bearer ${t}`).send({});
    expect(res.status).toBe(201);
    const d = res.body.data;
    expect(d.subtotal).toBe(80000);
    expect(d.couponDiscount).toBe(0);
    expect(d.loyaltyDiscount).toBe(0);
    expect(d.total).toBe(80000);
    expect(d.payment.amount).toBe(80000);
  });

  // P8b: coupon percent → couponDiscount correct + CouponRedemption row
  it('P8b. coupon percent → couponDiscount correct + CouponRedemption row created', async () => {
    const u = await seedUser('user', `p8b-${Date.now()}`);
    const tok = makeToken(u.id, 'user');
    const b = await seedBook(vendorPricing.id, { price: 100000 });
    await addBookToCart(u.id, b.id);
    const coupon = await seedCoupon(vendorPricing.id, { type: 'percent', value: 10 }); // 10% → 10000

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${tok}`)
      .send({ couponCode: coupon.code });

    expect(res.status).toBe(201);
    const d = res.body.data;
    expect(d.couponDiscount).toBe(10000);
    expect(d.loyaltyDiscount).toBe(0);
    expect(d.total).toBe(90000);
    expect(d.payment.amount).toBe(90000);

    // CouponRedemption created
    const order = await Order.findOne({ where: { code: d.code } });
    const redemption = await CouponRedemption.findOne({ where: { orderId: order!.id } });
    expect(redemption).not.toBeNull();
    expect(Number(redemption!.discountAmount)).toBe(10000);
  });

  // P8c: coupon fixed
  it('P8c. coupon fixed → couponDiscount correct', async () => {
    const u = await seedUser('user', `p8c-${Date.now()}`);
    const tok = makeToken(u.id, 'user');
    const b = await seedBook(vendorPricing.id, { price: 100000 });
    await addBookToCart(u.id, b.id);
    const coupon = await seedCoupon(vendorPricing.id, { type: 'fixed', value: 15000 });

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${tok}`)
      .send({ couponCode: coupon.code });

    expect(res.status).toBe(201);
    const d = res.body.data;
    expect(d.couponDiscount).toBe(15000);
    expect(d.total).toBe(85000);
  });

  // P8d: points only → loyaltyDiscount correct + balance decremented + redeem txn
  it('P8d. points only → loyaltyDiscount correct + balance decremented + redeem txn', async () => {
    const u = await seedUser('user', `p8d-${Date.now()}`);
    const tok = makeToken(u.id, 'user');
    // Give user 500 points (50000 value)
    await LoyaltyAccount.create({ userId: u.id, balancePoints: 500 });
    const b = await seedBook(vendorPricing.id, { price: 100000 });
    await addBookToCart(u.id, b.id);

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${tok}`)
      .send({ pointsToUse: 100 }); // 100 pts = 10000 discount

    expect(res.status).toBe(201);
    const d = res.body.data;
    expect(d.loyaltyDiscount).toBe(10000);
    expect(d.couponDiscount).toBe(0);
    expect(d.total).toBe(90000);
    expect(d.payment.amount).toBe(90000);

    // Balance decremented
    const acc = await LoyaltyAccount.findOne({ where: { userId: u.id } });
    expect(Number(acc!.balancePoints)).toBe(400); // 500 - 100

    // LoyaltyTransaction created
    const order = await Order.findOne({ where: { code: d.code } });
    const txn = await LoyaltyTransaction.findOne({ where: { userId: u.id, orderId: order!.id } });
    expect(txn).not.toBeNull();
    expect(txn!.points).toBe(-100);
    expect(txn!.type).toBe('redeem');
  });

  // P8e: coupon + points stacked
  it('P8e. coupon+points stacked → total = subtotal-coupon-loyalty', async () => {
    const u = await seedUser('user', `p8e-${Date.now()}`);
    const tok = makeToken(u.id, 'user');
    await LoyaltyAccount.create({ userId: u.id, balancePoints: 200 });
    const b = await seedBook(vendorPricing.id, { price: 100000 });
    await addBookToCart(u.id, b.id);
    const coupon = await seedCoupon(vendorPricing.id, { type: 'fixed', value: 10000 });

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${tok}`)
      .send({ couponCode: coupon.code, pointsToUse: 100 }); // fixed 10000 + 100pts=10000

    expect(res.status).toBe(201);
    const d = res.body.data;
    expect(d.couponDiscount).toBe(10000);
    expect(d.loyaltyDiscount).toBe(10000);
    expect(d.total).toBe(80000);
  });

  // P8f: pointsToUse > balance → LOYALTY_INSUFFICIENT
  it('P8f. pointsToUse > balance → LOYALTY_INSUFFICIENT', async () => {
    const u = await seedUser('user', `p8f-${Date.now()}`);
    const tok = makeToken(u.id, 'user');
    await LoyaltyAccount.create({ userId: u.id, balancePoints: 50 });
    const b = await seedBook(vendorPricing.id, { price: 100000 });
    await addBookToCart(u.id, b.id);

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${tok}`)
      .send({ pointsToUse: 100 });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('LOYALTY_INSUFFICIENT');
  });

  // P8g: points capped by (subtotal - coupon) → only pointsActuallyUsed deducted
  it('P8g. points capped → only pointsActuallyUsed deducted', async () => {
    const u = await seedUser('user', `p8g-${Date.now()}`);
    const tok = makeToken(u.id, 'user');
    // subtotal = 100000, coupon = 90000, remaining = 10000 → 100pts would give 10000 but loyalty capped at 10000
    // Use 200 pts (=20000 value) but capped at 10000 → actually deducts ceil(10000/100)=100 pts
    await LoyaltyAccount.create({ userId: u.id, balancePoints: 300 });
    const b = await seedBook(vendorPricing.id, { price: 100000 });
    await addBookToCart(u.id, b.id);
    const coupon = await seedCoupon(vendorPricing.id, { type: 'fixed', value: 90000 });

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${tok}`)
      .send({ couponCode: coupon.code, pointsToUse: 200 }); // 200*100=20000, but only 10000 remaining

    expect(res.status).toBe(201);
    const d = res.body.data;
    expect(d.loyaltyDiscount).toBe(10000); // capped at remaining
    expect(d.total).toBe(0);

    // Only 100 pts deducted (ceil(10000/100)=100), not 200
    const acc = await LoyaltyAccount.findOne({ where: { userId: u.id } });
    expect(Number(acc!.balancePoints)).toBe(200); // 300 - 100
  });

  // P8h: cancel refunds points + deletes CouponRedemption
  it('P8h. cancel → refunds points + CouponRedemption deleted', async () => {
    const u = await seedUser('user', `p8h-${Date.now()}`);
    const tok = makeToken(u.id, 'user');
    await LoyaltyAccount.create({ userId: u.id, balancePoints: 200 });
    const b = await seedBook(vendorPricing.id, { price: 100000 });
    await addBookToCart(u.id, b.id);
    const coupon = await seedCoupon(vendorPricing.id, { type: 'fixed', value: 10000 });

    const orderRes = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${tok}`)
      .send({ couponCode: coupon.code, pointsToUse: 50 }); // 50 pts = 5000 loyalty
    expect(orderRes.status).toBe(201);
    const code = orderRes.body.data.code;

    // Check balance after order
    const accAfterOrder = await LoyaltyAccount.findOne({ where: { userId: u.id } });
    expect(Number(accAfterOrder!.balancePoints)).toBe(150); // 200-50

    // Cancel
    const cancelRes = await request(app)
      .post(`/api/v1/orders/${code}/cancel`)
      .set('Authorization', `Bearer ${tok}`);
    expect(cancelRes.status).toBe(200);

    // Balance restored
    const accAfterCancel = await LoyaltyAccount.findOne({ where: { userId: u.id } });
    expect(Number(accAfterCancel!.balancePoints)).toBe(200); // back to 200

    // CouponRedemption deleted
    const order = await Order.findOne({ where: { code } });
    const redemption = await CouponRedemption.findOne({ where: { orderId: order!.id } });
    expect(redemption).toBeNull();
  });

  // P8i: coupon with mixed-vendor items → COUPON_INVALID
  it('P8i. coupon with mixed-vendor items → COUPON_INVALID (via createOrder)', async () => {
    const u = await seedUser('user', `p8i-${Date.now()}`);
    const tok = makeToken(u.id, 'user');
    // Add books from BOTH vendors
    const bA = await seedBook(vendorPricing.id, { price: 50000 });
    const bB = await seedBook(differentVendor.id, { price: 50000 });
    await addBookToCart(u.id, bA.id);
    await addBookToCart(u.id, bB.id);
    // Coupon belongs to vendorPricing only
    const coupon = await seedCoupon(vendorPricing.id, { type: 'percent', value: 10 });

    const res = await request(app)
      .post('/api/v1/orders')
      .set('Authorization', `Bearer ${tok}`)
      .send({ couponCode: coupon.code });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('COUPON_INVALID');
  });
});
