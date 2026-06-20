import { z } from 'zod';

export const listBooksQuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  format: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      return Array.isArray(v) ? v : [v];
    }),
  priceMin: z.coerce.number().int().min(0).optional(),
  priceMax: z.coerce.number().int().min(0).optional(),
  rating: z.coerce.number().min(1).max(5).optional(),
  author: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      return Array.isArray(v) ? v : [v];
    }),
  publisher: z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      return Array.isArray(v) ? v : [v];
    }),
  sort: z
    .enum(['relevant', 'newest', 'bestselling', 'price_asc', 'price_desc'])
    .default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(20),
});

export type ListBooksQuery = z.infer<typeof listBooksQuerySchema>;

export const detailParamsSchema = z.object({
  idOrSlug: z.string().min(1),
});

export type DetailParams = z.infer<typeof detailParamsSchema>;
