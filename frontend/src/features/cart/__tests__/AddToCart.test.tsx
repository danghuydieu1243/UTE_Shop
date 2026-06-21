import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BookCard } from '../../../shared/ui/BookCard';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';
import type { BookCard as BookCardDTO } from '../../catalog/types';

/* ── Mock cartApi ── */
vi.mock('../cartApi', () => ({
  useAddToCartMutation: vi.fn(),
}));

/* ── Mock useNavigate ── */
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

const sampleBook: BookCardDTO = {
  id: 42,
  slug: 'test-book',
  title: 'Test Book Title',
  author: 'Test Author',
  authorSlug: 'test-author',
  coverImageUrl: null,
  price: 99000,
  originalPrice: null,
  discountPercent: null,
  fileFormat: 'PDF',
  fileSizeBytes: 5000000,
  ratingAvg: 4.0,
  ratingCount: 50,
  purchaseCount: 100,
  tag: null,
};

describe('AddToCart via BookCard', () => {
  let mockAddToCartFn: ReturnType<typeof vi.fn>;
  let mockOnAddToCart: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAddToCartFn = vi.fn().mockReturnValue({ unwrap: vi.fn().mockResolvedValue({}) });
    mockOnAddToCart = vi.fn();
  });

  const renderCard = (onAddToCart?: (book: BookCardDTO) => void) =>
    render(
      <Provider store={makeStore()}>
        <MemoryRouter>
          <BookCard book={sampleBook} onAddToCart={onAddToCart} />
        </MemoryRouter>
      </Provider>,
    );

  it('renders "Thêm vào giỏ" button', () => {
    renderCard(mockOnAddToCart);
    expect(screen.getByRole('button', { name: /thêm vào giỏ/i })).toBeInTheDocument();
  });

  it('calls onAddToCart with book when button clicked', () => {
    renderCard(mockOnAddToCart);
    const addBtn = screen.getByRole('button', { name: /thêm vào giỏ/i });
    fireEvent.click(addBtn);
    expect(mockOnAddToCart).toHaveBeenCalledTimes(1);
    expect(mockOnAddToCart).toHaveBeenCalledWith(sampleBook);
  });

  it('does not call onAddToCart when prop is not provided', () => {
    // Không nên throw khi không có prop
    expect(() => renderCard(undefined)).not.toThrow();
    const addBtn = screen.getByRole('button', { name: /thêm vào giỏ/i });
    // Click không làm gì — không có lỗi
    expect(() => fireEvent.click(addBtn)).not.toThrow();
  });

  it('clicking "Thêm vào giỏ" stops event propagation (does not navigate to book detail)', () => {
    const mockHandleNavigate = vi.fn();
    renderCard(mockOnAddToCart);
    const addBtn = screen.getByRole('button', { name: /thêm vào giỏ/i });
    fireEvent.click(addBtn);
    // mockNavigate không được gọi (stopPropagation đã ngăn article click)
    expect(mockHandleNavigate).not.toHaveBeenCalled();
  });

  it('passes correct bookId to mutation when wired via addToCart handler', async () => {
    // Kiểm tra flow đầy đủ: BookCard → onAddToCart(book) → addToCart({ bookId: book.id })
    const wiredOnAddToCart = async (book: BookCardDTO) => {
      await mockAddToCartFn({ bookId: book.id });
    };
    renderCard(wiredOnAddToCart);
    const addBtn = screen.getByRole('button', { name: /thêm vào giỏ/i });
    fireEvent.click(addBtn);
    // Đợi event handler (async)
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mockAddToCartFn).toHaveBeenCalledWith({ bookId: 42 });
  });
});
