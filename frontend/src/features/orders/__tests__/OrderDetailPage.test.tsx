import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { OrderDetailPage } from '../pages/OrderDetailPage';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';

/* ── Mock ordersApi ── */
vi.mock('../ordersApi', () => ({
  useGetOrderQuery: vi.fn(),
  useCancelOrderMutation: vi.fn(),
}));

/* ── Mock authApi (useGetMeQuery dùng trong AccountShell) ── */
vi.mock('../../auth/authApi', () => ({
  useGetMeQuery: vi.fn(() => ({ data: null })),
  useLogoutMutation: vi.fn(() => [vi.fn(), {}]),
}));

import { useGetOrderQuery, useCancelOrderMutation } from '../ordersApi';

const mockUseGetOrderQuery = useGetOrderQuery as ReturnType<typeof vi.fn>;
const mockUseCancelOrderMutation = useCancelOrderMutation as ReturnType<typeof vi.fn>;

/* ── Mock useNavigate + useParams ── */
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ code: 'ATHENA123' }),
  };
});

/* ── Sample data ── */
const sampleOrderDetail = {
  code: 'ATHENA123',
  status: 'NEW' as const,
  subtotal: 164000,
  couponDiscount: 0,
  loyaltyDiscount: 0,
  total: 164000,
  currency: 'VND',
  items: [
    {
      bookId: 101,
      slug: 'dac-nhan-tam',
      title: 'Đắc Nhân Tâm',
      coverImageUrl: null,
      unitPrice: 89000,
    },
    {
      bookId: 102,
      slug: 'atomic-habits',
      title: 'Atomic Habits',
      coverImageUrl: null,
      unitPrice: 75000,
    },
  ],
  payment: null,
  createdAt: '2024-01-01T03:30:00Z',
  completedAt: null,
  cancelledAt: null,
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
        <OrderDetailPage />
      </MemoryRouter>
    </Provider>,
  );

describe('OrderDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseCancelOrderMutation.mockReturnValue([
      vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) }),
      { isLoading: false },
    ]);
  });

  it('renders order items and total', () => {
    mockUseGetOrderQuery.mockReturnValue({ data: sampleOrderDetail, isLoading: false });
    renderPage();
    expect(screen.getByText('Đắc Nhân Tâm')).toBeInTheDocument();
    expect(screen.getByText('Atomic Habits')).toBeInTheDocument();
    // Kiểm tra tổng tiền format VND
    expect(screen.getAllByText(/164\.000đ/).length).toBeGreaterThan(0);
  });

  it('renders COMPLETED status badge', () => {
    const completedOrder = {
      ...sampleOrderDetail,
      status: 'COMPLETED' as const,
      completedAt: '2024-01-01T04:00:00Z',
    };
    mockUseGetOrderQuery.mockReturnValue({ data: completedOrder, isLoading: false });
    renderPage();
    expect(screen.getByText('Hoàn thành')).toBeInTheDocument();
  });

  it('cancel button calls cancelOrder when NEW', async () => {
    const cancelFn = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
    mockUseCancelOrderMutation.mockReturnValue([cancelFn, { isLoading: false }]);
    mockUseGetOrderQuery.mockReturnValue({ data: sampleOrderDetail, isLoading: false });
    renderPage();

    // Click nút "Hủy đơn hàng"
    const cancelBtn = screen.getByRole('button', { name: /hủy đơn hàng/i });
    fireEvent.click(cancelBtn);

    // Confirm modal xuất hiện, click "Xác nhận hủy"
    const confirmBtn = await screen.findByRole('button', { name: /xác nhận hủy/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => expect(cancelFn).toHaveBeenCalledWith('ATHENA123'));
  });

  it('shows download link when COMPLETED', () => {
    const completedOrder = {
      ...sampleOrderDetail,
      status: 'COMPLETED' as const,
      completedAt: '2024-01-01T04:00:00Z',
    };
    mockUseGetOrderQuery.mockReturnValue({ data: completedOrder, isLoading: false });
    renderPage();
    const downloadLink = screen.getByRole('link', { name: /tải e-book/i });
    expect(downloadLink).toHaveAttribute('href', '/me/ebooks');
  });
});
