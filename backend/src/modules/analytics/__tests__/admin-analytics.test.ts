import request from 'supertest';
import { createApp } from '../../../app';
import { User, Vendor, Book, Order, OrderItem, Author } from '../../../db/models';
import { signAccessToken } from '../../auth/token.service';

const app = createApp();

let uid = 0;
function uniq() { return `${Date.now()}${++uid}${Math.random().toString(36).slice(2)}`; }

async function makeUser(role = 'user') {
  const u = await User.create({
    email: `u${uniq()}@e.com`,
    fullName: `User-${uniq()}`,
    passwordHash: 'x',
    role,
    status: 'active',
    created_at: new Date(),
  } as any);
  return { id: Number(u.id), token: signAccessToken({ id: Number(u.id), role }) };
}

async function makeVendorUser() {
  const u = await User.create({
    email: `v${uniq()}@e.com`,
    fullName: `VendorUser-${uniq()}`,
    passwordHash: 'x',
    role: 'vendor',
    status: 'active',
  } as any);
  const v = await Vendor.create({
    userId: Number(u.id),
    shopName: `Shop-${uniq()}`,
    shopSlug: `shop-${uniq()}`,
    status: 'active',
  } as any);
  return { userId: Number(u.id), shopName: (v as any).shopName as string };
}

async function makeBook(vendorUserId: number) {
  const author = await Author.create({ name: `Author-${uniq()}` } as any);
  const b = await Book.create({
    vendorUserId,
    title: `Book-${uniq()}`,
    slug: `slug-${uniq()}`,
    authorId: Number(author.id),
    price: 50000,
    fileFormat: 'pdf',
    status: 'published',
  } as any);
  return { id: Number(b.id) };
}

async function makeOrder(
  userId: number,
  status: string,
  completedAt: Date | null,
  items: { bookId: number; vendorUserId: number; unitPrice: number; titleSnapshot: string }[],
) {
  const total = items.reduce((s, i) => s + i.unitPrice, 0);
  const o = await Order.create({
    code: `ORD-${uniq()}`,
    userId,
    status,
    subtotal: total,
    total,
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

// ─── AA1: KPI totalUsers/totalVendors ────────────────────────────────────────
it('AA1: totalUsers = role user count, totalVendors = active vendor count', async () => {
  const admin = await makeUser('admin');

  // Lấy baseline trước khi tạo
  const resBefore = await request(app)
    .get('/api/v1/admin/stats/dashboard?period=30d')
    .set('Authorization', `Bearer ${admin.token}`);
  expect(resBefore.status).toBe(200);
  const before = resBefore.body.data.kpis;

  // Tạo thêm 2 user + 1 active vendor
  await makeUser('user');
  await makeUser('user');
  const vendor = await makeVendorUser();
  void vendor;

  const resAfter = await request(app)
    .get('/api/v1/admin/stats/dashboard?period=30d')
    .set('Authorization', `Bearer ${admin.token}`);
  expect(resAfter.status).toBe(200);
  const after = resAfter.body.data.kpis;

  expect(after.totalUsers).toBe(before.totalUsers + 2);
  expect(after.totalVendors).toBe(before.totalVendors + 1);
});

// ─── AA2: revenue admin = Σ total COMPLETED trong kỳ ─────────────────────────
it('AA2: revenue (admin) = Σ total đơn COMPLETED trong kỳ; đơn NEW không tính', async () => {
  const admin = await makeUser('admin');
  const buyer = await makeUser('user');
  const vendor = await makeVendorUser();
  const book = await makeBook(vendor.userId);
  const now = new Date();

  const resBefore = await request(app)
    .get('/api/v1/admin/stats/dashboard?period=30d')
    .set('Authorization', `Bearer ${admin.token}`);
  const revBefore = resBefore.body.data.kpis.revenue as number;

  await makeOrder(buyer.id, 'COMPLETED', now, [
    { bookId: book.id, vendorUserId: vendor.userId, unitPrice: 120000, titleSnapshot: 'Book A' },
  ]);
  await makeOrder(buyer.id, 'NEW', null, [
    { bookId: book.id, vendorUserId: vendor.userId, unitPrice: 999000, titleSnapshot: 'Book B' },
  ]);

  const resAfter = await request(app)
    .get('/api/v1/admin/stats/dashboard?period=30d')
    .set('Authorization', `Bearer ${admin.token}`);
  expect(resAfter.status).toBe(200);
  expect(resAfter.body.data.kpis.revenue).toBe(revBefore + 120000);
});

// ─── AA3: revenueSeries zero-fill, sum == revenue ─────────────────────────────
it('AA3: revenueSeries mảng fill-0, tổng = revenue', async () => {
  const admin = await makeUser('admin');
  const buyer = await makeUser('user');
  const vendor = await makeVendorUser();
  const book = await makeBook(vendor.userId);
  const now = new Date();

  await makeOrder(buyer.id, 'COMPLETED', now, [
    { bookId: book.id, vendorUserId: vendor.userId, unitPrice: 80000, titleSnapshot: 'B' },
  ]);

  const res = await request(app)
    .get('/api/v1/admin/stats/dashboard?period=7d')
    .set('Authorization', `Bearer ${admin.token}`);
  expect(res.status).toBe(200);

  const series = res.body.data.revenueSeries as { date: string; value: number }[];
  expect(Array.isArray(series)).toBe(true);
  expect(series.length).toBe(7);
  expect(series.every((s) => /^\d{4}-\d{2}-\d{2}$/.test(s.date))).toBe(true);

  const sumSeries = series.reduce((s, r) => s + r.value, 0);
  expect(sumSeries).toBeGreaterThanOrEqual(80000);
  expect(sumSeries).toBe(res.body.data.kpis.revenue);
});

// ─── AA4: newUsersSeries 7 phần tử, đếm đúng ─────────────────────────────────
it('AA4: newUsersSeries 7 phần tử, đúng format, tổng count tăng sau khi tạo user', async () => {
  const admin = await makeUser('admin');

  const resBefore = await request(app)
    .get('/api/v1/admin/stats/dashboard?period=30d')
    .set('Authorization', `Bearer ${admin.token}`);
  const seriesBefore = resBefore.body.data.newUsersSeries as { date: string; count: number }[];
  const totalCountBefore = seriesBefore.reduce((s, r) => s + r.count, 0);

  // Tạo 2 user mới
  await makeUser('user');
  await makeUser('user');

  const res = await request(app)
    .get('/api/v1/admin/stats/dashboard?period=30d')
    .set('Authorization', `Bearer ${admin.token}`);
  expect(res.status).toBe(200);

  const series = res.body.data.newUsersSeries as { date: string; count: number }[];
  expect(series.length).toBe(7);
  expect(series.every((s) => /^\d{4}-\d{2}-\d{2}$/.test(s.date))).toBe(true);

  const totalCountAfter = series.reduce((s, r) => s + r.count, 0);
  expect(totalCountAfter).toBe(totalCountBefore + 2);
});

// ─── AA5: topBooks admin sorted by revenue desc, có vendorShop + fileFormat ───
it('AA5: topBooks (admin) xếp theo revenue desc; có vendorShop, fileFormat', async () => {
  const admin = await makeUser('admin');
  const buyer = await makeUser('user');
  const vendor = await makeVendorUser();
  const book1 = await makeBook(vendor.userId);
  const book2 = await makeBook(vendor.userId);
  const now = new Date();

  await makeOrder(buyer.id, 'COMPLETED', now, [
    { bookId: book1.id, vendorUserId: vendor.userId, unitPrice: 300000, titleSnapshot: 'High Revenue' },
    { bookId: book2.id, vendorUserId: vendor.userId, unitPrice: 100000, titleSnapshot: 'Low Revenue' },
  ]);

  const res = await request(app)
    .get('/api/v1/admin/stats/dashboard?period=7d')
    .set('Authorization', `Bearer ${admin.token}`);
  expect(res.status).toBe(200);

  const top = res.body.data.topBooks as {
    bookId: number; title: string; vendorShop: string; fileFormat: string; revenue: number; sold: number;
  }[];
  expect(Array.isArray(top)).toBe(true);
  expect(top.length).toBeGreaterThanOrEqual(1);

  // Admin sees revenue
  expect(typeof top[0].revenue).toBe('number');

  // Revenue desc sort
  for (let i = 1; i < top.length; i++) {
    expect(top[i - 1].revenue!).toBeGreaterThanOrEqual(top[i].revenue!);
  }

  // vendorShop + fileFormat present
  const found1 = top.find((t) => t.bookId === book1.id);
  expect(found1).toBeDefined();
  expect(typeof found1!.vendorShop).toBe('string');
  expect(found1!.fileFormat).toBe('pdf');
});

// ─── AA6: Manager — revenue null, revenueSeries null, topBooks sorted by sold ─
it('AA6: manager → revenue=null, revenueSeries=null, topBooks[].revenue=null, sorted by sold', async () => {
  const manager = await makeUser('manager');
  const buyer = await makeUser('user');
  const vendor = await makeVendorUser();
  // Create 6 unique books so book1 dominates top-5 by sold count
  const books = await Promise.all(Array.from({ length: 6 }, () => makeBook(vendor.userId)));
  const now = new Date();

  // books[0] sold 10x (dominant), books[1] sold 1x, books[2-5] never sold this period
  for (let i = 0; i < 10; i++) {
    await makeOrder(buyer.id, 'COMPLETED', now, [
      { bookId: books[0].id, vendorUserId: vendor.userId, unitPrice: 10000, titleSnapshot: 'Dominant' },
    ]);
  }
  await makeOrder(buyer.id, 'COMPLETED', now, [
    { bookId: books[1].id, vendorUserId: vendor.userId, unitPrice: 500000, titleSnapshot: 'Expensive' },
  ]);

  const res = await request(app)
    .get('/api/v1/admin/stats/dashboard?period=7d')
    .set('Authorization', `Bearer ${manager.token}`);
  expect(res.status).toBe(200);

  const data = res.body.data;
  // All three manager-strip assertions
  expect(data.kpis.revenue).toBeNull();
  expect(data.revenueSeries).toBeNull();

  const top = data.topBooks as { bookId: number; revenue: number | null; sold: number }[];
  expect(top.length).toBeGreaterThanOrEqual(1);
  expect(top.every((t) => t.revenue === null)).toBe(true);

  // sorted by sold desc
  for (let i = 1; i < top.length; i++) {
    expect(top[i - 1].sold).toBeGreaterThanOrEqual(top[i].sold);
  }

  // books[0] (sold=10) must be #1 — dominant seller
  expect(top[0].bookId).toBe(books[0].id);
  expect(top[0].sold).toBe(10);
});

// ─── AA7: RBAC ────────────────────────────────────────────────────────────────
it('AA7: role user → 403; admin → 200; manager → 200', async () => {
  const user = await makeUser('user');
  const admin = await makeUser('admin');
  const manager = await makeUser('manager');

  const resUser = await request(app)
    .get('/api/v1/admin/stats/dashboard')
    .set('Authorization', `Bearer ${user.token}`);
  expect(resUser.status).toBe(403);

  const resAdmin = await request(app)
    .get('/api/v1/admin/stats/dashboard')
    .set('Authorization', `Bearer ${admin.token}`);
  expect(resAdmin.status).toBe(200);

  const resManager = await request(app)
    .get('/api/v1/admin/stats/dashboard')
    .set('Authorization', `Bearer ${manager.token}`);
  expect(resManager.status).toBe(200);
});
