import request from 'supertest';
import { createApp } from '../../../app';
import { User, Vendor, Order, OrderItem, Payment, Book } from '../../../db/models';
import { signAccessToken } from '../../auth/token.service';

const app = createApp();

let uidCounter = 0;
function uid() {
  return `${Date.now()}-${++uidCounter}-${Math.random().toString(36).slice(2)}`;
}

async function seedUser(role: 'user' | 'vendor' | 'admin' | 'manager', suffix = '') {
  return User.create({
    email: `${role}${suffix}-${uid()}@test-adminorders.com`,
    passwordHash: 'hash',
    role,
    fullName: `Test ${role} ${suffix}`,
    status: 'active',
  });
}

async function seedBook(vendorUserId: number, title = 'Book') {
  return Book.create({
    vendorUserId,
    title: `${title}-${uid()}`,
    slug: `book-${uid()}`,
    price: 50000,
    fileFormat: 'PDF',
    status: 'published',
  });
}

async function seedOrder(
  userId: number,
  status = 'NEW',
  opts: { code?: string } = {},
) {
  return Order.create({
    code: opts.code ?? `ORD-${uid()}`.slice(0, 20),
    userId,
    status,
    subtotal: 100000,
    total: 100000,
    currency: 'VND',
  });
}

async function seedOrderItem(
  orderId: number,
  bookId: number,
  vendorUserId: number,
  titleSnapshot = 'Title',
) {
  return OrderItem.create({
    orderId,
    bookId,
    vendorUserId,
    titleSnapshot,
    unitPrice: 100000,
  });
}

async function seedPayment(
  orderId: number,
  status = 'PENDING',
  providerTxnId: string | null = 'TXN-SECRET-123',
) {
  return Payment.create({
    orderId,
    amount: 100000,
    currency: 'VND',
    status,
    referenceCode: `REF-${uid()}`.slice(0, 40),
    providerTxnId,
    expiresAt: new Date(Date.now() + 3600 * 1000),
  });
}

function makeToken(userId: number, role: string) {
  return signAccessToken({ id: userId, role });
}

describe('Admin Orders API', () => {
  let admin: User;
  let manager: User;
  let buyer: User;
  let normalUser: User;
  let vendorUser: User;
  let order1: Order;
  let order2: Order;
  let cancelledOrder: Order;
  let book1: Book;

  let adminToken: string;
  let managerToken: string;
  let userToken: string;

  beforeAll(async () => {
    admin = await seedUser('admin', 'ao-a');
    manager = await seedUser('manager', 'ao-m');
    buyer = await seedUser('user', 'ao-b');
    normalUser = await seedUser('user', 'ao-u');
    vendorUser = await seedUser('vendor', 'ao-v');

    book1 = await seedBook(vendorUser.id, 'TestBook');

    order1 = await seedOrder(buyer.id, 'NEW');
    await seedOrderItem(order1.id, book1.id, vendorUser.id, 'TestBook Title');
    await seedPayment(order1.id, 'PENDING', 'SECRET_TXN_ID_123');

    order2 = await seedOrder(buyer.id, 'COMPLETED');
    await seedOrderItem(order2.id, book1.id, vendorUser.id, 'Another Book');

    cancelledOrder = await seedOrder(buyer.id, 'CANCELLED');

    adminToken = makeToken(admin.id, 'admin');
    managerToken = makeToken(manager.id, 'manager');
    userToken = makeToken(normalUser.id, 'user');
  });

  // ── AO1: admin GET /admin/orders → 200 paginated + DTO fields ────────────
  it('AO1. admin lists orders — 200, paginated, DTO fields present', async () => {
    const res = await request(app)
      .get('/api/v1/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta?.pagination).toBeDefined();

    const found = res.body.data.find((o: any) => o.code === order1.code);
    expect(found).toBeDefined();
    expect(found).toHaveProperty('code');
    expect(found).toHaveProperty('status');
    expect(found).toHaveProperty('buyerName');
    expect(found).toHaveProperty('buyerEmail');
    expect(found).toHaveProperty('total');
    expect(found).toHaveProperty('paymentStatus');
    expect(found).toHaveProperty('createdAt');
    expect(found).toHaveProperty('itemsBrief');
  });

  // ── AO2: manager GET /admin/orders → 200 ─────────────────────────────────
  it('AO2. manager lists orders — 200 OK', async () => {
    const res = await request(app)
      .get('/api/v1/admin/orders')
      .set('Authorization', `Bearer ${managerToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  // ── AO3: plain user → 403 ─────────────────────────────────────────────────
  it('AO3. plain user GET /admin/orders → 403', async () => {
    const res = await request(app)
      .get('/api/v1/admin/orders')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(403);
  });

  // ── AO4: filter by status ─────────────────────────────────────────────────
  it('AO4. filter by status=NEW — returns only NEW orders', async () => {
    const res = await request(app)
      .get('/api/v1/admin/orders?status=NEW')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    // All returned orders must have status NEW
    for (const o of res.body.data) {
      expect(o.status).toBe('NEW');
    }
    // our order1 (NEW) must be included
    const found = res.body.data.find((o: any) => o.code === order1.code);
    expect(found).toBeDefined();
  });

  // ── AO5: filter by vendorUserId ───────────────────────────────────────────
  it('AO5. filter by vendorUserId — only returns orders with items from that vendor', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/orders?vendorUserId=${vendorUser.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    // cancelledOrder has no items → should not appear
    const foundCancelled = res.body.data.find((o: any) => o.code === cancelledOrder.code);
    expect(foundCancelled).toBeUndefined();
    // order1 has items from vendorUser → should appear
    const found = res.body.data.find((o: any) => o.code === order1.code);
    expect(found).toBeDefined();
  });

  // ── AO6: GET /admin/orders/:code detail → 200, has items + payment ────────
  it('AO6. admin GET /admin/orders/:code — detail with items and payment, no providerTxnId', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/orders/${order1.code}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveProperty('code', order1.code);
    expect(res.body.data).toHaveProperty('status');
    expect(res.body.data).toHaveProperty('subtotal');
    expect(res.body.data).toHaveProperty('total');
    expect(Array.isArray(res.body.data.items)).toBe(true);
    expect(res.body.data.items.length).toBeGreaterThan(0);
    expect(res.body.data.items[0]).toHaveProperty('bookId');
    expect(res.body.data.items[0]).toHaveProperty('titleSnapshot');
    expect(res.body.data.items[0]).toHaveProperty('unitPrice');
    expect(res.body.data).toHaveProperty('payment');
    expect(res.body.data.payment).toHaveProperty('status');
    expect(res.body.data.payment).toHaveProperty('amount');
    expect(res.body.data.payment).toHaveProperty('expiresAt');

    // CRITICAL: providerTxnId must NOT appear anywhere in the response body
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain('providerTxnId');
    expect(bodyStr).not.toContain('provider_txn_id');
    expect(bodyStr).not.toContain('SECRET_TXN_ID_123');
  });

  // ── AO7: nonexistent code → 404 ───────────────────────────────────────────
  it('AO7. GET /admin/orders/:code for nonexistent code → 404', async () => {
    const res = await request(app)
      .get('/api/v1/admin/orders/DOES-NOT-EXIST-9999')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  // ── AO8: payment status included, providerTxnId absent ───────────────────
  it('AO8. admin GET /admin/orders/:code — payment.status included but providerTxnId absent', async () => {
    const res = await request(app)
      .get(`/api/v1/admin/orders/${order1.code}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    // payment status is present
    expect(res.body.data.payment?.status).toBeDefined();

    // Scan the ENTIRE JSON string for the sensitive field
    const bodyStr = JSON.stringify(res.body);
    expect(bodyStr).not.toContain('providerTxnId');
    expect(bodyStr).not.toContain('provider_txn_id');
  });
});
