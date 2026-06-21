import { z } from 'zod';

export const addItemBodySchema = z.object({
  bookId: z.number({ invalid_type_error: 'bookId phải là số nguyên' }).int().positive('bookId phải là số dương'),
});

export const removeItemParamsSchema = z.object({
  bookId: z
    .string()
    .regex(/^\d+$/, 'bookId phải là số nguyên dương')
    .transform(Number),
});

export type AddItemBody = z.infer<typeof addItemBodySchema>;
export type RemoveItemParams = z.infer<typeof removeItemParamsSchema>;
