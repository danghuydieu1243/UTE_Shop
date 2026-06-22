export type CouponStatus = 'scheduled' | 'running' | 'ended' | 'disabled';
export type CouponType = 'percent' | 'fixed';

export interface Coupon {
  id: number;
  code: string;
  type: CouponType;
  value: number;
  min_order: number | null;
  max_uses: number | null;
  max_uses_per_user: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  status: CouponStatus;
  created_at?: string;
}

export interface CouponCreateRequest {
  code: string;
  type: CouponType;
  value: number;
  minOrder?: number;
  maxUses?: number;
  maxUsesPerUser?: number;
  startsAt?: string;
  endsAt?: string;
  status?: CouponStatus;
}

export interface CouponUpdateRequest extends Partial<CouponCreateRequest> {}

export interface VendorCouponsResult {
  coupons: Coupon[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface VendorCouponsParams {
  page?: number;
  limit?: number;
}
