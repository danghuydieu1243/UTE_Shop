import * as repo from './vendor-analytics.repository';
import { resolvePeriod, bucketByDay } from './analytics.period';
import { VendorDashboardDTO } from './analytics.schema';

export async function getVendorDashboard(vendorUserId: number, period: string): Promise<VendorDashboardDTO> {
  const { from, to } = resolvePeriod(period);
  const items = await repo.completedItemsForVendor(vendorUserId, from, to);

  // revenue + orders (distinct) + series
  let revenue = 0;
  const orderIds = new Set<number>();
  const seriesRows: { date: Date; value: number }[] = [];
  const byBook = new Map<number, { title: string; author: string | null; sold: number; revenue: number }>();
  for (const it of items) {
    const price = Number(it.unitPrice);
    revenue += price;
    const o = (it as any).order;
    orderIds.add(Number(o.id));
    if (o.completedAt) seriesRows.push({ date: new Date(o.completedAt), value: price });
    const b = (it as any).book;
    const bid = Number(it.bookId);
    const cur = byBook.get(bid) ?? {
      title: b?.title ?? it.titleSnapshot,
      author: b?.author?.name ?? null,
      sold: 0, revenue: 0,
    };
    cur.sold += 1; cur.revenue += price;
    byBook.set(bid, cur);
  }

  const topBooks = Array.from(byBook.entries())
    .map(([bookId, v]) => ({ bookId, ...v }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);

  const [productsOnSaleN, avgRating, recentOrders] = await Promise.all([
    repo.productsOnSale(vendorUserId),
    repo.avgRatingForVendor(vendorUserId),
    repo.recentNewOrdersForVendor(vendorUserId, 5),
  ]);

  return {
    kpis: { revenue, orders: orderIds.size, productsOnSale: productsOnSaleN, avgRating },
    revenueSeries: bucketByDay(seriesRows, from, to),
    topBooks,
    recentOrders,
  };
}
