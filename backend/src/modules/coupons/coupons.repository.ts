import { Op, Transaction } from 'sequelize';
import { Coupon, CouponRedemption, Order } from '../../db/models';
import { CreateCouponInput, ListCouponsQuery } from './coupons.schema';

// ── Create ────────────────────────────────────────────────────────────────────
export async function createCoupon(data: {
  vendorUserId: number;
  code: string;
  type: string;
  value: number;
  minOrder?: number;
  maxUses?: number | null;
  maxUsesPerUser?: number;
  startsAt?: Date | null;
  endsAt?: Date | null;
  status?: string;
}): Promise<Coupon> {
  return Coupon.create({
    vendorUserId: data.vendorUserId,
    code: data.code,
    type: data.type,
    value: data.value,
    minOrder: data.minOrder ?? 0,
    maxUses: data.maxUses ?? null,
    maxUsesPerUser: data.maxUsesPerUser ?? 1,
    startsAt: data.startsAt ?? null,
    endsAt: data.endsAt ?? null,
    status: data.status ?? 'scheduled',
  });
}

// ── Find by PK ────────────────────────────────────────────────────────────────
export async function findCouponById(id: number): Promise<Coupon | null> {
  return Coupon.findByPk(id);
}

// ── Find by code ──────────────────────────────────────────────────────────────
export async function findCouponByCode(code: string): Promise<Coupon | null> {
  return Coupon.findOne({ where: { code } });
}

// ── Update ────────────────────────────────────────────────────────────────────
export async function updateCoupon(
  id: number,
  data: Partial<{
    code: string;
    type: string;
    value: number;
    minOrder: number;
    maxUses: number | null;
    maxUsesPerUser: number;
    startsAt: Date | null;
    endsAt: Date | null;
    status: string;
  }>,
): Promise<void> {
  await Coupon.update(data, { where: { id } });
}

// ── Delete (hard) ─────────────────────────────────────────────────────────────
export async function deleteCoupon(id: number): Promise<void> {
  await Coupon.destroy({ where: { id } });
}

// ── List vendor coupons ────────────────────────────────────────────────────────
export async function listVendorCoupons(
  vendorUserId: number,
  q: ListCouponsQuery,
): Promise<{ rows: Coupon[]; count: number }> {
  const offset = (q.page - 1) * q.limit;
  const { rows, count } = await Coupon.findAndCountAll({
    where: { vendorUserId },
    order: [['id', 'DESC']],
    limit: q.limit,
    offset,
  });
  return { rows, count };
}

// ── Redemption counts ─────────────────────────────────────────────────────────
export async function countRedemptionsTotal(couponId: number, t?: Transaction): Promise<number> {
  return CouponRedemption.count({
    where: { couponId },
    include: [
      {
        model: Order,
        as: 'order',
        where: { status: { [Op.in]: ['NEW', 'COMPLETED'] } },
        required: true,
      },
    ],
    transaction: t,
  });
}

export async function countRedemptionsByUser(
  couponId: number,
  userId: number,
  t?: Transaction,
): Promise<number> {
  return CouponRedemption.count({
    where: { couponId, userId },
    include: [
      {
        model: Order,
        as: 'order',
        where: { status: { [Op.in]: ['NEW', 'COMPLETED'] } },
        required: true,
      },
    ],
    transaction: t,
  });
}
