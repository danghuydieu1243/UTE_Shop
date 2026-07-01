import request from 'supertest';
import { createApp } from '../../../app';
import {
  User, Vendor, Book, Cart, CartItem, Order, OrderItem,
} from '../../../db/models';
import { signAccessToken } from '../../auth/token.service';

const app = createApp();

async function seedUser(role: 'user' | 'vendor' | 'admin' = 'user', suffix = '') {
  return User.create({
    email: `${role}${suffix}${Date.now()}@test-vo.com`,
    passwordHash: 'hash',
    role,
    fullName: `Test ${role}`,
    status: 'active',
  });
}

async function seedBook(vendorUserId: number, opts: { price?: number } = {}) {
  const slug = `test-book-vo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return Book.create({
    vendorUserId,
    title: 'Sách Test VO',
    slug,
    price: opts.price ?? 99000,
    fileFormat: 'PDF',
    status: 'published',
  });
}

function makeToken(userId: number, role = 'user') {
  return signAccessToken({ id: userId, role });
}

describe('GET /api/v1/vendor/orders', () => {
  let vendor: User;
  let otherVendor: User;
  let buyer: User;
  let tokenVendor: string;
  let tokenUser: string;
  let vendorOrderCode: string;
  let recentVendorOrderCode: string;
  let localBoundaryOrderCode: string;

  beforeAll(async () => {
    vendor = await seedUser('vendor', `vo1-${Date.now()}`);
    await Vendor.create({ userId: vendor.id, shopName: 'VO Shop', shopSlug: `vo-shop-${Date.now()}` });
    otherVendor = await seedUser('vendor', `vo2-${Date.now()}`);
    await Vendor.create({ userId: otherVendor.id, shopName: 'Other VO Shop', shopSlug: `other-vo-${Date.now()}` });
    buyer = await seedUser('user', `vob-${Date.now()}`);
    tokenVendor = makeToken(vendor.id, 'vendor');
    tokenUser = makeToken(buyer.id, 'user');

    // Create an order with vendor's book
    const vendorBook = await seedBook(vendor.id, { price: 50000 });
    const order = await Order.create({
      userId: buyer.id,
      code: `ATH-VO-${Date.now()}`,
      status: 'COMPLETED',
      subtotal: 50000,
      total: 50000,
      currency: 'VND',
      completedAt: new Date(),
    });
    vendorOrderCode = order.code;
    await OrderItem.create({
      orderId: Number(order.id),
      bookId: Number(vendorBook.id),
      vendorUserId: Number(vendor.id),
      titleSnapshot: 'Sách Test VO',
      unitPrice: 50000,
    });
    await Order.update(
      { created_at: new Date('2026-06-06T10:00:00.000Z') },
      { where: { id: order.id }, silent: true },
    );

    const recentVendorBook = await seedBook(vendor.id, { price: 70000 });
    const recentVendorOrder = await Order.create({
      userId: buyer.id,
      code: `ATH-VO-SEARCH-${Date.now()}`,
      status: 'NEW',
      subtotal: 70000,
      total: 70000,
      currency: 'VND',
    });
    recentVendorOrderCode = recentVendorOrder.code;
    await OrderItem.create({
      orderId: Number(recentVendorOrder.id),
      bookId: Number(recentVendorBook.id),
      vendorUserId: Number(vendor.id),
      titleSnapshot: 'Atomic Habits tiếng Việt',
      unitPrice: 70000,
    });
    await Order.update(
      { created_at: new Date('2026-06-20T08:30:00.000Z') },
      { where: { id: recentVendorOrder.id }, silent: true },
    );

    const localBoundaryBook = await seedBook(vendor.id, { price: 65000 });
    const localBoundaryOrder = await Order.create({
      userId: buyer.id,
      code: `ATH-VO-LOCAL-${Date.now()}`,
      status: 'NEW',
      subtotal: 65000,
      total: 65000,
      currency: 'VND',
    });
    localBoundaryOrderCode = localBoundaryOrder.code;
    await OrderItem.create({
      orderId: Number(localBoundaryOrder.id),
      bookId: Number(localBoundaryBook.id),
      vendorUserId: Number(vendor.id),
      titleSnapshot: 'Boundary Local Time',
      unitPrice: 65000,
    });
    await Order.update(
      { created_at: new Date('2026-06-20T00:30:00.000+07:00') },
      { where: { id: localBoundaryOrder.id }, silent: true },
    );

    // Create an order for otherVendor only (not related to vendor)
    const otherBook = await seedBook(otherVendor.id, { price: 30000 });
    const otherOrder = await Order.create({
      userId: buyer.id,
      code: `ATH-VO-OTHER-${Date.now()}`,
      status: 'NEW',
      subtotal: 30000,
      total: 30000,
      currency: 'VND',
    });
    await OrderItem.create({
      orderId: Number(otherOrder.id),
      bookId: Number(otherBook.id),
      vendorUserId: Number(otherVendor.id),
      titleSnapshot: 'Sách Other',
      unitPrice: 30000,
    });
  });

  it('VO1. vendor sees orders containing their books', async () => {
    const res = await request(app)
      .get('/api/v1/vendor/orders')
      .set('Authorization', `Bearer ${tokenVendor}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);

    const order = res.body.data[0];
    expect(order).toHaveProperty('code');
    expect(order).toHaveProperty('status');
    expect(order).toHaveProperty('total');
    expect(order).toHaveProperty('items');
    expect(Array.isArray(order.items)).toBe(true);
    // All items belong to this vendor
    order.items.forEach((item: any) => {
      expect(item).toHaveProperty('titleSnapshot');
      expect(item).toHaveProperty('unitPrice');
    });
    // providerTxnId NOT exposed
    expect(order.providerTxnId).toBeUndefined();
  });

  it('VO2. vendor does NOT see orders with only other vendor items', async () => {
    const res = await request(app)
      .get('/api/v1/vendor/orders')
      .set('Authorization', `Bearer ${tokenVendor}`);

    expect(res.status).toBe(200);
    const codes = res.body.data.map((o: any) => o.code);
    // otherVendor's order should NOT appear
    codes.forEach((code: string) => {
      expect(code).not.toMatch(/VO-OTHER/);
    });
  });

  it('VO3. user token → 403', async () => {
    const res = await request(app)
      .get('/api/v1/vendor/orders')
      .set('Authorization', `Bearer ${tokenUser}`);

    expect(res.status).toBe(403);
  });

  it('VO4. filters by q matching order code or vendor book title', async () => {
    const byCode = await request(app)
      .get(`/api/v1/vendor/orders?q=${encodeURIComponent('search')}`)
      .set('Authorization', `Bearer ${tokenVendor}`);

    expect(byCode.status).toBe(200);
    expect(byCode.body.data.map((o: any) => o.code)).toEqual([recentVendorOrderCode]);

    const byTitle = await request(app)
      .get(`/api/v1/vendor/orders?q=${encodeURIComponent('atomic')}`)
      .set('Authorization', `Bearer ${tokenVendor}`);

    expect(byTitle.status).toBe(200);
    expect(byTitle.body.data.map((o: any) => o.code)).toEqual([recentVendorOrderCode]);
  });

  it('VO5. filters by created date range inclusively by day', async () => {
    const res = await request(app)
      .get('/api/v1/vendor/orders?fromDate=2026-06-15&toDate=2026-06-20')
      .set('Authorization', `Bearer ${tokenVendor}`);

    expect(res.status).toBe(200);
    const codes = res.body.data.map((o: any) => o.code);
    expect(codes).toContain(recentVendorOrderCode);
    expect(codes).not.toContain(vendorOrderCode);
  });

  it('VO6. keeps orders created on the selected local day without requiring previous date', async () => {
    const res = await request(app)
      .get('/api/v1/vendor/orders?fromDate=2026-06-20&toDate=2026-06-20')
      .set('Authorization', `Bearer ${tokenVendor}`);

    expect(res.status).toBe(200);
    const codes = res.body.data.map((o: any) => o.code);
    expect(codes).toContain(localBoundaryOrderCode);
  });
});
