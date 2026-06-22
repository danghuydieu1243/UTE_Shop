import { Transaction, UniqueConstraintError } from 'sequelize';
import { Coupon } from '../../db/models';
import { AppError } from '../../shared/errors/AppError';
import * as repo from './coupons.repository';
import { CreateCouponInput, ListCouponsQuery, UpdateCouponInput } from './coupons.schema';

// ── Create ────────────────────────────────────────────────────────────────────
export async function createCoupon(
  vendorUserId: number,
  input: CreateCouponInput,
): Promise<Coupon> {
  try {
    return await repo.createCoupon({
      vendorUserId,
      code: input.code,
      type: input.type,
      value: input.value,
      minOrder: input.minOrder,
      maxUses: input.maxUses,
      maxUsesPerUser: input.maxUsesPerUser,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      status: input.status,
    });
  } catch (err) {
    if (err instanceof UniqueConstraintError) {
      throw AppError.from('COUPON_DUPLICATE', 'Mã giảm giá đã tồn tại cho vendor này');
    }
    throw err;
  }
}

// ── List ──────────────────────────────────────────────────────────────────────
export async function listCoupons(
  vendorUserId: number,
  q: ListCouponsQuery,
): Promise<{ rows: Coupon[]; count: number }> {
  return repo.listVendorCoupons(vendorUserId, q);
}

// ── Update ────────────────────────────────────────────────────────────────────
export async function updateCoupon(
  vendorUserId: number,
  id: number,
  input: UpdateCouponInput,
): Promise<Coupon> {
  const coupon = await repo.findCouponById(id);
  if (!coupon) throw AppError.from('COUPON_NOT_FOUND', 'Không tìm thấy coupon');
  if (Number(coupon.vendorUserId) !== Number(vendorUserId)) {
    throw AppError.from('FORBIDDEN', 'Bạn không có quyền thực hiện hành động này');
  }

  const updateData: Parameters<typeof repo.updateCoupon>[1] = {};
  if (input.code !== undefined) updateData.code = input.code;
  if (input.type !== undefined) updateData.type = input.type;
  if (input.value !== undefined) updateData.value = input.value;
  if (input.minOrder !== undefined) updateData.minOrder = input.minOrder;
  if ('maxUses' in input) updateData.maxUses = input.maxUses ?? null;
  if (input.maxUsesPerUser !== undefined) updateData.maxUsesPerUser = input.maxUsesPerUser;
  if ('startsAt' in input) updateData.startsAt = input.startsAt ?? null;
  if ('endsAt' in input) updateData.endsAt = input.endsAt ?? null;
  if (input.status !== undefined) updateData.status = input.status;

  await repo.updateCoupon(id, updateData);

  const updated = await repo.findCouponById(id);
  return updated!;
}

// ── Remove ────────────────────────────────────────────────────────────────────
export async function removeCoupon(vendorUserId: number, id: number): Promise<void> {
  const coupon = await repo.findCouponById(id);
  if (!coupon) throw AppError.from('COUPON_NOT_FOUND', 'Không tìm thấy coupon');
  if (Number(coupon.vendorUserId) !== Number(vendorUserId)) {
    throw AppError.from('FORBIDDEN', 'Bạn không có quyền thực hiện hành động này');
  }
  await repo.deleteCoupon(id);
}

// ── Validate & price ──────────────────────────────────────────────────────────
export async function validateAndPriceCoupon(
  code: string,
  items: { bookId: number; vendorUserId: number; price: number }[],
  userId: number,
  opts?: { transaction?: Transaction },
): Promise<{ coupon: Coupon; discount: number }> {
  const t = opts?.transaction;

  // 1. Find by code
  const coupon = await repo.findCouponByCode(code);
  if (!coupon) throw AppError.from('COUPON_NOT_FOUND', 'Mã giảm giá không tồn tại');

  const now = new Date();

  // 2. D15: validity
  if (coupon.status === 'disabled' || coupon.status === 'ended') {
    throw AppError.from('COUPON_INVALID', 'Mã giảm giá không còn hiệu lực');
  }
  if (coupon.startsAt && now < coupon.startsAt) {
    throw AppError.from('COUPON_INVALID', 'Mã giảm giá chưa đến thời gian sử dụng');
  }
  if (coupon.endsAt && now > coupon.endsAt) {
    throw AppError.from('COUPON_INVALID', 'Mã giảm giá đã hết hạn');
  }

  // 3. D8: vendor scope — all items must belong to coupon.vendorUserId
  const invalidItem = items.find((item) => Number(item.vendorUserId) !== Number(coupon.vendorUserId));
  if (invalidItem) {
    throw AppError.from('COUPON_INVALID', 'Mã giảm giá không áp dụng cho sản phẩm này');
  }

  // 4. Compute subtotal
  const subtotal = items.reduce((sum, item) => sum + Number(item.price), 0);

  // 5. min_order check
  if (coupon.minOrder && subtotal < Number(coupon.minOrder)) {
    throw AppError.from('COUPON_INVALID', 'Đơn hàng chưa đạt giá trị tối thiểu');
  }

  // 6. D11: total uses
  if (coupon.maxUses != null) {
    const totalUsed = await repo.countRedemptionsTotal(coupon.id, t);
    if (totalUsed >= Number(coupon.maxUses)) {
      throw AppError.from('COUPON_USAGE_EXCEEDED', 'Mã giảm giá đã hết lượt sử dụng');
    }
  }

  // 7. D11: per-user uses (maxUsesPerUser defaults to 1)
  const maxPerUser = Number(coupon.maxUsesPerUser ?? 1);
  if (maxPerUser > 0) {
    const userUsed = await repo.countRedemptionsByUser(coupon.id, userId, t);
    if (userUsed >= maxPerUser) {
      throw AppError.from('COUPON_USAGE_EXCEEDED', 'Bạn đã sử dụng mã giảm giá này');
    }
  }

  // 8. D9: compute discount
  let discount: number;
  if (coupon.type === 'percent') {
    discount = Math.floor((subtotal * Number(coupon.value)) / 100);
  } else {
    // fixed
    discount = Math.min(Number(coupon.value), subtotal);
  }

  return { coupon, discount };
}
