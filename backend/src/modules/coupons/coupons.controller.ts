import { asyncHandler } from '../../shared/http/asyncHandler';
import { ok, created } from '../../shared/http/response';
import { AppError } from '../../shared/errors/AppError';
import { Book } from '../../db/models';
import * as service from './coupons.service';
import {
  createCouponSchema,
  updateCouponSchema,
  couponIdParamsSchema,
  listCouponsQuerySchema,
  validateCouponSchema,
} from './coupons.schema';

// ── List (vendor) ─────────────────────────────────────────────────────────────
export const listCoupons = asyncHandler(async (req, res) => {
  const qResult = listCouponsQuerySchema.safeParse(req.query);
  if (!qResult.success) throw AppError.from('VALIDATION', 'Tham số truy vấn không hợp lệ', qResult.error.issues);

  const { rows, count } = await service.listCoupons(req.user!.id, qResult.data);
  const totalPages = Math.ceil(count / qResult.data.limit);
  ok(res, { coupons: rows }, {
    pagination: {
      page: qResult.data.page,
      limit: qResult.data.limit,
      total: count,
      totalPages,
    },
  });
});

// ── Create (vendor) ───────────────────────────────────────────────────────────
export const createCoupon = asyncHandler(async (req, res) => {
  const bodyResult = createCouponSchema.safeParse(req.body);
  if (!bodyResult.success) throw AppError.from('VALIDATION', 'Dữ liệu không hợp lệ', bodyResult.error.issues);

  const coupon = await service.createCoupon(req.user!.id, bodyResult.data);
  created(res, { id: coupon.id, code: coupon.code, type: coupon.type, value: Number(coupon.value), status: coupon.status });
});

// ── Update (vendor) ───────────────────────────────────────────────────────────
export const updateCoupon = asyncHandler(async (req, res) => {
  const pResult = couponIdParamsSchema.safeParse(req.params);
  if (!pResult.success) throw AppError.from('VALIDATION', 'Tham số không hợp lệ', pResult.error.issues);

  const bodyResult = updateCouponSchema.safeParse(req.body);
  if (!bodyResult.success) throw AppError.from('VALIDATION', 'Dữ liệu không hợp lệ', bodyResult.error.issues);

  const coupon = await service.updateCoupon(req.user!.id, pResult.data.id, bodyResult.data);
  ok(res, {
    id: coupon.id,
    code: coupon.code,
    type: coupon.type,
    value: Number(coupon.value),
    minOrder: Number(coupon.minOrder),
    maxUses: coupon.maxUses,
    maxUsesPerUser: coupon.maxUsesPerUser,
    status: coupon.status,
    startsAt: coupon.startsAt,
    endsAt: coupon.endsAt,
  });
});

// ── Delete (vendor) ───────────────────────────────────────────────────────────
export const deleteCoupon = asyncHandler(async (req, res) => {
  const pResult = couponIdParamsSchema.safeParse(req.params);
  if (!pResult.success) throw AppError.from('VALIDATION', 'Tham số không hợp lệ', pResult.error.issues);

  await service.removeCoupon(req.user!.id, pResult.data.id);
  res.status(204).send();
});

// ── Validate (user) ───────────────────────────────────────────────────────────
export const validateCoupon = asyncHandler(async (req, res) => {
  const bodyResult = validateCouponSchema.safeParse(req.body);
  if (!bodyResult.success) throw AppError.from('VALIDATION', 'Dữ liệu không hợp lệ', bodyResult.error.issues);

  const { code, bookIds } = bodyResult.data;

  // Look up each book
  const books = await Book.findAll({ where: { id: bookIds } });
  if (books.length !== bookIds.length) {
    throw AppError.from('BOOK_NOT_FOUND', 'Một hoặc nhiều sách không tồn tại');
  }

  const items = books.map((b) => ({
    bookId: b.id,
    vendorUserId: b.vendorUserId,
    price: Number(b.price),
  }));

  const { coupon, discount } = await service.validateAndPriceCoupon(code, items, req.user!.id);

  ok(res, {
    couponId: coupon.id,
    type: coupon.type,
    value: Number(coupon.value),
    discount,
    message: `Áp dụng mã giảm giá thành công, tiết kiệm ${discount.toLocaleString('vi-VN')} VND`,
  });
});
