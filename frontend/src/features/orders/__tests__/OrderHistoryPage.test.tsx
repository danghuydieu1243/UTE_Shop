import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { OrderHistoryPage } from '../pages/OrderHistoryPage';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';

/* ── Mock ordersApi ── */
vi.mock('../ordersApi', () => ({
  useGetOrdersQuery: vi.fn(),
  useCancelOrderMutation: vi.fn(),
}));

import { useGetOrdersQuery, useCancelOrderMutation } from '../ordersApi';

const mockUseGetOrdersQuery = useGetOrdersQuery as ReturnType<typeof vi.fn>;
const mockUseCancelOrderMutation = useCancelOrderMutation as ReturnType<typeof vi.fn>;

/* ── Mock useNavigate ── */
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => vi.fn() };
});

/* ── Sample data ── */
const sampleOrders = [
  {
    code: 'ATHENA-NEW001',
    status: 'NEW' as const,
    itemCount: 2,
    total: 164000,
    currency: 'VND',
    createdAt: '2024-01-01T03:30:00Z',
    completedAt: null,
    cancelledAt: null,
  },
  {
    code: 'ATHENA-DONE01',
    status: 'COMPLETED' as const,
    itemCount: 1,
    total: 89000,
    currency: 'VND',
    createdAt: '2024-01-02T03:30:00Z',
    completedAt: '2024-01-02T04:00:00Z',
    cancelledAt: null,
  },
];

const defaultPagination = {
  page: 1,
  limit: 10,
  total: 2,
  totalPages: 1,
};

const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

const renderPage = () =>
  render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <OrderHistoryPage />
      </MemoryRouter>
    </Provider>,
  );

describe('OrderHistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCancelOrderMutation.mockReturnValue([
      vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) }),
      { isLoading: false },
    ]);
  });

  it('renders order list when data loaded', () => {
    mockUseGetOrdersQuery.mockReturnValue({
      data: { orders: sampleOrders, pagination: defaultPagination },
      isLoading: false,
    });
    renderPage();
    expect(screen.getByText('ATHENA-NEW001')).toBeInTheDocument();
    expect(screen.getByText('ATHENA-DONE01')).toBeInTheDocument();
  });

  it('renders empty state when no orders', () => {
    mockUseGetOrdersQuery.mockReturnValue({
      data: { orders: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } },
      isLoading: false,
    });
    renderPage();
    expect(screen.getByText('Chưa có đơn hàng nào')).toBeInTheDocument();
  });

  it('filter tab "Chờ thanh toán" triggers refetch with status=NEW', () => {
    mockUseGetOrdersQuery.mockReturnValue({
      data: { orders: sampleOrders, pagination: defaultPagination },
      isLoading: false,
    });
    renderPage();
    const tab = screen.getByRole('button', { name: /chờ thanh toán/i });
    fireEvent.click(tab);
    // Sau khi click, useGetOrdersQuery được gọi lại với status=NEW
    // Kiểm tra query được gọi với params có status: 'NEW'
    const calls = mockUseGetOrdersQuery.mock.calls as Array<[{ status?: string }]>;
    const hasNewFilter = calls.some((call) => call[0]?.status === 'NEW');
    expect(hasNewFilter).toBe(true);
  });

  it('click Xem chi tiết navigates to /orders/:code', () => {
    mockUseGetOrdersQuery.mockReturnValue({
      data: {
        orders: [sampleOrders[1]], // COMPLETED order
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
      },
      isLoading: false,
    });
    renderPage();
    // Tìm link Xem chi tiết cho ATHENA-DONE01
    const detailLink = screen.getByRole('link', { name: /xem chi tiết/i });
    expect(detailLink).toHaveAttribute('href', '/orders/ATHENA-DONE01');
  });
});
