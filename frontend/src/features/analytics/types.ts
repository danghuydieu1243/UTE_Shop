/** analytics/types.ts — khớp chính xác BE DTO (analytics.schema.ts). */

export interface SeriesPoint { date: string; value: number }
export interface NewUsersPoint { date: string; count: number }

export interface VendorDashboard {
  kpis: { revenue: number; orders: number; productsOnSale: number; avgRating: number };
  revenueSeries: SeriesPoint[];
  topBooks: { bookId: number; title: string; author: string | null; sold: number; revenue: number }[];
  recentOrders: { code: string; title: string; total: number }[];
}

export interface AdminDashboard {
  kpis: { totalUsers: number; totalVendors: number; orders: number; revenue: number | null };
  revenueSeries: SeriesPoint[] | null;
  newUsersSeries: NewUsersPoint[];
  topBooks: { bookId: number; title: string; vendorShop: string; fileFormat: string; revenue: number | null; sold: number }[];
  recentOrders: { code: string; buyer: string; total: number; status: string; createdAt: string }[];
}
