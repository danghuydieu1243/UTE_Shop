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

import { useCreateOrderMutation } from '../ordersApi';
import { useGetCartQuery } from '../../cart/cartApi';

const mockUseCreateOrderMutation = useCreateOrderMutation as ReturnType<typeof vi.fn>;
const mockUseGetCartQuery = useGetCartQuery as ReturnType<typeof vi.fn>;

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

const renderPage = () =>
  render(
    <Provider store={makeStore()}>
      <MemoryRouter>
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
    renderPage();

    // Bấm nút đặt đơn
    const submitBtn = screen.getByRole('button', { name: /đặt đơn & thanh toán/i });
    fireEvent.click(submitBtn);

    // Kiểm tra createOrder được gọi
    expect(mockCreateFn).toHaveBeenCalled();
    // Kiểm tra navigate đến trang QR của đơn hàng
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/checkout/ATHENA123'));
  });

  it('shows empty state when cart is empty', () => {
    mockUseGetCartQuery.mockReturnValue({
      data: { items: [], subtotal: 0, itemCount: 0, currency: 'VND' },
      isLoading: false,
    });
    renderPage();
    // Kiểm tra empty state
    expect(screen.getByText('Giỏ hàng trống')).toBeInTheDocument();
    // Link quay lại giỏ hàng
    expect(screen.getByRole('link', { name: /quay lại giỏ hàng/i })).toBeInTheDocument();
  });
});
