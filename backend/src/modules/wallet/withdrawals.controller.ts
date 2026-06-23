import { asyncHandler } from '../../shared/http/asyncHandler';
import { created } from '../../shared/http/response';
import { withdrawalBodySchema } from './withdrawals.schema';
import { AppError } from '../../shared/errors/AppError';
import * as withdrawalsService from './withdrawals.service';

export const createWithdrawal = asyncHandler(async (req, res) => {
  const result = withdrawalBodySchema.safeParse(req.body);
  if (!result.success) {
    throw AppError.from('VALIDATION', 'Body không hợp lệ', result.error.issues);
  }
  const vendorUserId = req.user!.id;
  const dto = await withdrawalsService.createWithdrawal(vendorUserId, result.data);
  created(res, dto);
});
