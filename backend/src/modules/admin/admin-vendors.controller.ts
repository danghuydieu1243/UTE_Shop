import { AppError } from '../../shared/errors/AppError';
import { asyncHandler } from '../../shared/http/asyncHandler';
import { ok } from '../../shared/http/response';
import { listVendorsQuerySchema, patchVendorStatusBodySchema } from './admin.schema';
import * as service from './admin-vendors.service';

export const listVendors = asyncHandler(async (req, res) => {
  const parsed = listVendorsQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    throw AppError.from('VALIDATION', 'Tham số không hợp lệ', parsed.error.issues);
  }
  const { data, pagination } = await service.listVendors(parsed.data);
  ok(res, data, { pagination });
});

export const updateVendorStatus = asyncHandler(async (req, res) => {
  const vendorUserId = parseInt(req.params.id, 10);
  if (isNaN(vendorUserId)) {
    throw AppError.from('VALIDATION', 'ID vendor không hợp lệ');
  }

  const parsed = patchVendorStatusBodySchema.safeParse(req.body);
  if (!parsed.success) {
    throw AppError.from('VALIDATION', 'Dữ liệu không hợp lệ', parsed.error.issues);
  }

  const dto = await service.updateVendorStatus(vendorUserId, parsed.data);
  ok(res, dto);
});
