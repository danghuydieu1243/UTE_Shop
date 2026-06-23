import { z } from 'zod';

export const withdrawalBodySchema = z.object({
  amount: z.number().int().positive(),
  bankAccountId: z.number().int().positive(),
});

export interface WithdrawalDTO {
  id: number;
  amount: number;
  status: string;
  bankAccountId: number;
  requestedAt: string;
}
