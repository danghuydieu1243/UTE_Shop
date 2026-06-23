import { asyncHandler } from '../../shared/http/asyncHandler';
import { ok } from '../../shared/http/response';
import { walletQuerySchema } from './wallet.schema';
import { AppError } from '../../shared/errors/AppError';
import * as walletService from './wallet.service';

export const getWallet = asyncHandler(async (req, res) => {
  const result = walletQuerySchema.safeParse(req.query);
  if (!result.success) {
    throw AppError.from('VALIDATION', 'Query không hợp lệ', result.error.issues);
  }
  const { page, limit } = result.data;
  const vendorUserId = req.user!.id;
  const walletData = await walletService.getWallet(vendorUserId, page, limit);
  const { pagination, ...data } = walletData;
  ok(res, data, { pagination });
});
