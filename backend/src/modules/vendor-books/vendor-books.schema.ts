import { z } from 'zod';

export const createBookSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  tableOfContents: z.string().optional(),
  price: z.coerce.number().int().positive(),
  originalPrice: z.coerce.number().int().positive().optional(),
  categoryId: z.coerce.number().int().positive(),
  authorName: z.string().min(1).max(255),
  publisherName: z.string().min(1).max(255).optional(),
  publishYear: z.coerce.number().int().min(1000).max(2100).optional(),
  isbn: z.string().max(20).optional(),
  status: z.enum(['published', 'draft']).default('published'),
});

export const updateBookSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  tableOfContents: z.string().optional(),
  price: z.coerce.number().int().positive().optional(),
  originalPrice: z.coerce.number().int().positive().optional().nullable(),
  categoryId: z.coerce.number().int().positive().optional(),
  authorName: z.string().min(1).max(255).optional(),
  publisherName: z.string().min(1).max(255).optional().nullable(),
  publishYear: z.coerce.number().int().min(1000).max(2100).optional().nullable(),
  isbn: z.string().max(20).optional().nullable(),
  status: z.enum(['published', 'draft', 'hidden']).optional(),
});

export const patchStatusSchema = z.object({
  status: z.enum(['published', 'draft', 'hidden']),
});

export const listVendorBooksQuerySchema = z.object({
  q: z.string().optional(),
  status: z.enum(['published', 'draft', 'hidden']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(60).default(20),
});

export const bookIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CreateBookInput = z.infer<typeof createBookSchema>;
export type UpdateBookInput = z.infer<typeof updateBookSchema>;
export type PatchStatusInput = z.infer<typeof patchStatusSchema>;
export type ListVendorBooksQuery = z.infer<typeof listVendorBooksQuerySchema>;
