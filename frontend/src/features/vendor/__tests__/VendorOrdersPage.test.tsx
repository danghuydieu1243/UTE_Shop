import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { VendorOrdersPage } from '../pages/VendorOrdersPage';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';

/* ── Mocks ────────────────────────────────────────────────────── */
vi.mock('../vendorOrdersApi', () => ({
  useGetVendorOrdersQuery: vi.fn(),
}));

vi.mock('../../auth/authApi', () => ({
  useGetMeQuery: vi.fn(() => ({ data: null })),
  useLogoutMutation: vi.fn(() => [vi.fn(), {}]),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => vi.fn() };
});

import { useGetVendorOrdersQuery } from '../vendorOrdersApi';
const mockGetVendorOrders = useGetVendorOrdersQuery as ReturnType<typeof vi.fn>;

/* ── Sample data ──────────────────────────────────────────────── */
const sampleOrders = [
  {
    code: '#ATH-00845',
    status: 'NEW' as const,
    total: 178000,
    createdAt: '2026-06-06T02:12:00Z',
    items: [
      { titleSnapshot: 'Clean Code', unitPrice: 89000 },
      { titleSnapshot: 'Atomic Habits', unitPrice: 89000 },
    ],
  },
  {
    code: '#ATH-00846',
    status: 'COMPLETED' as const,
    total: 89000,
    createdAt: '2026-06-07T05:30:00Z',
    items: [{ titleSnapshot: 'Đắc Nhân Tâm', unitPrice: 89000 }],
  },
  {
    code: '#ATH-00847',
    status: 'CANCELLED' as const,
    total: 55000,
    createdAt: '2026-06-08T09:00:00Z',
    items: [{ titleSnapshot: 'The Pragmatic Programmer', unitPrice: 55000 }],
  },
];

const defaultPagination = { page: 1, limit: 10, total: 3, totalPages: 1 };

/* ── Store & render helpers ──────────────────────────────────── */
const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

const renderPage = () =>
  render(
    <Provider store={makeStore()}>
      <MemoryRouter initialEntries={['/vendor/orders']}>
        <VendorOrdersPage />
      </MemoryRouter>
    </Provider>,
  );

/* ── Tests ────────────────────────────────────────────────────── */
describe('VendorOrdersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetVendorOrders.mockReturnValue({
      data: { orders: sampleOrders, pagination: defaultPagination },
      isFetching: false,
    });
  });

  it('renders a table with order codes', () => {
    renderPage();
    expect(screen.getByText('#ATH-00845')).toBeInTheDocument();
    expect(screen.getByText('#ATH-00846')).toBeInTheDocument();
    expect(screen.getByText('#ATH-00847')).toBeInTheDocument();
  });

  it('renders vendor item titles for each order row', () => {
    renderPage();
    expect(screen.getByText('Clean Code')).toBeInTheDocument();
    expect(screen.getByText('Đắc Nhân Tâm')).toBeInTheDocument();
  });

  it('renders status badge for each order', () => {
    renderPage();
    // One badge per order row — sampleOrders has 3 rows
    const badges = screen.getAllByTestId('order-status-badge');
    expect(badges).toHaveLength(sampleOrders.length);
  });

  it('clicking status tab "Thành công" updates query with status=COMPLETED', async () => {
    renderPage();
    const tab = screen.getByRole('button', { name: /thành công/i });
    fireEvent.click(tab);
    await waitFor(() => {
      const calls = mockGetVendorOrders.mock.calls as Array<[{ status?: string }]>;
      const hasFilter = calls.some((call) => call[0]?.status === 'COMPLETED');
      expect(hasFilter).toBe(true);
    });
  });

  it('clicking status tab "Tất cả" queries without status filter', async () => {
    // Set initial state to COMPLETED filter
    renderPage();
    const completedTab = screen.getByRole('button', { name: /thành công/i });
    fireEvent.click(completedTab);
    const allTab = screen.getByRole('button', { name: /tất cả/i });
    fireEvent.click(allTab);
    await waitFor(() => {
      const calls = mockGetVendorOrders.mock.calls as Array<[{ status?: string }]>;
      // Last call should have no status (or status undefined)
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]?.status).toBeUndefined();
    });
  });

  it('updates query with q when searching by order code or book title', async () => {
    renderPage();

    fireEvent.change(screen.getByPlaceholderText(/mã đơn hoặc tên sách/i), {
      target: { value: 'atomic' },
    });

    await waitFor(() => {
      const calls = mockGetVendorOrders.mock.calls as Array<[{ q?: string }]>;
      const hasSearch = calls.some((call) => call[0]?.q === 'atomic');
      expect(hasSearch).toBe(true);
    });
  });

  it('updates query with fromDate and toDate when date range changes', async () => {
    renderPage();

    const fromInput = screen.getByLabelText(/từ ngày/i);
    const toInput = screen.getByLabelText(/đến ngày/i);

    fireEvent.change(fromInput, { target: { value: '2026-06-15' } });
    fireEvent.change(toInput, { target: { value: '2026-06-20' } });

    await waitFor(() => {
      const calls = mockGetVendorOrders.mock.calls as Array<[{ fromDate?: string; toDate?: string }]>;
      const hasDateRange = calls.some(
        (call) => call[0]?.fromDate === '2026-06-15' && call[0]?.toDate === '2026-06-20',
      );
      expect(hasDateRange).toBe(true);
    });
  });

  it('shows empty state when no orders', () => {
    mockGetVendorOrders.mockReturnValue({
      data: { orders: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } },
      isFetching: false,
    });
    renderPage();
    expect(screen.getByTestId('vendor-orders-empty')).toBeInTheDocument();
  });

  it('does NOT render any mutation action buttons (read-only)', () => {
    renderPage();
    // Should not have edit/confirm/delete action buttons per row — only tab filter buttons
    // Specifically, there should be NO "Sửa" or "Xác nhận" buttons
    expect(screen.queryByRole('button', { name: /^sửa$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /xác nhận/i })).not.toBeInTheDocument();
    // No "Xóa" button either
    expect(screen.queryByRole('button', { name: /^xóa$/i })).not.toBeInTheDocument();
  });
});
