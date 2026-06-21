import { baseApi } from '../../shared/api/baseApi';
import type { EnvelopeMeta } from '../../shared/api/baseApi';
import type {
  VendorBooksResult,
  VendorBooksParams,
  VendorBookDetail,
  VendorBookStatus,
} from './types';

export const vendorBooksApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // GET /vendor/books — danh sách E-book của vendor (mọi status)
    getVendorBooks: build.query<VendorBooksResult, VendorBooksParams>({
      query: (params) => ({ url: '/vendor/books', method: 'GET', params }),
      transformResponse: (resp: { books: VendorBooksResult['books'] }, meta: EnvelopeMeta | undefined) => ({
        books: resp.books ?? [],
        pagination: meta?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 0 },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.books.map(({ id }) => ({ type: 'VendorBook' as const, id })),
              { type: 'VendorBook', id: 'LIST' },
            ]
          : [{ type: 'VendorBook', id: 'LIST' }],
    }),

    // GET /vendor/books/:id — chi tiết để sửa
    getVendorBook: build.query<VendorBookDetail, { id: number }>({
      query: ({ id }) => ({ url: `/vendor/books/${id}`, method: 'GET' }),
      providesTags: (_result, _err, { id }) => [{ type: 'VendorBook', id }],
    }),

    // POST /vendor/books — tạo E-book (multipart)
    createVendorBook: build.mutation<{ id: number; slug: string; status: VendorBookStatus }, FormData>({
      query: (data) => ({ url: '/vendor/books', method: 'POST', data }),
      invalidatesTags: [{ type: 'VendorBook', id: 'LIST' }],
    }),

    // PUT /vendor/books/:id — cập nhật E-book (multipart)
    updateVendorBook: build.mutation<VendorBookDetail, { id: number; data: FormData }>({
      query: ({ id, data }) => ({ url: `/vendor/books/${id}`, method: 'PUT', data }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'VendorBook', id },
        { type: 'VendorBook', id: 'LIST' },
      ],
    }),

    // PATCH /vendor/books/:id/status — đổi trạng thái
    changeVendorBookStatus: build.mutation<void, { id: number; status: VendorBookStatus }>({
      query: ({ id, status }) => ({
        url: `/vendor/books/${id}/status`,
        method: 'PATCH',
        data: { status },
      }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'VendorBook', id },
        { type: 'VendorBook', id: 'LIST' },
      ],
    }),

    // DELETE /vendor/books/:id — xóa mềm
    deleteVendorBook: build.mutation<void, { id: number }>({
      query: ({ id }) => ({ url: `/vendor/books/${id}`, method: 'DELETE' }),
      invalidatesTags: (_result, _err, { id }) => [
        { type: 'VendorBook', id },
        { type: 'VendorBook', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetVendorBooksQuery,
  useGetVendorBookQuery,
  useCreateVendorBookMutation,
  useUpdateVendorBookMutation,
  useChangeVendorBookStatusMutation,
  useDeleteVendorBookMutation,
} = vendorBooksApi;
