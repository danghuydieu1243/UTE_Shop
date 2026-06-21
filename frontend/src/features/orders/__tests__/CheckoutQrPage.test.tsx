import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CheckoutQrPage } from '../pages/CheckoutQrPage';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';

/* ── Mock ordersApi ── */
vi.mock('../ordersApi', () => ({
  useGetOrderQuery: vi.fn(),
  useSimulatePaymentMutation: vi.fn(),
  useCancelOrderMutation: vi.fn(),
  useRecreatePaymentMutation: vi.fn(),
}));

import {
  useGetOrderQuery,
  useSimulatePaymentMutation,
  useCancelOrderMutation,
  useRecreatePaymentMutation,
} from '../ordersApi';

const mockUseGetOrderQuery = useGetOrderQuery as ReturnType<typeof vi.fn>;
const mockUseSimulatePaymentMutation = useSimulatePaymentMutation as ReturnType<typeof vi.fn>;
const mockUseCancelOrderMutation = useCancelOrderMutation as ReturnType<typeof vi.fn>;
const mockUseRecreatePaymentMutation = useRecreatePaymentMutation as ReturnType<typeof vi.fn>;

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
const samplePayment = {
  id: 1,
  status: 'PENDING' as const,
  amount: 264000,
  currency: 'VND',
  referenceCode: 'ATHENA123456',
  qrPayload: '{}',
  expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 phút sau
  paidAt: null,
};

const sampleOrder = {
  code: 'ATHENA123',
  status: 'NEW' as const,
  subtotal: 264000,
  couponDiscount: 0,
  loyaltyDiscount: 0,
  total: 264000,
  currency: 'VND',
  items: [
    {
      bookId: 101,
      slug: 'dac-nhan-tam',
      title: 'Đắc Nhân Tâm',
      coverImageUrl: null,
      unitPrice: 89000,
    },
  ],
  payment: samplePayment,
  createdAt: '2024-01-01T00:00:00Z',
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
        <CheckoutQrPage />
      </MemoryRouter>
    </Provider>,
  );

describe('CheckoutQrPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mặc định mutations trả về thành công
    mockUseSimulatePaymentMutation.mockReturnValue([
      vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) }),
      { isLoading: false },
    ]);
    mockUseCancelOrderMutation.mockReturnValue([
      vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) }),
      { isLoading: false },
    ]);
    mockUseRecreatePaymentMutation.mockReturnValue([
      vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) }),
      { isLoading: false },
    ]);
  });

  it('renders QR page with payment info', () => {
    mockUseGetOrderQuery.mockReturnValue({ data: sampleOrder, isLoading: false });
    renderPage();
    // Kiểm tra referenceCode hiện
    expect(screen.getByText('ATHENA123456')).toBeInTheDocument();
    // Kiểm tra số tiền định dạng VND — có thể xuất hiện nhiều lần (info-list + summary)
    const amountEls = screen.getAllByText(/264\.000đ/);
    expect(amountEls.length).toBeGreaterThan(0);
    // Kiểm tra QR frame hiển thị
    expect(screen.getByTestId('qr-frame')).toBeInTheDocument();
  });

  it('calls simulatePayment and navigates on confirm', async () => {
    const mockSimulateFn = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({}),
    });
    mockUseSimulatePaymentMutation.mockReturnValue([mockSimulateFn, { isLoading: false }]);
    mockUseGetOrderQuery.mockReturnValue({ data: sampleOrder, isLoading: false });
    renderPage();

    // Bấm nút "Tôi đã chuyển khoản"
    const btn = screen.getByRole('button', { name: /tôi đã chuyển khoản/i });
    fireEvent.click(btn);

    // Kiểm tra simulatePayment được gọi với id = 1
    expect(mockSimulateFn).toHaveBeenCalledWith(1);
    // Kiểm tra navigate đến trang chi tiết đơn hàng
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/orders/ATHENA123'));
  });

  it('shows recreate QR button when payment is null', () => {
    const orderNoPayment = { ...sampleOrder, payment: null };
    mockUseGetOrderQuery.mockReturnValue({ data: orderNoPayment, isLoading: false });
    renderPage();
    // Nút "Tạo lại QR" phải hiển thị
    expect(screen.getByTestId('btn-recreate-qr')).toBeInTheDocument();
  });

  it('shows expired state when expiresAt is in the past', () => {
    const expiredPayment = {
      ...samplePayment,
      expiresAt: new Date(Date.now() - 60 * 1000).toISOString(), // 1 phút trước
    };
    const expiredOrder = { ...sampleOrder, payment: expiredPayment };
    mockUseGetOrderQuery.mockReturnValue({ data: expiredOrder, isLoading: false });
    renderPage();
    // Nút "Tạo lại QR" phải xuất hiện khi payment hết hạn
    expect(screen.getByTestId('btn-recreate-qr')).toBeInTheDocument();
  });
});
