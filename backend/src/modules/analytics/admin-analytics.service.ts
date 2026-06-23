import * as repo from './admin-analytics.repository';
import { resolvePeriod, bucketByDay } from './analytics.period';
import { AdminDashboardDTO } from './analytics.schema';

export async function getAdminDashboard(period: string, role: string): Promise<AdminDashboardDTO> {
  const { from, to } = resolvePeriod(period);
  const isAdmin = role === 'admin';
  // newUsersSeries luôn là cửa sổ 7 ngày gần nhất (độc lập với period KPI) — fetch đúng khoảng đó.
  const wk = resolvePeriod('7d');

  const [totalUsers, totalVendors, orders, completed, newU, items, recent] = await Promise.all([
    repo.countUsers(),
    repo.countActiveVendors(),
    repo.countOrdersInPeriod(from, to),
    repo.completedOrders(from, to),
    repo.newUsers(wk.from, wk.to),
    repo.completedItems(from, to),
    repo.recentOrders(5),
  ]);

  const revenue = completed.reduce((s, o) => s + Number(o.total), 0);

  const revenueSeries = bucketByDay(
    completed
      .filter((o) => o.completedAt)
      .map((o) => ({ date: new Date(o.completedAt as Date), value: Number(o.total) })),
    from,
    to,
  );

  // newUsersSeries: 7 ngày gần nhất
  const newUsersSeries = bucketByDay(
    newU.map((u) => ({ date: new Date(u.created_at), value: 1 })),
    wk.from,
    wk.to,
  ).map(({ date, value }) => ({ date, count: value }));

  // topBooks: aggregate JS (dialect-safe)
  const byBook = new Map<
    number,
    { title: string; vendorShop: string; fileFormat: string; sold: number; revenue: number }
  >();

  for (const it of items) {
    const b = (it as any).book;
    const bid = Number(it.bookId);
    const vendorUser = b?.vendor;
    const shopName: string =
      vendorUser?.vendor?.shopName ?? vendorUser?.fullName ?? '';
    const cur = byBook.get(bid) ?? {
      title: b?.title ?? it.titleSnapshot,
      vendorShop: shopName,
      fileFormat: b?.fileFormat ?? '',
      sold: 0,
      revenue: 0,
    };
    cur.sold += 1;
    cur.revenue += Number(it.unitPrice);
    byBook.set(bid, cur);
  }

  let topBooks = Array.from(byBook.entries()).map(([bookId, v]) => ({ bookId, ...v }));
  topBooks = isAdmin
    ? topBooks.sort((a, b) => b.revenue - a.revenue).slice(0, 5)
    : topBooks.sort((a, b) => b.sold - a.sold).slice(0, 5);

  const recentOrders = recent.map((o) => ({
    code: o.code,
    buyer: (o as any).user?.fullName ?? '',
    total: Number(o.total),
    status: o.status ?? 'NEW',
    createdAt: new Date(o.created_at).toISOString(),
  }));

  return {
    kpis: { totalUsers, totalVendors, orders, revenue: isAdmin ? revenue : null },
    revenueSeries: isAdmin ? revenueSeries : null,
    newUsersSeries,
    topBooks: isAdmin ? topBooks : topBooks.map((t) => ({ ...t, revenue: null })),
    recentOrders,
  };
}
