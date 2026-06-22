import { baseApi } from '../../shared/api/baseApi';

/** Response từ POST /me/coupons/validate */
export interface CouponValidateResult {
  couponId: number;
  type: 'percent' | 'fixed';
  value: number;
  /** Số tiền giảm thực tế (VNĐ) — do server tính, FE dùng trực tiếp */
  discount: number;
  message: string;
}

export interface ValidateCouponArgs {
  code: string;
  bookIds: number[];
}

export const couponsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // POST /me/coupons/validate — xác thực mã giảm giá
    validateCoupon: build.mutation<CouponValidateResult, ValidateCouponArgs>({
      query: (body) => ({ url: '/me/coupons/validate', method: 'POST', data: body }),
    }),
  }),
});

export const { useValidateCouponMutation } = couponsApi;
