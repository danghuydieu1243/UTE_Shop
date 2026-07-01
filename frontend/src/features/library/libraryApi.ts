// API endpoints cho thư viện e-book cá nhân
import { baseApi } from '../../shared/api/baseApi';
import type { EnvelopeMeta } from '../../shared/api/baseApi';
import type { Ebook, GetEbooksParams, EbooksResult, DownloadLink } from './types';

const libraryApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // GET /me/ebooks?q&page&limit — danh sách e-book đã mua
    getMyEbooks: build.query<EbooksResult, GetEbooksParams>({
      query: (params) => ({
        url: '/me/ebooks',
        method: 'GET',
        params,
      }),
      // backend trả data: EbookDTO[] (mảng trực tiếp, đã unwrap bởi baseApi)
      // meta.pagination từ backend envelope
      transformResponse: (resp: Ebook[], meta: EnvelopeMeta | undefined) => ({
        ebooks: resp ?? [],
        pagination: meta?.pagination ?? { page: 1, limit: 12, total: 0, totalPages: 0 },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.ebooks.map(({ bookId }) => ({
                type: 'Ebook' as const,
                id: bookId,
              })),
              { type: 'Ebook' as const, id: 'LIST' },
            ]
          : [{ type: 'Ebook' as const, id: 'LIST' }],
    }),

    // GET /me/ebooks/ids — mảng bookId user đã sở hữu (đánh dấu "đã mua" ở catalog)
    getOwnedBookIds: build.query<number[], void>({
      query: () => ({ url: '/me/ebooks/ids', method: 'GET' }),
      // backend trả { bookIds: number[] } (đã unwrap envelope bởi baseApi)
      transformResponse: (resp: { bookIds: number[] } | undefined) => resp?.bookIds ?? [],
      providesTags: [{ type: 'OwnedBooks' as const, id: 'LIST' }],
    }),

    // POST /me/ebooks/:bookId/download — lấy signed URL tải file
    requestDownload: build.mutation<DownloadLink, number>({
      query: (bookId) => ({
        url: `/me/ebooks/${bookId}/download`,
        method: 'POST',
      }),
      // Không invalidate — signed URL là ephemeral, không ảnh hưởng cache
    }),
  }),
});

export const { useGetMyEbooksQuery, useGetOwnedBookIdsQuery, useRequestDownloadMutation } = libraryApi;
