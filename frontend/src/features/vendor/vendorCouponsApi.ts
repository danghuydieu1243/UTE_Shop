import { baseApi } from '../../shared/api/baseApi';
import type { EnvelopeMeta } from '../../shared/api/baseApi';
import type {
  VendorCouponsResult,
  VendorCouponsParams,
  Coupon,
  CouponCreateRequest,
  CouponUpdateRequest,
} from './couponTypes';

export const vendorCouponsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // GET /vendor/coupons — danh sách mã giảm giá
    getVendorCoupons: build.query<VendorCouponsResult, VendorCouponsParams>({
      query: (params) => ({ url: '/vendor/coupons', method: 'GET', params }),
      transformResponse: (resp: Coupon[], meta: EnvelopeMeta | undefined) => ({
        coupons: resp ?? [],
        pagination: meta?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0 },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.coupons.map(({ id }) => ({ type: 'VendorCoupon' as const, id })),
              { type: 'VendorCoupon', id: 'LIST' },
            ]
          : [{ type: 'VendorCoupon', id: 'LIST' }],
    }),

    // POST /vendor/coupons — tạo mã giảm giá
    createCoupon: build.mutation<{ id: number }, CouponCreateRequest>({
      query: (data) => ({ url: '/vendor/coupons', method: 'POST', data }),
      invalidatesTags: [{ type: 'VendorCoupon', id: 'LIST' }],
    }),

    // PATCH /vendor/coupons/:id — cập nhật mã giảm giá
    updateCoupon: build.mutation<Coupon, { id: number; data: CouponUpdateRequest }>({
      query: ({ id, data }) => ({ url: `/vendor/coupons/${id}`, method: 'PATCH', data }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'VendorCoupon', id },
        { type: 'VendorCoupon', id: 'LIST' },
      ],
    }),

    // DELETE /vendor/coupons/:id — xóa mã giảm giá
    deleteCoupon: build.mutation<void, { id: number }>({
      query: ({ id }) => ({ url: `/vendor/coupons/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'VendorCoupon', id },
        { type: 'VendorCoupon', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetVendorCouponsQuery,
  useCreateCouponMutation,
  useUpdateCouponMutation,
  useDeleteCouponMutation,
} = vendorCouponsApi;
