// Tests cho WishlistPage — Screen 16, Danh sách yêu thích
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import WishlistPage from '../pages/WishlistPage';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';

/* ── Mock wishlistApi ── */
vi.mock('../wishlistApi', () => ({
  useGetWishlistQuery: vi.fn(),
  useRemoveFromWishlistMutation: vi.fn(),
  useClearWishlistMutation: vi.fn(),
}));

/* ── Mock cartApi ── */
vi.mock('../../cart/cartApi', () => ({
  useAddToCartMutation: vi.fn(),
}));

/* ── Mock authApi (useGetMeQuery dùng trong AccountShell) ── */
vi.mock('../../auth/authApi', () => ({
  useGetMeQuery: vi.fn(() => ({
    data: { fullName: 'Nguyễn Văn A', email: 'user@test.com' },
  })),
  useLogoutMutation: vi.fn(() => [vi.fn(), {}]),
}));

import {
  useGetWishlistQuery,
  useRemoveFromWishlistMutation,
  useClearWishlistMutation,
} from '../wishlistApi';
import { useAddToCartMutation } from '../../cart/cartApi';

const mockUseGetWishlistQuery = useGetWishlistQuery as ReturnType<typeof vi.fn>;
const mockUseRemoveFromWishlistMutation = useRemoveFromWishlistMutation as ReturnType<typeof vi.fn>;
const mockUseClearWishlistMutation = useClearWishlistMutation as ReturnType<typeof vi.fn>;
const mockUseAddToCartMutation = useAddToCartMutation as ReturnType<typeof vi.fn>;

/* ── Dữ liệu mẫu (nested DTO) ── */
const mockItems = [
  {
    wishlistId: 101,
    addedAt: '2024-03-01T10:00:00Z',
    book: {
      id: 1,
      slug: 'dac-nhan-tam',
      title: 'Đắc Nhân Tâm',
      coverImageUrl: null,
      price: 89000,
      ratingAvg: 4.8,
    },
  },
  {
    wishlistId: 102,
    addedAt: '2024-03-02T10:00:00Z',
    book: {
      id: 2,
      slug: 'atomic-habits',
      title: 'Atomic Habits',
      coverImageUrl: null,
      price: 120000,
      ratingAvg: 4.9,
    },
  },
];

const defaultPagination = { page: 1, limit: 12, total: 2, totalPages: 1 };

const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

const renderPage = () =>
  render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <WishlistPage />
      </MemoryRouter>
    </Provider>,
  );

let triggerRemove: ReturnType<typeof vi.fn>;
let triggerClear: ReturnType<typeof vi.fn>;
let triggerAddToCart: ReturnType<typeof vi.fn>;

describe('WishlistPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    triggerRemove = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue(undefined) });
    triggerClear = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue(undefined) });
    triggerAddToCart = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
    mockUseRemoveFromWishlistMutation.mockReturnValue([triggerRemove, { isLoading: false }]);
    mockUseClearWishlistMutation.mockReturnValue([triggerClear, { isLoading: false }]);
    mockUseAddToCartMutation.mockReturnValue([triggerAddToCart, { isLoading: false }]);
  });

  it('hiển thị danh sách card đọc item.book.title (DTO nested)', () => {
    mockUseGetWishlistQuery.mockReturnValue({
      data: { items: mockItems, pagination: defaultPagination },
      isLoading: false,
    });
    renderPage();

    // Phải đọc item.book.title (nested), KHÔNG phải item.title
    expect(screen.getAllByText('Đắc Nhân Tâm').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Atomic Habits').length).toBeGreaterThanOrEqual(1);
    // Hiển thị số lượng
    expect(screen.getByText(/2 cuốn/)).toBeInTheDocument();
  });

  it('click nút xóa gọi removeFromWishlist với đúng bookId (sau delay)', async () => {
    mockUseGetWishlistQuery.mockReturnValue({
      data: { items: mockItems, pagination: defaultPagination },
      isLoading: false,
    });
    // Use real timers — trigger the delayed remove
    const unwrapMock = vi.fn().mockResolvedValue(undefined);
    triggerRemove.mockReturnValue({ unwrap: unwrapMock });
    mockUseRemoveFromWishlistMutation.mockReturnValue([triggerRemove, { isLoading: false }]);

    renderPage();

    // Click nút X trên card đầu tiên
    const removeBtns = screen.getAllByRole('button', { name: /Xóa khỏi wishlist/i });
    act(() => {
      fireEvent.click(removeBtns[0]);
    });

    // Card phải ẩn tức thì (optimistic)
    expect(screen.queryAllByText('Đắc Nhân Tâm').length).toBe(0);
    // removeFromWishlist chưa được gọi ngay
    expect(triggerRemove).not.toHaveBeenCalled();

    // Chờ commit sau 3s (dùng real timer + timeout test)
    await waitFor(
      () => expect(triggerRemove).toHaveBeenCalledWith(mockItems[0].book.id),
      { timeout: 4000 },
    );
  }, 6000);

  it('hiển thị empty state khi không có item — có CTA đến /books', () => {
    mockUseGetWishlistQuery.mockReturnValue({
      data: { items: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } },
      isLoading: false,
    });
    renderPage();

    expect(screen.getByText(/Chưa có sách yêu thích/i)).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /Khám phá sách/i });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute('href', '/books');
  });

  it('hiển thị skeleton khi isLoading=true', () => {
    mockUseGetWishlistQuery.mockReturnValue({ data: undefined, isLoading: true });
    renderPage();
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
    expect(screen.queryByText('Đắc Nhân Tâm')).not.toBeInTheDocument();
  });

  it('hiển thị nút "Xóa tất cả" khi có items', () => {
    mockUseGetWishlistQuery.mockReturnValue({
      data: { items: mockItems, pagination: defaultPagination },
      isLoading: false,
    });
    renderPage();
    expect(screen.getByRole('button', { name: /Xóa tất cả/i })).toBeInTheDocument();
  });

  it('không hiển thị nút "Xóa tất cả" khi wishlist rỗng', () => {
    mockUseGetWishlistQuery.mockReturnValue({
      data: { items: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } },
      isLoading: false,
    });
    renderPage();
    expect(screen.queryByRole('button', { name: /Xóa tất cả/i })).not.toBeInTheDocument();
  });
});
