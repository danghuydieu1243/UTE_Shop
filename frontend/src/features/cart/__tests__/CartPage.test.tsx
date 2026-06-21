import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CartPage } from '../pages/CartPage';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';

/* ── Mock cartApi ── */
vi.mock('../cartApi', () => ({
  useGetCartQuery: vi.fn(),
  useRemoveFromCartMutation: vi.fn(),
  useClearCartMutation: vi.fn(),
}));

import {
  useGetCartQuery,
  useRemoveFromCartMutation,
  useClearCartMutation,
} from '../cartApi';

const mockUseGetCartQuery = useGetCartQuery as ReturnType<typeof vi.fn>;
const mockUseRemoveFromCartMutation = useRemoveFromCartMutation as ReturnType<typeof vi.fn>;
const mockUseClearCartMutation = useClearCartMutation as ReturnType<typeof vi.fn>;

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
        <CartPage />
      </MemoryRouter>
    </Provider>,
  );

describe('CartPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mặc định mutation trả về unwrap thành công
    mockUseRemoveFromCartMutation.mockReturnValue([vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) }), {}]);
    mockUseClearCartMutation.mockReturnValue([vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) }), {}]);
  });

  it('renders cart items when data loaded', () => {
    mockUseGetCartQuery.mockReturnValue({ data: sampleCart, isLoading: false });
    renderPage();
    // Kiểm tra 2 title sách hiện trong DOM
    expect(screen.getByText('Đắc Nhân Tâm')).toBeInTheDocument();
    expect(screen.getByText('Nhà Giả Kim')).toBeInTheDocument();
  });

  it('shows empty state when cart is empty', () => {
    mockUseGetCartQuery.mockReturnValue({
      data: { items: [], subtotal: 0, itemCount: 0, currency: 'VND' },
      isLoading: false,
    });
    renderPage();
    expect(screen.getByText('Giỏ hàng trống')).toBeInTheDocument();
    // Link "Tiếp tục mua sắm" trong empty state
    expect(screen.getByRole('link', { name: /tiếp tục mua sắm/i })).toBeInTheDocument();
  });

  it('calls removeFromCart mutation when delete button clicked', async () => {
    const mockRemoveFn = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
    mockUseRemoveFromCartMutation.mockReturnValue([mockRemoveFn, {}]);
    mockUseGetCartQuery.mockReturnValue({ data: sampleCart, isLoading: false });
    renderPage();

    // Tìm nút Xóa đầu tiên (của item 1, bookId=101)
    const deleteButtons = screen.getAllByRole('button', { name: /xóa đắc nhân tâm/i });
    fireEvent.click(deleteButtons[0]);

    // Kiểm tra mutation được gọi với bookId đúng
    expect(mockRemoveFn).toHaveBeenCalledWith({ bookId: 101 });
  });

  it('shows loading state', () => {
    mockUseGetCartQuery.mockReturnValue({ data: undefined, isLoading: true });
    renderPage();
    // Khi đang loading: skeleton animate-pulse hiện, danh sách item KHÔNG có
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
    expect(screen.queryByTestId('cart-item')).toBeNull();
  });

  it('shows total price formatted', () => {
    mockUseGetCartQuery.mockReturnValue({ data: sampleCart, isLoading: false });
    renderPage();
    // subtotal = 164000 → "164.000đ"
    const totalElements = screen.getAllByText(/164\.000đ/);
    expect(totalElements.length).toBeGreaterThan(0);
  });

  it('shows item count in toolbar', () => {
    mockUseGetCartQuery.mockReturnValue({ data: sampleCart, isLoading: false });
    renderPage();
    expect(screen.getByText('(2 sản phẩm)')).toBeInTheDocument();
  });

  it('shows file format badge for each item', () => {
    mockUseGetCartQuery.mockReturnValue({ data: sampleCart, isLoading: false });
    renderPage();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('EPUB')).toBeInTheDocument();
  });

  it('shows order summary title', () => {
    mockUseGetCartQuery.mockReturnValue({ data: sampleCart, isLoading: false });
    renderPage();
    expect(screen.getByText(/tóm tắt đơn hàng/i)).toBeInTheDocument();
  });

  it('shows trust badge SSL', () => {
    mockUseGetCartQuery.mockReturnValue({ data: sampleCart, isLoading: false });
    renderPage();
    expect(screen.getByText(/thanh toán bảo mật ssl 256-bit/i)).toBeInTheDocument();
  });

  it('shows checkout button navigates to /checkout when clicked', () => {
    mockUseGetCartQuery.mockReturnValue({ data: sampleCart, isLoading: false });
    renderPage();
    const checkoutBtn = screen.getByRole('button', { name: /tiến hành thanh toán/i });
    fireEvent.click(checkoutBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/checkout');
  });
});
