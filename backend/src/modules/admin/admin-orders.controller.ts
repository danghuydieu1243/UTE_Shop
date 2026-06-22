import { AppError } from '../../shared/errors/AppError';
import { asyncHandler } from '../../shared/http/asyncHandler';
import { ok } from '../../shared/http/response';
import { listAdminOrdersQuerySchema } from './admin.schema';
import * as service from './admin-orders.service';

export const listAdminOrders = asyncHandler(async (req, res) => {
  const parsed = listAdminOrdersQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw AppError.from('VALIDATION', 'Tham số không hợp lệ', parsed.error.issues);
  }
  const { data, pagination } = await service.listAdminOrders(parsed.data);
  ok(res, data, { pagination });
});

export const getAdminOrderDetail = asyncHandler(async (req, res) => {
  const { code } = req.params;
  if (!code) {
    throw AppError.from('VALIDATION', 'Mã đơn hàng không hợp lệ');
  }
  const dto = await service.getAdminOrderDetail(code);
  ok(res, dto);
});
