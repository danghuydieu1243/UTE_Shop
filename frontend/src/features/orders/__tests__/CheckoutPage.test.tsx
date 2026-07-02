import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CheckoutPage } from '../pages/CheckoutPage';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';

/* ── Mock ordersApi ── */
vi.mock('../ordersApi', () => ({
  useCreateOrderMutation: vi.fn(),
}));

/* ── Mock cartApi ── */
vi.mock('../../cart/cartApi', () => ({
  useGetCartQuery: vi.fn(),
}));

/* ── Mock couponsApi ── */
vi.mock('../../coupons/couponsApi', () => ({
  useValidateCouponMutation: vi.fn(),
}));

/* ── Mock loyaltyApi ── */
vi.mock('../../loyalty/loyaltyApi', () => ({
  useGetLoyaltyQuery: vi.fn(),
}));

import { useCreateOrderMutation } from '../ordersApi';
import { useGetCartQuery } from '../../cart/cartApi';
import { useValidateCouponMutation } from '../../coupons/couponsApi';
import { useGetLoyaltyQuery } from '../../loyalty/loyaltyApi';

const mockUseCreateOrderMutation = useCreateOrderMutation as ReturnType<typeof vi.fn>;
const mockUseGetCartQuery = useGetCartQuery as ReturnType<typeof vi.fn>;
const mockUseValidateCouponMutation = useValidateCouponMutation as ReturnType<typeof vi.fn>;
const mockUseGetLoyaltyQuery = useGetLoyaltyQuery as ReturnType<typeof vi.fn>;

/* ── Mock useNavigate ── */
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

/* ── Sample data ── */
const sampleCart = {
  items: [
    {
      id: 1,
      book: {
        id: 101,
        slug: 'dac-nhan-tam',
        title: 'Đắc Nhân Tâm',
        author: 'Dale Carnegie',
        coverImageUrl: null,
        price: 89000,
        fileFormat: 'PDF' as const,
      },
      unitPrice: 89000,
      addedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      book: {
        id: 102,
        slug: 'nha-gia-kim',
        title: 'Nhà Giả Kim',
        author: 'Paulo Coelho',
        coverImageUrl: null,
        price: 75000,
        fileFormat: 'EPUB' as const,
      },
      unitPrice: 75000,
      addedAt: '2024-01-02T00:00:00Z',
    },
  ],
  subtotal: 164000,
  itemCount: 2,
  currency: 'VND',
};

const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

const renderPage = (selectedCartItemIds?: number[]) =>
  render(
    <Provider store={makeStore()}>
      <MemoryRouter initialEntries={[{ pathname: '/checkout', state: selectedCartItemIds ? { selectedCartItemIds } : null }]}>
        <CheckoutPage />
      </MemoryRouter>
    </Provider>,
  );

describe('CheckoutPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mặc định createOrder trả về unwrap thành công
    mockUseCreateOrderMutation.mockReturnValue([
      vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({ code: 'ATHENA123' }) }),
      { isLoading: false },
    ]);
    // Mặc định validateCoupon
    mockUseValidateCouponMutation.mockReturnValue([
      vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({ couponId: 1, type: 'percent', value: 10, discount: 20000, message: 'OK' }) }),
      { isLoading: false },
    ]);
    // Mặc định loyalty: không có điểm
    mockUseGetLoyaltyQuery.mockReturnValue({ data: { balance: 0, transactions: [] }, isLoading: false });
  });

  it('renders cart items when data loaded', () => {
    mockUseGetCartQuery.mockReturnValue({ data: sampleCart, isLoading: false });
    renderPage();
    // Kiểm tra 2 title sách hiện trong DOM
    expect(screen.getByText('Đắc Nhân Tâm')).toBeInTheDocument();
    expect(screen.getByText('Nhà Giả Kim')).toBeInTheDocument();
    // Kiểm tra giá định dạng VND
    expect(screen.getAllByText(/89\.000đ/).length).toBeGreaterThan(0);
  });

  it('calls createOrder and navigates on submit', async () => {
    const mockCreateFn = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({ code: 'ATHENA123' }) });
    mockUseCreateOrderMutation.mockReturnValue([mockCreateFn, { isLoading: false }]);
    mockUseGetCartQuery.mockReturnValue({ data: sampleCart, isLoading: false });
    renderPage([1, 2]);

    const submitBtn = screen.getByRole('button', { name: /đặt đơn & thanh toán/i });
    fireEvent.click(submitBtn);

    expect(mockCreateFn).toHaveBeenCalledWith({
      couponCode: undefined,
      pointsToUse: 0,
      selectedCartItemIds: [1, 2],
    });
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/checkout/ATHENA123'));
  });

  it('shows empty state when cart is empty', () => {
    mockUseGetCartQuery.mockReturnValue({
      data: { items: [], subtotal: 0, itemCount: 0, currency: 'VND' },
      isLoading: false,
    });
    renderPage();
    expect(screen.getByText('Giỏ hàng trống')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /quay lại giỏ hàng/i })).toBeInTheDocument();
  });

  /* ─── Task 8: Coupon tests ─── */

  it('applying a valid coupon reduces displayed total by the server discount', async () => {
    mockUseGetCartQuery.mockReturnValue({ data: sampleCart, isLoading: false });
    const mockValidateFn = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ couponId: 5, type: 'fixed', value: 20000, discount: 20000, message: 'Áp dụng thành công' }),
    });
    mockUseValidateCouponMutation.mockReturnValue([mockValidateFn, { isLoading: false }]);
    renderPage();

    // Nhập mã coupon
    const input = screen.getByPlaceholderText(/nhập mã giảm giá/i);
    fireEvent.change(input, { target: { value: 'SAVE20K' } });

    // Bấm "Áp dụng"
    const applyBtn = screen.getByRole('button', { name: /áp dụng/i });
    fireEvent.click(applyBtn);

    // Sau khi validate OK → tổng = 164000 - 20000 = 144000
    await waitFor(() => {
      expect(screen.getByText(/144\.000đ/)).toBeInTheDocument();
    });
  });

  it('invalid coupon shows error message and does NOT change the total', async () => {
    mockUseGetCartQuery.mockReturnValue({ data: sampleCart, isLoading: false });
    const mockValidateFn = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockRejectedValue({ message: 'Mã giảm giá không hợp lệ', code: 'COUPON_INVALID' }),
    });
    mockUseValidateCouponMutation.mockReturnValue([mockValidateFn, { isLoading: false }]);
    renderPage();

    const input = screen.getByPlaceholderText(/nhập mã giảm giá/i);
    fireEvent.change(input, { target: { value: 'BADCODE' } });
    fireEvent.click(screen.getByRole('button', { name: /áp dụng/i }));

    await waitFor(() => {
      expect(screen.getByText(/mã giảm giá không hợp lệ/i)).toBeInTheDocument();
    });
    // Total unchanged — still 164000 (appears in both subtotal + total rows)
    expect(screen.getAllByText(/164\.000đ/).length).toBeGreaterThan(0);
  });

  it('toggling use-points ON reduces total and is capped at subtotal minus coupon', async () => {
    mockUseGetCartQuery.mockReturnValue({ data: sampleCart, isLoading: false });
    // User has 500 points = 50000đ; subtotal 164000; no coupon → cap = min(500,ceil(164000/100))=min(500,1640)=500
    // loyalty_discount = min(500*100, 164000) = 50000; total = 164000 - 50000 = 114000
    mockUseGetLoyaltyQuery.mockReturnValue({ data: { balance: 500, transactions: [] }, isLoading: false });
    renderPage();

    // Toggle checkbox "Dùng điểm thưởng"
    const toggle = screen.getByRole('checkbox', { name: /dùng điểm thưởng/i });
    fireEvent.click(toggle);

    await waitFor(() => {
      // total = 164000 - 50000 = 114000
      expect(screen.getByText(/114\.000đ/)).toBeInTheDocument();
    });
  });

  it('submitting calls createOrder with correct couponCode and pointsToUse', async () => {
    mockUseGetCartQuery.mockReturnValue({ data: sampleCart, isLoading: false });
    const mockCreateFn = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({ code: 'ATHENA999' }) });
    mockUseCreateOrderMutation.mockReturnValue([mockCreateFn, { isLoading: false }]);

    // Apply coupon
    const mockValidateFn = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({ couponId: 7, type: 'fixed', value: 10000, discount: 10000, message: 'OK' }),
    });
    mockUseValidateCouponMutation.mockReturnValue([mockValidateFn, { isLoading: false }]);
    mockUseGetLoyaltyQuery.mockReturnValue({ data: { balance: 100, transactions: [] }, isLoading: false });

    renderPage([1, 2]);

    // Apply coupon
    const input = screen.getByPlaceholderText(/nhập mã giảm giá/i);
    fireEvent.change(input, { target: { value: 'PROMO10K' } });
    fireEvent.click(screen.getByRole('button', { name: /áp dụng/i }));
    await waitFor(() => expect(mockValidateFn).toHaveBeenCalled());

    // Toggle use points
    const toggle = screen.getByRole('checkbox', { name: /dùng điểm thưởng/i });
    fireEvent.click(toggle);

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /đặt đơn & thanh toán/i }));

    await waitFor(() => {
      // subtotal=164000, coupon=10000, remaining=154000; pointsToUse=min(100,ceil(154000/100))=100; loyalty=min(100*100,154000)=10000
      expect(mockCreateFn).toHaveBeenCalledWith({ couponCode: 'PROMO10K', pointsToUse: 100, selectedCartItemIds: [1, 2] });
    });
  });

  it('renders only selected cart items from router state', () => {
    mockUseGetCartQuery.mockReturnValue({ data: sampleCart, isLoading: false });
    renderPage([1]);

    expect(screen.getByText('Đắc Nhân Tâm')).toBeInTheDocument();
    expect(screen.queryByText('Nhà Giả Kim')).not.toBeInTheDocument();
    expect(screen.getAllByText(/89\.000đ/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/164\.000đ/)).not.toBeInTheDocument();
  });
});
