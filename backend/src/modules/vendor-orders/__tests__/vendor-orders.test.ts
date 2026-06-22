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
    await OrderItem.create({
      orderId: Number(order.id),
      bookId: Number(vendorBook.id),
      vendorUserId: Number(vendor.id),
      titleSnapshot: 'Sách Test VO',
      unitPrice: 50000,
    });

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
});
