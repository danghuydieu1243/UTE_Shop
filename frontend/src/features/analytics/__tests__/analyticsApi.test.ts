/** analyticsApi.test.ts — through-transform contract lock (Task 3, Phase 6b).
 *  Gọi trực tiếp transformVendorDashboard / transformAdminDashboard để khóa
 *  shape FE ↔ BE (camelCase, nullable fields, array shapes).
 */
import { describe, it, expect } from 'vitest';
import { transformVendorDashboard, transformAdminDashboard } from '../analyticsApi';
import type { VendorDashboard, AdminDashboard } from '../types';

const VENDOR_FIXTURE: VendorDashboard = {
  kpis: {
    revenue: 1_200_000,
    grossRevenue: 1_200_000,
    totalFee: 120_000,
    netRevenue: 1_080_000,
    orders: 42,
    productsOnSale: 5,
    avgRating: 4.3,
  },
  revenueSeries: [
    { date: '2026-05-01', value: 300_000 },
    { date: '2026-05-15', value: 900_000 },
    { date: '2026-06-01', value: 1_200_000 },
  ],
  topBooks: [
    { bookId: 7, title: 'Clean Code', author: 'Robert C. Martin', sold: 18, revenue: 540_000 },
    { bookId: 12, title: 'No Author Book', author: null, sold: 5, revenue: 100_000 },
  ],
  recentOrders: [
    { code: 'ORD-001', title: 'Clean Code', total: 90_000 },
  ],
};

const ADMIN_FIXTURE: AdminDashboard = {
  kpis: { totalUsers: 500, totalVendors: 30, orders: 200, revenue: null },
  revenueSeries: null,
  newUsersSeries: [
    { date: '2026-06-01', count: 12 },
    { date: '2026-06-02', count: 8 },
  ],
  topBooks: [
    { bookId: 3, title: 'DDIA', vendorShop: 'Tech Store', fileFormat: 'PDF', revenue: null, sold: 50 },
  ],
  recentOrders: [
    { code: 'ORD-100', buyer: 'user@example.com', total: 180_000, status: 'COMPLETED', createdAt: '2026-06-20T10:00:00.000Z' },
  ],
};

describe('transformVendorDashboard — contract lock', () => {
  it('giữ nguyên kpis đầy đủ field', () => {
    const r = transformVendorDashboard(VENDOR_FIXTURE);
    expect(r.kpis.revenue).toBe(1_200_000);
    expect(r.kpis.orders).toBe(42);
    expect(r.kpis.productsOnSale).toBe(5);
    expect(r.kpis.avgRating).toBe(4.3);
  });

  it('revenueSeries là mảng SeriesPoint {date, value}', () => {
    const r = transformVendorDashboard(VENDOR_FIXTURE);
    expect(Array.isArray(r.revenueSeries)).toBe(true);
    expect(r.revenueSeries).toHaveLength(3);
    expect(r.revenueSeries[0].date).toBe('2026-05-01');
    expect(r.revenueSeries[0].value).toBe(300_000);
  });

  it('topBooks[0] có đủ field kể cả author nullable', () => {
    const r = transformVendorDashboard(VENDOR_FIXTURE);
    expect(r.topBooks[0].bookId).toBe(7);
    expect(r.topBooks[0].title).toBe('Clean Code');
    expect(r.topBooks[0].author).toBe('Robert C. Martin');
    expect(r.topBooks[0].sold).toBe(18);
    expect(r.topBooks[0].revenue).toBe(540_000);
    // author null case
    expect(r.topBooks[1].author).toBeNull();
  });

  it('recentOrders có {code, title, total}', () => {
    const r = transformVendorDashboard(VENDOR_FIXTURE);
    expect(r.recentOrders[0].code).toBe('ORD-001');
    expect(r.recentOrders[0].title).toBe('Clean Code');
    expect(r.recentOrders[0].total).toBe(90_000);
  });
});

describe('transformAdminDashboard — contract lock', () => {
  it('kpis.revenue nullable (null case)', () => {
    const r = transformAdminDashboard(ADMIN_FIXTURE);
    expect(r.kpis.totalUsers).toBe(500);
    expect(r.kpis.totalVendors).toBe(30);
    expect(r.kpis.orders).toBe(200);
    expect(r.kpis.revenue).toBeNull();
  });

  it('revenueSeries null-able (null case)', () => {
    const r = transformAdminDashboard(ADMIN_FIXTURE);
    expect(r.revenueSeries).toBeNull();
  });

  it('newUsersSeries là mảng {date, count}', () => {
    const r = transformAdminDashboard(ADMIN_FIXTURE);
    expect(Array.isArray(r.newUsersSeries)).toBe(true);
    expect(r.newUsersSeries).toHaveLength(2);
    expect(r.newUsersSeries[0].date).toBe('2026-06-01');
    expect(r.newUsersSeries[0].count).toBe(12);
  });

  it('topBooks có vendorShop, fileFormat, revenue nullable', () => {
    const r = transformAdminDashboard(ADMIN_FIXTURE);
    expect(r.topBooks[0].bookId).toBe(3);
    expect(r.topBooks[0].vendorShop).toBe('Tech Store');
    expect(r.topBooks[0].fileFormat).toBe('PDF');
    expect(r.topBooks[0].revenue).toBeNull();
    expect(r.topBooks[0].sold).toBe(50);
  });

  it('recentOrders có buyer, status, createdAt', () => {
    const r = transformAdminDashboard(ADMIN_FIXTURE);
    expect(r.recentOrders[0].code).toBe('ORD-100');
    expect(r.recentOrders[0].buyer).toBe('user@example.com');
    expect(r.recentOrders[0].total).toBe(180_000);
    expect(r.recentOrders[0].status).toBe('COMPLETED');
    expect(r.recentOrders[0].createdAt).toBe('2026-06-20T10:00:00.000Z');
  });
});
