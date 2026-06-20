import { baseApi } from '../../shared/api/baseApi';
import type {
  HomeData,
  BookCard,
  BookDetail,
  Category,
  FilterOptions,
  Pagination,
  CatalogBooksParams,
} from './types';

export interface BooksResult {
  books: BookCard[];
  pagination: Pagination;
}

// RTK Query envelopemeta type (passed to transformResponse as 2nd arg)
interface EnvelopeMeta {
  pagination?: Pagination;
}

export const catalogApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    // GET /catalog/home — trang chủ: sách mới, bán chạy, nổi bật, danh mục
    getHome: build.query<HomeData, void>({
      query: () => ({ url: '/catalog/home', method: 'GET' }),
      providesTags: ['Book'],
    }),

    // GET /catalog/books — danh sách + filter + phân trang
    getBooks: build.query<BooksResult, CatalogBooksParams>({
      query: (params) => ({ url: '/catalog/books', method: 'GET', params }),
      transformResponse: (resp: { books: BookCard[] }, meta: EnvelopeMeta | undefined) => ({
        books: resp.books ?? [],
        pagination: meta?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.books.map(({ id }) => ({ type: 'Book' as const, id })),
              { type: 'Book', id: 'LIST' },
            ]
          : [{ type: 'Book', id: 'LIST' }],
    }),

    // GET /catalog/books/:idOrSlug — chi tiết sách
    getBookDetail: build.query<BookDetail, { idOrSlug: string | number }>({
      query: ({ idOrSlug }) => ({ url: `/catalog/books/${idOrSlug}`, method: 'GET' }),
      providesTags: (_result, _err, { idOrSlug }) => [{ type: 'Book', id: String(idOrSlug) }],
    }),

    // GET /catalog/categories — cây danh mục
    getCategories: build.query<Category[], void>({
      query: () => ({ url: '/catalog/categories', method: 'GET' }),
      transformResponse: (resp: { categories: Category[] }) => resp.categories ?? [],
      providesTags: ['Categories'],
    }),

    // GET /catalog/filters — tùy chọn lọc sidebar
    getFilters: build.query<FilterOptions, void>({
      query: () => ({ url: '/catalog/filters', method: 'GET' }),
    }),
  }),
});

export const {
  useGetHomeQuery,
  useGetBooksQuery,
  useGetBookDetailQuery,
  useGetCategoriesQuery,
  useGetFiltersQuery,
} = catalogApi;
