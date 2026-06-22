/**
 * AdminVendorsPage tests — TDD RED phase
 * Tests written BEFORE implementation per TDD discipline.
 *
 * Coverage:
 *  1. Page renders vendor table from mocked getAdminVendors (shopName + status badge + bookCount).
 *  2. transformResponse reads the ARRAY + meta shape correctly (contract lock).
 *  3. Switching status tab updates the query arg (status=locked etc.).
 *  4. Search input updates the query arg.
 *  5. Clicking "Khóa" calls updateVendorStatus with {id, status:'locked'} (after confirm).
 *  6. Error toast on lock failure.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';
import type { EnvelopeMeta } from '../../../shared/api/baseApi';

// ── We mock the RTK Query hooks so tests stay unit-level ─────────────────────
const mockGetAdminVendors = vi.fn();
const mockUnwrap = vi.fn();

vi.mock('../adminApi', async () => {
  const actual = await vi.importActual<typeof import('../adminApi')>('../adminApi');
  return {
    ...actual,
    useGetAdminVendorsQuery: (...args: unknown[]) => mockGetAdminVendors(...args),
    useUpdateVendorStatusMutation: () => [
      (...args: unknown[]) => ({ unwrap: () => mockUnwrap(...args) }),
      {},
    ],
  };
});

// ── Sample data ───────────────────────────────────────────────────────────────
const MOCK_VENDORS = [
  {
    userId: 1,
    shopName: 'Bookstore Alpha',
    shopSlug: 'bookstore-alpha',
    ownerName: 'Alice Nguyen',
    ownerEmail: 'alice@example.com',
    status: 'active' as const,
    bookCount: 42,
    createdAt: '2024-01-15T08:00:00.000Z',
  },
  {
    userId: 2,
    shopName: 'Reading Corner',
    shopSlug: 'reading-corner',
    ownerName: 'Bob Tran',
    ownerEmail: 'bob@example.com',
    status: 'locked' as const,
    bookCount: 15,
    createdAt: '2024-02-10T10:00:00.000Z',
  },
  {
    userId: 3,
    shopName: 'Novel Haven',
    shopSlug: 'novel-haven',
    ownerName: 'Charlie Le',
    ownerEmail: 'charlie@example.com',
    status: 'active' as const,
    bookCount: 8,
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
  const { AdminVendorsPage } = await import('../pages/AdminVendorsPage');
  return render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <AdminVendorsPage />
      </MemoryRouter>
    </Provider>,
  );
};

// ── Setup default mock ────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockGetAdminVendors.mockReturnValue({
    data: { vendors: MOCK_VENDORS, pagination: MOCK_PAGINATION },
    isFetching: false,
    isLoading: false,
  });
  mockUnwrap.mockResolvedValue({ userId: 1, status: 'locked' });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Renders table with vendor rows
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminVendorsPage — render', () => {
  it('renders the page heading "Quản lý Vendor"', async () => {
    await renderPage();
    expect(screen.getByText('Quản lý Vendor')).toBeInTheDocument();
  });

  it('renders shopName for each vendor', async () => {
    await renderPage();
    expect(screen.getByText('Bookstore Alpha')).toBeInTheDocument();
    expect(screen.getByText('Reading Corner')).toBeInTheDocument();
    expect(screen.getByText('Novel Haven')).toBeInTheDocument();
  });

  it('renders ownerName and ownerEmail for each vendor', async () => {
    await renderPage();
    expect(screen.getByText('Alice Nguyen')).toBeInTheDocument();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('Bob Tran')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
  });

  it('renders bookCount for each vendor', async () => {
    await renderPage();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument();
  });

  it('renders status badge for active/locked vendors', async () => {
    await renderPage();
    // "Hoạt động" for active vendors, "Bị khóa" for locked
    expect(screen.getAllByText('Hoạt động').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bị khóa').length).toBeGreaterThan(0);
  });

  it('renders Khóa button for active vendors', async () => {
    await renderPage();
    const lockButtons = screen.getAllByText('Khóa');
    expect(lockButtons.length).toBeGreaterThan(0);
  });

  it('renders Mở khóa button for locked vendors', async () => {
    await renderPage();
    expect(screen.getByText('Mở khóa')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. transformResponse contract lock — reads ARRAY + meta shape
// ─────────────────────────────────────────────────────────────────────────────
describe('adminApi.getAdminVendors transformResponse — contract lock', () => {
  it('reads the array from envelope data and meta.pagination correctly', async () => {
    const { transformAdminVendorsResponse } = await import('../adminApi');

    const envelopeData = MOCK_VENDORS;
    const envelopeMeta: EnvelopeMeta = { pagination: MOCK_PAGINATION };

    const result = transformAdminVendorsResponse(envelopeData as never, envelopeMeta);

    expect(Array.isArray(result.vendors)).toBe(true);
    expect(result.vendors).toHaveLength(3);
    expect(result.vendors[0].shopName).toBe('Bookstore Alpha');
    expect(result.vendors[0].userId).toBe(1);
    expect(result.pagination.total).toBe(3);
    expect(result.pagination.totalPages).toBe(1);
  });

  it('handles non-array data gracefully (returns empty vendors)', async () => {
    const { transformAdminVendorsResponse } = await import('../adminApi');
    const result = transformAdminVendorsResponse(null as never, undefined);
    expect(result.vendors).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Status tab switching updates query arg
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminVendorsPage — status tabs', () => {
  it('clicking "Bị khóa" tab calls getAdminVendors with status=locked', async () => {
    await renderPage();
    // Find the tab button for "Bị khóa"
    const lockedTab = screen.getByRole('button', { name: /Bị khóa/i });
    fireEvent.click(lockedTab);
    await waitFor(() => {
      expect(mockGetAdminVendors).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'locked' }),
      );
    });
  });

  it('clicking "Đang hoạt động" tab calls getAdminVendors with status=active', async () => {
    await renderPage();
    const activeTab = screen.getByRole('button', { name: /Đang hoạt động/i });
    fireEvent.click(activeTab);
    await waitFor(() => {
      expect(mockGetAdminVendors).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'active' }),
      );
    });
  });

  it('clicking "Tất cả" tab calls getAdminVendors without status param', async () => {
    await renderPage();
    // Switch to locked first
    fireEvent.click(screen.getByRole('button', { name: /Bị khóa/i }));
    // Then back to all
    fireEvent.click(screen.getByRole('button', { name: /Tất cả/i }));
    await waitFor(() => {
      const lastCall = mockGetAdminVendors.mock.calls[mockGetAdminVendors.mock.calls.length - 1][0];
      expect(lastCall.status).toBeUndefined();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3b. "Tất cả" count badge visibility
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminVendorsPage — "Tất cả" count badge', () => {
  it('shows count badge on "Tất cả" tab when it is the active tab', async () => {
    await renderPage();
    // Default tab is "Tất cả" (statusTab = ''), total = 3
    const tatCaBtn = screen.getByRole('button', { name: /Tất cả/i });
    expect(tatCaBtn).toHaveTextContent('3');
  });

  it('does NOT show count badge on "Tất cả" tab when a different tab is active', async () => {
    await renderPage();
    // Switch to "Đang hoạt động" tab
    fireEvent.click(screen.getByRole('button', { name: /Đang hoạt động/i }));
    const tatCaBtn = screen.getByRole('button', { name: /Tất cả/i });
    // Badge span (the count number) must NOT appear inside the "Tất cả" button
    expect(tatCaBtn.querySelector('span')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Search input updates query arg
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminVendorsPage — search', () => {
  it('search input updates query with search param', async () => {
    const user = userEvent.setup({ delay: null });
    await renderPage();
    const searchInput = screen.getByLabelText('Tìm kiếm vendor');
    await user.type(searchInput, 'alpha');
    await waitFor(() => {
      expect(mockGetAdminVendors).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'alpha' }),
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Lock action calls updateVendorStatus
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminVendorsPage — lock action', () => {
  it('clicking Khóa then confirming calls updateVendorStatus with {id, status:"locked"}', async () => {
    const user = userEvent.setup();
    await renderPage();

    // Find the Lock button for first active vendor (Bookstore Alpha, userId=1)
    const lockButtons = screen.getAllByText('Khóa');
    await user.click(lockButtons[0]);

    // Confirm dialog should appear
    const confirmBtn = await screen.findByRole('button', { name: /Xác nhận/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockUnwrap).toHaveBeenCalledWith({ id: 1, status: 'locked' });
    });
  });

  it('clicking Mở khóa then confirming calls updateVendorStatus with {id, status:"active"}', async () => {
    const user = userEvent.setup();
    await renderPage();

    // Reading Corner is locked (userId=2)
    const unlockBtn = screen.getByText('Mở khóa');
    await user.click(unlockBtn);

    const confirmBtn = await screen.findByRole('button', { name: /Xác nhận/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockUnwrap).toHaveBeenCalledWith({ id: 2, status: 'active' });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Error toast on lock failure
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminVendorsPage — lock error handling', () => {
  it('shows error toast when updateVendorStatus fails', async () => {
    mockUnwrap.mockRejectedValueOnce({
      code: 'VENDOR_LOCK_FAILED',
      message: 'Có lỗi xảy ra khi khóa vendor',
      status: 500,
    });

    const user = userEvent.setup();
    await renderPage();

    const lockButtons = screen.getAllByText('Khóa');
    await user.click(lockButtons[0]);

    const confirmBtn = await screen.findByRole('button', { name: /Xác nhận/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });
  });
});
