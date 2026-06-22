import request from 'supertest';
import { createApp } from '../../../app';
import { User, Vendor, Book, Author, Category, Coupon, CouponRedemption, Order } from '../../../db/models';
import { signAccessToken } from '../../auth/token.service';

const app = createApp();

// ── Helpers ───────────────────────────────────────────────────────────────────
async function seedVendor(suffix = '') {
  const user = await User.create({
    email: `v${suffix}${Date.now()}@test.com`,
    passwordHash: 'h',
    role: 'vendor',
    fullName: 'V',
    status: 'active',
  });
  await Vendor.create({
    userId: user.id,
    shopName: 'Shop',
    shopSlug: `shop-${suffix}-${Date.now()}`,
  });
  return user;
}

async function seedUser(suffix = '') {
  return User.create({
    email: `u${suffix}${Date.now()}@test.com`,
    passwordHash: 'h',
    role: 'user',
    fullName: 'U',
    status: 'active',
  });
}

async function seedBook(vendorUserId: number) {
  const author = await Author.findOrCreate({
    where: { slug: `test-author-${vendorUserId}` },
    defaults: { name: 'Test Author', slug: `test-author-${vendorUserId}` },
  }).then(([a]) => a);
  const category = await Category.findOrCreate({
    where: { slug: `test-cat-coupon` },
    defaults: { name: 'Test Cat', slug: 'test-cat-coupon', sortOrder: 1 },
  }).then(([c]) => c);
  return Book.create({
    vendorUserId,
    title: `Book ${Date.now()}`,
    slug: `book-${Date.now()}`,
    price: 50000,
    authorId: author.id,
    categoryId: category.id,
    fileFormat: 'pdf',
    fileSizeBytes: 1000,
    status: 'published',
  });
}

function makeToken(userId: number, role = 'vendor') {
  return signAccessToken({ id: userId, role });
}

// ─────────────────────────────────────────────────────────────────────────────
describe('coupons service', () => {
  // Import service lazily to ensure models are ready
  let service: typeof import('../coupons.service');
  let vendor1: User;
  let vendor2: User;
  let regularUser: User;

  beforeAll(async () => {
    service = await import('../coupons.service');
    vendor1 = await seedVendor('svc1');
    vendor2 = await seedVendor('svc2');
    regularUser = await seedUser('svc');
  });

  // ── Test 1: vendor create coupon OK ─────────────────────────────────────────
  it('1. vendor create coupon OK — creates and returns id+code', async () => {
    const result = await service.createCoupon(vendor1.id, {
      code: 'SUMMER10',
      type: 'percent',
      value: 10,
      status: 'running',
    });
    expect(result.id).toBeDefined();
    expect(result.code).toBe('SUMMER10');
    expect(result.vendorUserId).toBe(vendor1.id);
  });

  // ── Test 2: vendor create with duplicate code (same vendor) → 409 ──────────
  it('2. vendor create with duplicate code (same vendor) → VALIDATION_ERROR 409', async () => {
    await service.createCoupon(vendor1.id, {
      code: 'DUPCODE',
      type: 'percent',
      value: 5,
      status: 'running',
    });
    await expect(
      service.createCoupon(vendor1.id, {
        code: 'DUPCODE',
        type: 'percent',
        value: 5,
        status: 'running',
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', status: 409 });
  });

  // ── Test 3: percent value 101 → VALIDATION_ERROR (via Zod) ─────────────────
  it('3. percent value 101 → rejected by Zod schema', async () => {
    // Test the Zod schema directly
    const { createCouponSchema } = await import('../coupons.schema');
    const result = createCouponSchema.safeParse({
      code: 'BAD',
      type: 'percent',
      value: 101,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.path.includes('value'))).toBe(true);
    }
  });

  // ── Test 4: list returns only calling vendor's coupons ──────────────────────
  it('4. list returns only calling vendor\'s coupons (not other vendor\'s)', async () => {
    await service.createCoupon(vendor1.id, { code: 'V1ONLY', type: 'fixed', value: 5000, status: 'running' });
    await service.createCoupon(vendor2.id, { code: 'V2ONLY', type: 'fixed', value: 5000, status: 'running' });

    const { rows } = await service.listCoupons(vendor1.id, { page: 1, limit: 20 });
    const codes = rows.map(c => c.code);
    expect(codes).toContain('V1ONLY');
    expect(codes).not.toContain('V2ONLY');
    for (const c of rows) {
      expect(c.vendorUserId).toBe(vendor1.id);
    }
  });

  // ── Test 5: update/delete another vendor's coupon → 403 ─────────────────────
  it('5. update/delete another vendor\'s coupon → AUTH_FORBIDDEN', async () => {
    const c = await service.createCoupon(vendor1.id, {
      code: 'PROTECTED1',
      type: 'percent',
      value: 10,
      status: 'running',
    });
    await expect(service.updateCoupon(vendor2.id, c.id, { value: 20 })).rejects.toMatchObject({
      code: 'AUTH_FORBIDDEN',
    });
    await expect(service.removeCoupon(vendor2.id, c.id)).rejects.toMatchObject({
      code: 'AUTH_FORBIDDEN',
    });
  });

  // ── Test 6a: validate happy path percent ────────────────────────────────────
  it('6a. validate happy path percent → correct discount floor(subtotal * value / 100)', async () => {
    const book = await seedBook(vendor1.id);
    const coupon = await service.createCoupon(vendor1.id, {
      code: `PCT${Date.now()}`,
      type: 'percent',
      value: 10,
      status: 'running',
    });

    const { discount } = await service.validateAndPriceCoupon(
      coupon.code,
      [{ bookId: book.id, vendorUserId: vendor1.id, price: book.price }],
      regularUser.id,
    );
    // floor(50000 * 10 / 100) = 5000
    expect(discount).toBe(Math.floor(Number(book.price) * 10 / 100));
  });

  // ── Test 6b: validate happy path fixed ──────────────────────────────────────
  it('6b. validate happy path fixed → correct discount min(value, subtotal)', async () => {
    const book = await seedBook(vendor1.id);
    const coupon = await service.createCoupon(vendor1.id, {
      code: `FIX${Date.now()}`,
      type: 'fixed',
      value: 20000,
      status: 'running',
    });

    const { discount } = await service.validateAndPriceCoupon(
      coupon.code,
      [{ bookId: book.id, vendorUserId: vendor1.id, price: book.price }],
      regularUser.id,
    );
    // min(20000, 50000) = 20000
    expect(discount).toBe(Math.min(20000, Number(book.price)));
  });

  // ── Test 7: validate expired coupon → COUPON_INVALID ────────────────────────
  it('7. validate expired coupon (ends_at in past) → COUPON_INVALID', async () => {
    const book = await seedBook(vendor1.id);
    const past = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    const coupon = await service.createCoupon(vendor1.id, {
      code: `EXP${Date.now()}`,
      type: 'percent',
      value: 5,
      endsAt: past,
      status: 'running',
    });

    await expect(
      service.validateAndPriceCoupon(
        coupon.code,
        [{ bookId: book.id, vendorUserId: vendor1.id, price: book.price }],
        regularUser.id,
      ),
    ).rejects.toMatchObject({ code: 'COUPON_INVALID' });
  });

  // ── Test 8: validate min_order not met → COUPON_INVALID ─────────────────────
  it('8. validate min_order not met → COUPON_INVALID', async () => {
    const book = await seedBook(vendor1.id);
    const coupon = await service.createCoupon(vendor1.id, {
      code: `MINORD${Date.now()}`,
      type: 'percent',
      value: 5,
      minOrder: 200000, // requires 200k but book price is 50k
      status: 'running',
    });

    await expect(
      service.validateAndPriceCoupon(
        coupon.code,
        [{ bookId: book.id, vendorUserId: vendor1.id, price: book.price }],
        regularUser.id,
      ),
    ).rejects.toMatchObject({ code: 'COUPON_INVALID' });
  });

  // ── Test 9: validate items include a book from different vendor → COUPON_INVALID (D8) ──
  it('9. validate items include a book from a different vendor → COUPON_INVALID (D8)', async () => {
    const bookV1 = await seedBook(vendor1.id);
    const bookV2 = await seedBook(vendor2.id);
    const coupon = await service.createCoupon(vendor1.id, {
      code: `SCOPE${Date.now()}`,
      type: 'percent',
      value: 5,
      status: 'running',
    });

    await expect(
      service.validateAndPriceCoupon(
        coupon.code,
        [
          { bookId: bookV1.id, vendorUserId: vendor1.id, price: bookV1.price },
          { bookId: bookV2.id, vendorUserId: vendor2.id, price: bookV2.price },
        ],
        regularUser.id,
      ),
    ).rejects.toMatchObject({ code: 'COUPON_INVALID' });
  });

  // ── Test 10: validate exceeding max_uses_per_user → COUPON_USAGE_EXCEEDED ───
  it('10. validate exceeding max_uses_per_user → COUPON_USAGE_EXCEEDED', async () => {
    const book = await seedBook(vendor1.id);
    const coupon = await service.createCoupon(vendor1.id, {
      code: `MAXUSR${Date.now()}`,
      type: 'percent',
      value: 5,
      maxUsesPerUser: 1,
      status: 'running',
    });

    // Create a completed order + redemption to simulate prior use
    const order = await Order.create({
      code: `ORD${Date.now()}`,
      userId: regularUser.id,
      status: 'COMPLETED',
      subtotal: 50000,
      total: 47500,
      couponId: coupon.id,
      couponDiscount: 2500,
    });
    await CouponRedemption.create({
      couponId: coupon.id,
      userId: regularUser.id,
      orderId: order.id,
      discountAmount: 2500,
    });

    await expect(
      service.validateAndPriceCoupon(
        coupon.code,
        [{ bookId: book.id, vendorUserId: vendor1.id, price: book.price }],
        regularUser.id,
      ),
    ).rejects.toMatchObject({ code: 'COUPON_USAGE_EXCEEDED' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
describe('coupons routes (supertest)', () => {
  let vendor: User;
  let token: string;
  let userToken: string;
  let regularUser: User;

  beforeAll(async () => {
    vendor = await seedVendor('route');
    regularUser = await seedUser('route');
    token = makeToken(vendor.id, 'vendor');
    userToken = makeToken(regularUser.id, 'user');
  });

  // ── POST /api/v1/vendor/coupons returns 201 ──────────────────────────────────
  it('POST /api/v1/vendor/coupons returns 201', async () => {
    const res = await request(app)
      .post('/api/v1/vendor/coupons')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: `RT${Date.now()}`, type: 'percent', value: 15, status: 'running' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBeDefined();
    expect(res.body.data.code).toBeDefined();
  });

  // ── GET /api/v1/vendor/coupons returns 200 list ──────────────────────────────
  it('GET /api/v1/vendor/coupons returns 200 list', async () => {
    const res = await request(app)
      .get('/api/v1/vendor/coupons')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data.coupons)).toBe(true);
  });

  // ── PATCH /api/v1/vendor/coupons/:id updates ok ──────────────────────────────
  it('PATCH /api/v1/vendor/coupons/:id updates ok', async () => {
    const create = await request(app)
      .post('/api/v1/vendor/coupons')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: `PATCH${Date.now()}`, type: 'fixed', value: 10000, status: 'scheduled' });
    expect(create.status).toBe(201);

    const id = create.body.data.id;
    const res = await request(app)
      .patch(`/api/v1/vendor/coupons/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ value: 15000 });
    expect(res.status).toBe(200);
    expect(res.body.data.value).toBe(15000);
  });

  // ── DELETE /api/v1/vendor/coupons/:id returns 204 ────────────────────────────
  it('DELETE /api/v1/vendor/coupons/:id returns 204', async () => {
    const create = await request(app)
      .post('/api/v1/vendor/coupons')
      .set('Authorization', `Bearer ${token}`)
      .send({ code: `DEL${Date.now()}`, type: 'fixed', value: 5000, status: 'scheduled' });
    expect(create.status).toBe(201);

    const id = create.body.data.id;
    const res = await request(app)
      .delete(`/api/v1/vendor/coupons/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
  });

  // ── POST /api/v1/me/coupons/validate percent happy path ──────────────────────
  it('POST /api/v1/me/coupons/validate percent happy path returns correct discount', async () => {
    // Create a book for this vendor
    const book = await seedBook(vendor.id);
    // Create a coupon
    const service = await import('../coupons.service');
    const coupon = await service.createCoupon(vendor.id, {
      code: `VAL${Date.now()}`,
      type: 'percent',
      value: 20,
      status: 'running',
    });

    const res = await request(app)
      .post('/api/v1/me/coupons/validate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ code: coupon.code, bookIds: [book.id] });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.discount).toBe(Math.floor(Number(book.price) * 20 / 100));
    expect(res.body.data.couponId).toBe(coupon.id);
    expect(res.body.data.type).toBe('percent');
  });
});
