import { z } from 'zod';

export const dashboardQuerySchema = z.object({ period: z.string().optional().default('30d') });
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

export interface VendorDashboardDTO {
  kpis: { revenue: number; grossRevenue: number; totalFee: number; netRevenue: number; orders: number; productsOnSale: number; avgRating: number };
  revenueSeries: { date: string; value: number }[];
  topBooks: { bookId: number; title: string; author: string | null; sold: number; revenue: number }[];
  recentOrders: { code: string; title: string; total: number }[];
}

export interface AdminDashboardDTO {
  kpis: { totalUsers: number; totalVendors: number; orders: number; revenue: number | null };
  revenueSeries: { date: string; value: number }[] | null;
  newUsersSeries: { date: string; count: number }[];
  topBooks: { bookId: number; title: string; vendorShop: string; fileFormat: string; revenue: number | null; sold: number }[];
  recentOrders: { code: string; buyer: string; total: number; status: string; createdAt: string }[];
}
