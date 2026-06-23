/**
 * AdminProductsPage tests
 *
 * Coverage:
 *  1. Renders product table from mocked getAdminProducts (title + vendorShop + format + status).
 *  2. transformResponse reads the ARRAY + meta shape (contract lock — khớp BE AdminProductDTO).
 *  3. Status tab switching updates query arg (status=hidden etc.).
 *  4. Search input updates query arg.
 *  5. "Gỡ" (published→hidden) + "Khôi phục" (hidden→published) gọi updateProductStatus sau confirm.
 *  6. draft KHÔNG có nút action.
 *  7. Error toast khi mutation lỗi.
 *
 * Mock data shape PHẢI khớp BE AdminProductDTO (vendorShop/authorName/fileFormat) — bài học broad-review P4.
 */

import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';
import type { EnvelopeMeta } from '../../../shared/api/baseApi';

// ── Mock RTK Query hooks ──────────────────────────────────────────────────────
const mockGetAdminProducts = vi.fn();
const mockUnwrap = vi.fn();

vi.mock('../adminApi', async () => {
  const actual = await vi.importActual<typeof import('../adminApi')>('../adminApi');
  return {
    ...actual,
    useGetAdminProductsQuery: (...args: unknown[]) => mockGetAdminProducts(...args),
    useUpdateProductStatusMutation: () => [
      (...args: unknown[]) => ({ unwrap: () => mockUnwrap(...args) }),
      {},
    ],
  };
});

// ── Sample data — khớp BE AdminProductDTO ───────────────────────────────────────
const MOCK_PRODUCTS = [
  {
    id: 1,
    title: 'Clean Code',
    slug: 'clean-code',
    vendorShop: 'Bookstore Alpha',
    authorName: 'Robert C. Martin',
    price: 89000,
    status: 'published' as const,
    fileFormat: 'PDF',
    createdAt: '2024-01-15T08:00:00.000Z',
  },
  {
    id: 2,
    title: 'The Pragmatic Programmer',
    slug: 'pragmatic-programmer',
    vendorShop: 'Reading Corner',
    authorName: 'Andrew Hunt',
    price: 120000,
    status: 'hidden' as const,
    fileFormat: 'EPUB',
    createdAt: '2024-02-10T10:00:00.000Z',
  },
  {
    id: 3,
    title: 'Refactoring',
    slug: 'refactoring',
    vendorShop: 'Novel Haven',
    authorName: 'Martin Fowler',
    price: 95000,
    status: 'draft' as const,
    fileFormat: 'PDF',
    createdAt: '2024-03-01T12:00:00.000Z',
  },
];

const MOCK_PAGINATION = { page: 1, limit: 20, total: 3, totalPages: 1 };

// ── Store factory ─────────────────────────────────────────────────────────────
const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

// ── Render helper ─────────────────────────────────────────────────────────────
const renderPage = async () => {
  const { AdminProductsPage } = await import('../pages/AdminProductsPage');
  return render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <AdminProductsPage />
      </MemoryRouter>
    </Provider>,
  );
};

// ── Default mock setup ────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockGetAdminProducts.mockReturnValue({
    data: { products: MOCK_PRODUCTS, pagination: MOCK_PAGINATION },
    isFetching: false,
    isLoading: false,
  });
  mockUnwrap.mockResolvedValue({ id: 1, status: 'hidden' });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Renders table with product rows
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminProductsPage — render', () => {
  it('renders the page heading "Quản lý Sản phẩm"', async () => {
    await renderPage();
    expect(screen.getByText('Quản lý Sản phẩm')).toBeInTheDocument();
  });

  it('renders title + author for each product', async () => {
    await renderPage();
    expect(screen.getByText('Clean Code')).toBeInTheDocument();
    expect(screen.getByText('Robert C. Martin')).toBeInTheDocument();
    expect(screen.getByText('Refactoring')).toBeInTheDocument();
  });

  it('renders vendorShop for each product', async () => {
    await renderPage();
    expect(screen.getByText('Bookstore Alpha')).toBeInTheDocument();
    expect(screen.getByText('Reading Corner')).toBeInTheDocument();
  });

  it('renders fileFormat badge', async () => {
    await renderPage();
    expect(screen.getAllByText('PDF').length).toBeGreaterThan(0);
    expect(screen.getByText('EPUB')).toBeInTheDocument();
  });

  it('renders status badges (Công khai / Bị gỡ / Nháp)', async () => {
    await renderPage();
    const table = screen.getByRole('table');
    expect(within(table).getByText('Công khai')).toBeInTheDocument();
    expect(within(table).getByText('Bị gỡ')).toBeInTheDocument();
    expect(within(table).getByText('Nháp')).toBeInTheDocument();
  });

  it('renders "Gỡ" for published and "Khôi phục" for hidden', async () => {
    await renderPage();
    expect(screen.getByText('Gỡ')).toBeInTheDocument();
    expect(screen.getByText('Khôi phục')).toBeInTheDocument();
  });

  it('does NOT render an action button for draft products', async () => {
    await renderPage();
    // draft row (Refactoring) → action cell shows "—", không có nút Gỡ/Khôi phục cho nó.
    // Chỉ 1 nút "Gỡ" (published) + 1 nút "Khôi phục" (hidden) trong toàn bảng.
    expect(screen.getAllByText('Gỡ')).toHaveLength(1);
    expect(screen.getAllByText('Khôi phục')).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. transformResponse contract lock — reads ARRAY + meta shape (khớp BE DTO)
// ─────────────────────────────────────────────────────────────────────────────
describe('adminApi.getAdminProducts transformResponse — contract lock', () => {
  it('reads the array from envelope data and meta.pagination correctly', async () => {
    const { transformAdminProductsResponse } = await import('../adminApi');

    const envelopeData = MOCK_PRODUCTS;
    const envelopeMeta: EnvelopeMeta = { pagination: MOCK_PAGINATION };

    const result = transformAdminProductsResponse(envelopeData as never, envelopeMeta);

    expect(Array.isArray(result.products)).toBe(true);
    expect(result.products).toHaveLength(3);
    expect(result.products[0].title).toBe('Clean Code');
    expect(result.products[0].id).toBe(1);
    // Contract lock: các field BE DTO phải tồn tại đúng tên
    expect(result.products[0].vendorShop).toBe('Bookstore Alpha');
    expect(result.products[0].fileFormat).toBe('PDF');
    expect(result.pagination.total).toBe(3);
  });

  it('handles non-array data gracefully (returns empty products)', async () => {
    const { transformAdminProductsResponse } = await import('../adminApi');
    const result = transformAdminProductsResponse(null as never, undefined);
    expect(result.products).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Status tab switching updates query arg
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminProductsPage — status tabs', () => {
  it('clicking "Bị gỡ" tab calls getAdminProducts with status=hidden', async () => {
    await renderPage();
    const hiddenTab = screen.getByRole('button', { name: /^Bị gỡ/i });
    fireEvent.click(hiddenTab);
    await waitFor(() => {
      expect(mockGetAdminProducts).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'hidden' }),
      );
    });
  });

  it('clicking "Công khai" tab calls getAdminProducts with status=published', async () => {
    await renderPage();
    const publishedTab = screen.getByRole('button', { name: /^Công khai/i });
    fireEvent.click(publishedTab);
    await waitFor(() => {
      expect(mockGetAdminProducts).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'published' }),
      );
    });
  });

  it('clicking "Tất cả" tab calls getAdminProducts without status param', async () => {
    await renderPage();
    fireEvent.click(screen.getByRole('button', { name: /^Bị gỡ/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Tất cả/i }));
    await waitFor(() => {
      const lastCall = mockGetAdminProducts.mock.calls[mockGetAdminProducts.mock.calls.length - 1][0];
      expect(lastCall.status).toBeUndefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Search input updates query arg
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminProductsPage — search', () => {
  it('search input updates query with search param', async () => {
    const user = userEvent.setup({ delay: null });
    await renderPage();
    const searchInput = screen.getByLabelText('Tìm kiếm sản phẩm');
    await user.type(searchInput, 'clean');
    await waitFor(() => {
      expect(mockGetAdminProducts).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'clean' }),
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Gỡ / Khôi phục actions
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminProductsPage — takedown / restore', () => {
  it('clicking "Gỡ" then confirming calls updateProductStatus with {id, status:"hidden"}', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByText('Gỡ')); // published product id=1
    const confirmBtn = await screen.findByRole('button', { name: /Xác nhận/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockUnwrap).toHaveBeenCalledWith({ id: 1, status: 'hidden' });
    });
  });

  it('clicking "Khôi phục" then confirming calls updateProductStatus with {id, status:"published"}', async () => {
    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByText('Khôi phục')); // hidden product id=2
    const confirmBtn = await screen.findByRole('button', { name: /Xác nhận/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockUnwrap).toHaveBeenCalledWith({ id: 2, status: 'published' });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Error toast on mutation failure
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminProductsPage — error handling', () => {
  it('shows error toast when updateProductStatus fails', async () => {
    mockUnwrap.mockRejectedValueOnce({
      code: 'RESOURCE_NOT_FOUND',
      message: 'Sản phẩm không tồn tại',
      status: 404,
    });

    const user = userEvent.setup();
    await renderPage();

    await user.click(screen.getByText('Gỡ'));
    const confirmBtn = await screen.findByRole('button', { name: /Xác nhận/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
