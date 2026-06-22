import { z } from 'zod';

export const listVendorOrdersQuerySchema = z.object({
  status: z.enum(['NEW', 'COMPLETED', 'CANCELLED']).optional(),
  page: z.string().optional()
    .transform((v) => (v ? parseInt(v, 10) : 1))
    .pipe(z.number().int().positive().default(1)),
  limit: z.string().optional()
    .transform((v) => (v ? parseInt(v, 10) : 10))
    .pipe(z.number().int().positive().max(100).default(10)),
});

export type ListVendorOrdersQuery = z.infer<typeof listVendorOrdersQuerySchema>;

export interface VendorOrderItemDTO {
  bookId: number;
  titleSnapshot: string;
  unitPrice: number;
}

export interface VendorOrderDTO {
  code: string;
  status: string;
  total: number;
  createdAt: Date;
  items: VendorOrderItemDTO[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
