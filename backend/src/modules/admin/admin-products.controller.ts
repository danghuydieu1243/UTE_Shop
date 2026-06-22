import { AppError } from '../../shared/errors/AppError';
import { asyncHandler } from '../../shared/http/asyncHandler';
import { ok } from '../../shared/http/response';
import { listAdminProductsQuerySchema, patchProductStatusBodySchema } from './admin.schema';
import * as service from './admin-products.service';

export const listAdminProducts = asyncHandler(async (req, res) => {
  const parsed = listAdminProductsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw AppError.from('VALIDATION', 'Tham số không hợp lệ', parsed.error.issues);
  }
  const { data, pagination } = await service.listAdminProducts(parsed.data);
  ok(res, data, { pagination });
});

export const updateProductStatus = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    throw AppError.from('VALIDATION', 'ID sản phẩm không hợp lệ');
  }

  const parsed = patchProductStatusBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw AppError.from('VALIDATION', 'Trạng thái không hợp lệ', parsed.error.issues);
  }

  const dto = await service.updateProductStatus(id, parsed.data);
  ok(res, dto);
});
