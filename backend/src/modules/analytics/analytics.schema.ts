import { z } from 'zod';

export const dashboardQuerySchema = z.object({ period: z.string().optional().default('30d') });
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

export interface VendorDashboardDTO {
  kpis: { revenue: number; orders: number; productsOnSale: number; avgRating: number };
  revenueSeries: { date: string; value: number }[];
  topBooks: { bookId: number; title: string; author: string | null; sold: number; revenue: number }[];
  recentOrders: { code: string; title: string; total: number }[];
}
