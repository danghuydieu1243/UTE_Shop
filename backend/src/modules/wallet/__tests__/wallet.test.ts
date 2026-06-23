/**
 * Wallet test suite — W1–W5
 * Tests cho vendor wallet: credit hook trong completePayment + GET /vendor/wallet
 */

import request from 'supertest';
import { createApp } from '../../../app';
import {
  User, Vendor, Book, Order, OrderItem, Payment, VendorWallet, WalletTransaction,
} from '../../../db/models';
import { signAccessToken } from '../../auth/token.service';
import { completePayment } from '../../payments/payments.service';

const app = createApp();

// ── Helpers ───────────────────────────────────────────────────────────────────

async function seedUser(role: 'user' | 'vendor' | 'admin' = 'user', suffix = '') {
  return User.create({
    email: `${role}${suffix}${Date.now()}@test-wallet.com`,
    passwordHash: 'hash',
    role,
    fullName: `Test ${role}`,
    status: 'active',
  });
}

async function seedBook(vendorUserId: number, opts: { price?: number } = {}) {
  const slug = `test-book-wallet-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return Book.create({
    vendorUserId,
    title: 'Sách Test Wallet',
    slug,
    price: opts.price ?? 100000,
    fileFormat: 'PDF',
    status: 'published',
  });
}

function makeToken(userId: number, role = 'user') {
  return signAccessToken({ id: userId, role });
}

/**
 * Tạo order PENDING + payment để gọi completePayment
 */
async function createPendingOrder(
  buyerId: number,
  vendorId: number,
  bookId: number,
  price = 100000,
) {
  const code = `ATH-WLT-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const order = await Order.create({
    userId: buyerId,
    code,
    status: 'NEW',
    subtotal: price,
    total: price,
    currency: 'VND',
  });
  await OrderItem.create({
    orderId: Number(order.id),
    bookId,
    vendorUserId: vendorId,
    titleSnapshot: 'Sách Test Wallet',
    unitPrice: price,
  });
  const payment = await Payment.create({
    orderId: Number(order.id),
    provider: 'sepay',
    amount: price,
    currency: 'VND',
    status: 'PENDING',
    referenceCode: code,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });
  return { order, payment };
}

// ── W1: completePayment → vendor wallet credited correctly ────────────────────

describe('W1: completePayment → ví vendor được cộng đúng', () => {
  it('W1. availableBalance = unitPrice của vendor; 1 sale_credit trong wallet_transactions', async () => {
    const buyer = await seedUser('user', `w1b-${Date.now()}`);
    const vendor = await seedUser('vendor', `w1v-${Date.now()}`);
    const book = await seedBook(vendor.id, { price: 120000 });

    const { payment } = await createPendingOrder(buyer.id, vendor.id, book.id, 120000);
    await completePayment(payment.id, { userId: buyer.id });

    const wallet = await VendorWallet.findOne({ where: { vendorUserId: vendor.id } });
    expect(wallet).not.toBeNull();
    expect(Number(wallet!.availableBalance)).toBe(120000);

    const txns = await WalletTransaction.findAll({
      where: { vendorUserId: vendor.id, type: 'sale_credit' },
    });
    expect(txns).toHaveLength(1);
    expect(Number(txns[0].amount)).toBe(120000);
    expect(Number(txns[0].balanceAfter)).toBe(120000);
  });
});

// ── W2: idempotency — call completePayment twice → balance NOT doubled ─────────

describe('W2: idempotency — gọi completePayment 2 lần → balance không cộng kép', () => {
  it('W2. balance vẫn là 1 lần credit, chỉ có 1 sale_credit record', async () => {
    const buyer = await seedUser('user', `w2b-${Date.now()}`);
    const vendor = await seedUser('vendor', `w2v-${Date.now()}`);
    const book = await seedBook(vendor.id, { price: 85000 });

    const { payment } = await createPendingOrder(buyer.id, vendor.id, book.id, 85000);

    // Lần 1 — PENDING → PAID
    await completePayment(payment.id, { userId: buyer.id });
    // Lần 2 — idempotent (payment đã PAID → return sớm, không chạy credit block)
    await completePayment(payment.id, { userId: buyer.id });

    const wallet = await VendorWallet.findOne({ where: { vendorUserId: vendor.id } });
    expect(Number(wallet!.availableBalance)).toBe(85000);

    const txns = await WalletTransaction.findAll({
      where: { vendorUserId: vendor.id, type: 'sale_credit' },
    });
    expect(txns).toHaveLength(1);
  });
});

// ── W3: 2-vendor order → each wallet credited correctly ──────────────────────

describe('W3: đơn 2 vendor → mỗi ví cộng đúng phần của mình', () => {
  it('W3. vendor A nhận 70k, vendor B nhận 50k', async () => {
    const buyer = await seedUser('user', `w3b-${Date.now()}`);
    const vendorA = await seedUser('vendor', `w3a-${Date.now()}`);
    const vendorB = await seedUser('vendor', `w3b2-${Date.now()}`);
    const bookA = await seedBook(vendorA.id, { price: 70000 });
    const bookB = await seedBook(vendorB.id, { price: 50000 });

    const code = `ATH-W3-${Date.now()}`;
    const order = await Order.create({
      userId: buyer.id,
      code,
      status: 'NEW',
      subtotal: 120000,
      total: 120000,
      currency: 'VND',
    });
    await OrderItem.create({
      orderId: Number(order.id),
      bookId: Number(bookA.id),
      vendorUserId: vendorA.id,
      titleSnapshot: 'Sách A',
      unitPrice: 70000,
    });
    await OrderItem.create({
      orderId: Number(order.id),
      bookId: Number(bookB.id),
      vendorUserId: vendorB.id,
      titleSnapshot: 'Sách B',
      unitPrice: 50000,
    });
    const payment = await Payment.create({
      orderId: Number(order.id),
      provider: 'sepay',
      amount: 120000,
      currency: 'VND',
      status: 'PENDING',
      referenceCode: code,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    await completePayment(payment.id, { userId: buyer.id });

    const walletA = await VendorWallet.findOne({ where: { vendorUserId: vendorA.id } });
    const walletB = await VendorWallet.findOne({ where: { vendorUserId: vendorB.id } });

    expect(Number(walletA!.availableBalance)).toBe(70000);
    expect(Number(walletB!.availableBalance)).toBe(50000);

    const txnsA = await WalletTransaction.findAll({ where: { vendorUserId: vendorA.id, type: 'sale_credit' } });
    const txnsB = await WalletTransaction.findAll({ where: { vendorUserId: vendorB.id, type: 'sale_credit' } });
    expect(txnsA).toHaveLength(1);
    expect(txnsB).toHaveLength(1);
  });
});

// ── W4: GET /vendor/wallet — data shape ──────────────────────────────────────

describe('W4: GET /api/v1/vendor/wallet → data đúng shape', () => {
  it('W4. availableBalance đúng, pendingBalance từ đơn NEW, monthlySeries 6 phần tử, transactions array', async () => {
    const buyer = await seedUser('user', `w4b-${Date.now()}`);
    const vendor = await seedUser('vendor', `w4v-${Date.now()}`);
    await Vendor.create({
      userId: vendor.id,
      shopName: `Wallet Shop ${Date.now()}`,
      shopSlug: `wallet-shop-${Date.now()}`,
    });
    const tokenVendor = makeToken(vendor.id, 'vendor');
    const book = await seedBook(vendor.id, { price: 60000 });

    // Complete a payment → credits 60k
    const { payment } = await createPendingOrder(buyer.id, vendor.id, book.id, 60000);
    await completePayment(payment.id, { userId: buyer.id });

    // Create a NEW order for vendor (pending balance source)
    const pendingBook = await seedBook(vendor.id, { price: 30000 });
    const codeNew = `ATH-W4-NEW-${Date.now()}`;
    const newOrder = await Order.create({
      userId: buyer.id,
      code: codeNew,
      status: 'NEW',
      subtotal: 30000,
      total: 30000,
      currency: 'VND',
    });
    await OrderItem.create({
      orderId: Number(newOrder.id),
      bookId: Number(pendingBook.id),
      vendorUserId: vendor.id,
      titleSnapshot: 'Sách Pending',
      unitPrice: 30000,
    });

    const res = await request(app)
      .get('/api/v1/vendor/wallet')
      .set('Authorization', `Bearer ${tokenVendor}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const d = res.body.data;
    expect(d.availableBalance).toBe(60000);
    expect(d.pendingBalance).toBe(30000);
    expect(d.totalWithdrawn).toBe(0);
    expect(Array.isArray(d.monthlySeries)).toBe(true);
    expect(d.monthlySeries).toHaveLength(6);
    expect(Array.isArray(d.transactions)).toBe(true);
    expect(d.transactions.length).toBeGreaterThanOrEqual(1);

    // Check transaction shape
    const tx = d.transactions[0];
    expect(tx).toHaveProperty('id');
    expect(tx).toHaveProperty('type');
    expect(tx).toHaveProperty('amount');
    expect(tx).toHaveProperty('description');
    expect(tx).toHaveProperty('status');
    expect(tx).toHaveProperty('createdAt');

    // Pagination in meta
    expect(res.body.meta.pagination).toBeDefined();
    expect(res.body.meta.pagination.total).toBeGreaterThanOrEqual(1);
  });
});

// ── W5: RBAC — user → 403 ─────────────────────────────────────────────────────

describe('W5: RBAC — user gọi GET /vendor/wallet → 403', () => {
  it('W5. user role → 403 FORBIDDEN', async () => {
    const user = await seedUser('user', `w5u-${Date.now()}`);
    const token = makeToken(user.id, 'user');

    const res = await request(app)
      .get('/api/v1/vendor/wallet')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});
