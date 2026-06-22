import { z } from 'zod';

export const createCouponSchema = z
  .object({
    code: z.string().min(1).max(40),
    type: z.enum(['percent', 'fixed']),
    value: z.number().int().positive(),
    minOrder: z.number().int().min(0).optional(),
    maxUses: z.number().int().positive().nullable().optional(),
    maxUsesPerUser: z.number().int().positive().optional(),
    startsAt: z.coerce.date().nullable().optional(),
    endsAt: z.coerce.date().nullable().optional(),
    status: z.enum(['scheduled', 'running', 'disabled']).optional(),
  })
  .refine((d) => d.type !== 'percent' || (d.value >= 1 && d.value <= 100), {
    message: 'percent value phải từ 1-100',
    path: ['value'],
  })
  .refine((d) => d.type !== 'fixed' || d.value >= 1, {
    message: 'fixed value phải >= 1',
    path: ['value'],
  });

export const updateCouponSchema = z
  .object({
    code: z.string().min(1).max(40).optional(),
    type: z.enum(['percent', 'fixed']).optional(),
    value: z.number().int().positive().optional(),
    minOrder: z.number().int().min(0).optional(),
    maxUses: z.number().int().positive().nullable().optional(),
    maxUsesPerUser: z.number().int().positive().optional(),
    startsAt: z.coerce.date().nullable().optional(),
    endsAt: z.coerce.date().nullable().optional(),
    status: z.enum(['scheduled', 'running', 'disabled']).optional(),
  })
  .refine(
    (d) => {
      if (d.type === 'percent' && d.value !== undefined) {
        return d.value >= 1 && d.value <= 100;
      }
      return true;
    },
    { message: 'percent value phải từ 1-100', path: ['value'] },
  )
  .refine(
    (d) => {
      if (d.type === 'fixed' && d.value !== undefined) {
        return d.value >= 1;
      }
      return true;
    },
    { message: 'fixed value phải >= 1', path: ['value'] },
  );

export const couponIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const listCouponsQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(60).default(20),
});

export const validateCouponSchema = z.object({
  code: z.string().min(1),
  bookIds: z.array(z.number().int().positive()).min(1),
});

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type ListCouponsQuery = z.infer<typeof listCouponsQuerySchema>;
