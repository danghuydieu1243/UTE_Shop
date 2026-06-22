import { asyncHandler } from '../../shared/http/asyncHandler';
import { ok } from '../../shared/http/response';
import { loyaltyQuerySchema } from './loyalty.schema';
import { AppError } from '../../shared/errors/AppError';
import * as loyaltyService from './loyalty.service';

export const getLoyalty = asyncHandler(async (req, res) => {
  const result = loyaltyQuerySchema.safeParse(req.query);
  if (!result.success) {
    throw AppError.from('VALIDATION', 'Query không hợp lệ', result.error.issues);
  }
  const { page, limit } = result.data;
  const userId = req.user!.id;
  const loyaltyData = await loyaltyService.getLoyalty(userId, page, limit);
  const { pagination, ...data } = loyaltyData;
  ok(res, data, { pagination });
});
