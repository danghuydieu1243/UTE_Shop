import request from 'supertest';
import { createApp } from '../../../app';
import { User, Book, Order, OrderItem, Review, Author } from '../../../db/models';
import { signAccessToken } from '../../auth/token.service';

const app = createApp();

let uid = 0;
function uniq() { return `${Date.now()}${++uid}${Math.random().toString(36).slice(2)}`; }

async function makeVendor() {
  const u = await User.create({
    email: `v${uniq()}@e.com`, fullName: 'Vendor', passwordHash: 'x',
    role: 'vendor', status: 'active',
  } as any);
  return { id: Number(u.id), token: signAccessToken({ id: Number(u.id), role: 'vendor' }) };
}

async function makeUser() {
  const u = await User.create({
    email: `u${uniq()}@e.com`, fullName: 'Buyer', passwordHash: 'x',
    role: 'user', status: 'active',
  } as any);
  return { id: Number(u.id), token: signAccessToken({ id: Number(u.id), role: 'user' }) };
}

async function makeBook(vendorUserId: number, status = 'published') {
  const author = await Author.create({ name: `Author-${uniq()}` } as any);
  const b = await Book.create({
    vendorUserId,
    title: `Book-${uniq()}`,
    slug: `slug-${uniq()}`,
    authorId: Number(author.id),
    price: 50000,
    fileFormat: 'pdf',
    status,
  } as any);
  return { id: Number(b.id), authorId: Number(author.id) };
}

async function makeOrder(
  userId: number,
  status: string,
  completedAt: Date | null,
  items: { bookId: number; vendorUserId: number; unitPrice: number; titleSnapshot: string }[],
) {
  const o = await Order.create({
    code: `ORD-${uniq()}`,
    userId,
    status,
    subtotal: items.reduce((s, i) => s + i.unitPrice, 0),
    total: items.reduce((s, i) => s + i.unitPrice, 0),
    completedAt,
  } as any);
  for (const it of items) {
    await OrderItem.create({
      orderId: Number(o.id),
      bookId: it.bookId,
      vendorUserId: it.vendorUserId,
      titleSnapshot: it.titleSnapshot,
      unitPrice: it.unitPrice,
    } as any);
  }
  return o;
}

// ─── VA1: revenue counts only vendor's items in COMPLETED orders ────────────
it('VA1: revenue = Σ unitPrice vendor items trong COMPLETED; vendor khác KHÔNG tính', async () => {
  const vendor = await makeVendor();
  const vendor2 = await makeVendor();
  const buyer = await makeUser();
  const book1 = await makeBook(vendor.id);
  const book2 = await makeBook(vendor2.id);

  const now = new Date();
  await makeOrder(buyer.id, 'COMPLETED', now, [
    { bookId: book1.id, vendorUserId: vendor.id, unitPrice: 100000, titleSnapshot: 'Book A' },
    { bookId: book2.id, vendorUserId: vendor2.id, unitPrice: 200000, titleSnapshot: 'Book B' },
  ]);

  const res = await request(app)
    .get('/api/v1/vendor/stats/dashboard?period=7d')
    .set('Authorization', `Bearer ${vendor.token}`);

  expect(res.status).toBe(200);
  expect(res.body.data.kpis.revenue).toBe(100000);
  expect(res.body.data.kpis.orders).toBe(1);
});

// ─── VA2: non-COMPLETED orders NOT counted ──────────────────────────────────
it('VA2: đơn NEW/CANCELLED KHÔNG tính revenue', async () => {
  const vendor = await makeVendor();
  const buyer = await makeUser();
  const book = await makeBook(vendor.id);
  const now = new Date();

  await makeOrder(buyer.id, 'NEW', null, [
    { bookId: book.id, vendorUserId: vendor.id, unitPrice: 99000, titleSnapshot: 'Book X' },
  ]);
  await makeOrder(buyer.id, 'CANCELLED', null, [
    { bookId: book.id, vendorUserId: vendor.id, unitPrice: 99000, titleSnapshot: 'Book X' },
  ]);

  const res = await request(app)
    .get('/api/v1/vendor/stats/dashboard?period=30d')
    .set('Authorization', `Bearer ${vendor.token}`);

  expect(res.status).toBe(200);
  expect(res.body.data.kpis.revenue).toBe(0);
  expect(res.body.data.kpis.orders).toBe(0);
  // NEW orders should appear in recentOrders
  expect(res.body.data.recentOrders.length).toBeGreaterThanOrEqual(1);
});

// ─── VA3: completedAt outside period NOT counted ─────────────────────────────
it('VA3: completedAt ngoài kỳ (7d) KHÔNG tính revenue', async () => {
  const vendor = await makeVendor();
  const buyer = await makeUser();
  const book = await makeBook(vendor.id);

  const oldDate = new Date();
  oldDate.setDate(oldDate.getDate() - 30); // 30 days ago, outside 7d window

  await makeOrder(buyer.id, 'COMPLETED', oldDate, [
    { bookId: book.id, vendorUserId: vendor.id, unitPrice: 55000, titleSnapshot: 'Old Book' },
  ]);

  const res = await request(app)
    .get('/api/v1/vendor/stats/dashboard?period=7d')
    .set('Authorization', `Bearer ${vendor.token}`);

  expect(res.status).toBe(200);
  expect(res.body.data.kpis.revenue).toBe(0);
  expect(res.body.data.kpis.orders).toBe(0);
});

// ─── VA4: productsOnSale only published books ────────────────────────────────
it('VA4: productsOnSale chỉ đếm book published của vendor', async () => {
  const vendor = await makeVendor();
  await makeBook(vendor.id, 'published');
  await makeBook(vendor.id, 'published');
  await makeBook(vendor.id, 'draft');

  const res = await request(app)
    .get('/api/v1/vendor/stats/dashboard?period=30d')
    .set('Authorization', `Bearer ${vendor.token}`);

  expect(res.status).toBe(200);
  expect(res.body.data.kpis.productsOnSale).toBe(2);
});

// ─── VA5: avgRating from reviews on vendor's books ──────────────────────────
it('VA5: avgRating = trung bình reviews trên sách vendor', async () => {
  const vendor = await makeVendor();
  const buyer = await makeUser();
  const book = await makeBook(vendor.id);
  const buyer2 = await makeUser();

  // Need orders for review FK
  const o1 = await makeOrder(buyer.id, 'COMPLETED', new Date(), [
    { bookId: book.id, vendorUserId: vendor.id, unitPrice: 50000, titleSnapshot: 'B' },
  ]);
  const o2 = await makeOrder(buyer2.id, 'COMPLETED', new Date(), [
    { bookId: book.id, vendorUserId: vendor.id, unitPrice: 50000, titleSnapshot: 'B' },
  ]);

  await Review.create({ userId: buyer.id, bookId: book.id, orderId: Number(o1.id), rating: 4 } as any);
  await Review.create({ userId: buyer2.id, bookId: book.id, orderId: Number(o2.id), rating: 5 } as any);

  const res = await request(app)
    .get('/api/v1/vendor/stats/dashboard?period=30d')
    .set('Authorization', `Bearer ${vendor.token}`);

  expect(res.status).toBe(200);
  // (4+5)/2 = 4.5
  expect(res.body.data.kpis.avgRating).toBe(4.5);
});

// ─── VA6: revenueSeries is bucketed array with zeros, sum == revenue ─────────
it('VA6: revenueSeries mảng {date,value}, zero-fill, tổng = revenue', async () => {
  const vendor = await makeVendor();
  const buyer = await makeUser();
  const book = await makeBook(vendor.id);

  const now = new Date();
  await makeOrder(buyer.id, 'COMPLETED', now, [
    { bookId: book.id, vendorUserId: vendor.id, unitPrice: 75000, titleSnapshot: 'Test' },
  ]);

  const res = await request(app)
    .get('/api/v1/vendor/stats/dashboard?period=7d')
    .set('Authorization', `Bearer ${vendor.token}`);

  expect(res.status).toBe(200);
  const series = res.body.data.revenueSeries;
  expect(Array.isArray(series)).toBe(true);
  expect(series.length).toBe(7); // 7 days
  expect(series.every((s: any) => typeof s.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s.date))).toBe(true);
  const total = series.reduce((s: number, r: any) => s + r.value, 0);
  expect(total).toBe(75000);
  expect(total).toBe(res.body.data.kpis.revenue);
});

// ─── VA7: topBooks sorted by sold desc, max 5 ───────────────────────────────
it('VA7: topBooks xếp theo sold desc, tối đa 5', async () => {
  const vendor = await makeVendor();
  const buyer = await makeUser();
  const now = new Date();

  // Create 6 books
  const books = await Promise.all(Array.from({ length: 6 }, () => makeBook(vendor.id)));

  // book[0] sold 3 times (most), book[1] 2, books[2-5] 1 each
  await makeOrder(buyer.id, 'COMPLETED', now, [
    { bookId: books[0].id, vendorUserId: vendor.id, unitPrice: 10000, titleSnapshot: 'A' },
  ]);
  await makeOrder(buyer.id, 'COMPLETED', now, [
    { bookId: books[0].id, vendorUserId: vendor.id, unitPrice: 10000, titleSnapshot: 'A' },
    { bookId: books[1].id, vendorUserId: vendor.id, unitPrice: 10000, titleSnapshot: 'B' },
  ]);
  await makeOrder(buyer.id, 'COMPLETED', now, [
    { bookId: books[0].id, vendorUserId: vendor.id, unitPrice: 10000, titleSnapshot: 'A' },
    { bookId: books[1].id, vendorUserId: vendor.id, unitPrice: 10000, titleSnapshot: 'B' },
    { bookId: books[2].id, vendorUserId: vendor.id, unitPrice: 10000, titleSnapshot: 'C' },
    { bookId: books[3].id, vendorUserId: vendor.id, unitPrice: 10000, titleSnapshot: 'D' },
    { bookId: books[4].id, vendorUserId: vendor.id, unitPrice: 10000, titleSnapshot: 'E' },
    { bookId: books[5].id, vendorUserId: vendor.id, unitPrice: 10000, titleSnapshot: 'F' },
  ]);

  const res = await request(app)
    .get('/api/v1/vendor/stats/dashboard?period=7d')
    .set('Authorization', `Bearer ${vendor.token}`);

  expect(res.status).toBe(200);
  const top = res.body.data.topBooks;
  expect(top.length).toBeLessThanOrEqual(5);
  expect(top[0].bookId).toBe(books[0].id);
  expect(top[0].sold).toBe(3);
  expect(top[1].sold).toBe(2);
});

// ─── VA8: recentOrders only NEW orders with vendor items ─────────────────────
it('VA8: recentOrders chỉ đơn NEW có item vendor', async () => {
  const vendor = await makeVendor();
  const buyer = await makeUser();
  const book = await makeBook(vendor.id);

  const newOrder = await makeOrder(buyer.id, 'NEW', null, [
    { bookId: book.id, vendorUserId: vendor.id, unitPrice: 30000, titleSnapshot: 'New Book' },
  ]);
  // COMPLETED order should NOT appear in recentOrders
  await makeOrder(buyer.id, 'COMPLETED', new Date(), [
    { bookId: book.id, vendorUserId: vendor.id, unitPrice: 30000, titleSnapshot: 'Done Book' },
  ]);

  const res = await request(app)
    .get('/api/v1/vendor/stats/dashboard?period=30d')
    .set('Authorization', `Bearer ${vendor.token}`);

  expect(res.status).toBe(200);
  const recent = res.body.data.recentOrders;
  expect(Array.isArray(recent)).toBe(true);
  const codes = recent.map((r: any) => r.code);
  expect(codes).toContain((newOrder as any).code);
  // should have title and total
  const found = recent.find((r: any) => r.code === (newOrder as any).code);
  expect(found).toBeDefined();
  expect(found.title).toBe('New Book');
  expect(found.total).toBe(30000);
});

// ─── VA9: RBAC — user role 'user' → 403 ──────────────────────────────────────
it('VA9: role user → 403', async () => {
  const user = await makeUser();
  const res = await request(app)
    .get('/api/v1/vendor/stats/dashboard')
    .set('Authorization', `Bearer ${user.token}`);
  expect(res.status).toBe(403);
});
