import { AppError } from '../../shared/errors/AppError';
import { asyncHandler } from '../../shared/http/asyncHandler';
import { ok } from '../../shared/http/response';
import { listVendorOrdersQuerySchema } from './vendor-orders.schema';
import * as service from './vendor-orders.service';

export const listOrders = asyncHandler(async (req, res) => {
  const parsed = listVendorOrdersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw AppError.from('VALIDATION', 'Tham số không hợp lệ', parsed.error.issues);
  }
  const vendorUserId = req.user!.id;
  const { data, pagination } = await service.listVendorOrders(vendorUserId, parsed.data);
  ok(res, data, { pagination });
});
