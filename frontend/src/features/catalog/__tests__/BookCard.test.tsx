import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BookCard } from '../../../shared/ui/BookCard';
import type { BookCard as BookCardDTO } from '../types';

// Mock useNavigate so navigation can be asserted without a real router history
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

// Mock wishlistApi — BookCard ใช้ hooks này ตั้งแต่ Phase 4; mock để test không phึงใช้ Provider
vi.mock('../../../features/wishlist/wishlistApi', () => ({
  useGetWishlistQuery: vi.fn(() => ({ data: undefined, isLoading: false })),
  useAddToWishlistMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
  useRemoveFromWishlistMutation: vi.fn(() => [vi.fn(), { isLoading: false }]),
}));

// Mock useAppSelector — trả về null (guest) để heart render; không cần Provider
vi.mock('../../../app/hooks', () => ({
  useAppSelector: vi.fn(() => null),
  useAppDispatch: vi.fn(() => vi.fn()),
}));

const baseBook: BookCardDTO = {
  id: 1,
  slug: 'dac-nhan-tam',
  title: 'Đắc Nhân Tâm',
  author: 'Dale Carnegie',
  authorSlug: 'dale-carnegie',
  coverImageUrl: null,
  price: 89000,
  originalPrice: 120000,
  discountPercent: 26,
  fileFormat: 'PDF',
  fileSizeBytes: 13002342,
  ratingAvg: 4.8,
  ratingCount: 1248,
  purchaseCount: 2341,
  tag: 'Mới',
};

const renderCard = (props?: Partial<BookCardDTO>, rank?: number) =>
  render(
    <MemoryRouter>
      <BookCard book={{ ...baseBook, ...props }} rank={rank} />
    </MemoryRouter>,
  );

describe('BookCard', () => {
  beforeEach(() => mockNavigate.mockClear());

  it('renders title', () => {
    renderCard();
    expect(screen.getAllByText('Đắc Nhân Tâm').length).toBeGreaterThan(0);
  });

  it('renders author', () => {
    renderCard();
    expect(screen.getAllByText('Dale Carnegie').length).toBeGreaterThan(0);
  });

  it('renders price formatted as VND', () => {
    renderCard();
    expect(screen.getByText('89.000đ')).toBeInTheDocument();
  });

  it('renders original price when hasDiscount', () => {
    renderCard();
    expect(screen.getByText('120.000đ')).toBeInTheDocument();
  });

  it('renders discount badge when originalPrice > price', () => {
    renderCard();
    expect(screen.getByText('-26%')).toBeInTheDocument();
  });

  it('does NOT render discount badge when originalPrice is null', () => {
    renderCard({ originalPrice: null, discountPercent: null });
    expect(screen.queryByText(/-\d+%/)).not.toBeInTheDocument();
  });

  it('does NOT render discount badge when price equals originalPrice even if discountPercent set', () => {
    // price === originalPrice → hasDiscount false → badge must not appear
    renderCard({ originalPrice: 89000, discountPercent: 10 });
    expect(screen.queryByText(/-\d+%/)).not.toBeInTheDocument();
  });

  it('navigates to /books/:slug on click', () => {
    renderCard();
    const card = screen.getByRole('link', { name: /Đắc Nhân Tâm/i });
    fireEvent.click(card);
    expect(mockNavigate).toHaveBeenCalledWith('/books/dac-nhan-tam');
  });

  it('navigates to /books/:slug on Enter key', () => {
    renderCard();
    const card = screen.getByRole('link', { name: /Đắc Nhân Tâm/i });
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(mockNavigate).toHaveBeenCalledWith('/books/dac-nhan-tam');
  });

  it('renders rating count', () => {
    renderCard();
    expect(screen.getByText(/1\.248/)).toBeInTheDocument();
  });

  it('renders file format and size', () => {
    renderCard();
    expect(screen.getByText(/PDF · \d+(\.\d+)? MB/)).toBeInTheDocument();
  });

  it('renders tag badge when tag is set', () => {
    renderCard();
    expect(screen.getByText('Mới')).toBeInTheDocument();
  });

  it('does NOT render rank badge when rank is undefined', () => {
    renderCard();
    expect(screen.queryByText(/^No\./)).not.toBeInTheDocument();
  });

  it('renders rank badge when rank is provided', () => {
    renderCard({}, 3);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('renders "Thêm vào giỏ" button', () => {
    renderCard();
    expect(screen.getByRole('button', { name: /Thêm vào giỏ/i })).toBeInTheDocument();
  });

  it('cart button does not navigate when clicked', () => {
    renderCard();
    const btn = screen.getByRole('button', { name: /Thêm vào giỏ/i });
    fireEvent.click(btn);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('calls onAddToCart with book when cart button clicked', () => {
    const onAddToCart = vi.fn();
    render(
      <MemoryRouter>
        <BookCard book={baseBook} onAddToCart={onAddToCart} />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Thêm vào giỏ/i }));
    expect(onAddToCart).toHaveBeenCalledWith(baseBook);
  });

  describe('owned', () => {
    it('renders "Đọc ngay" instead of "Thêm vào giỏ" when owned', () => {
      renderCard({}, undefined);
      // sanity: default has "Thêm vào giỏ"
      render(
        <MemoryRouter>
          <BookCard book={baseBook} owned />
        </MemoryRouter>,
      );
      expect(screen.getByRole('button', { name: /Đọc ngay/i })).toBeInTheDocument();
    });

    it('does NOT render "Thêm vào giỏ" when owned', () => {
      render(
        <MemoryRouter>
          <BookCard book={baseBook} owned />
        </MemoryRouter>,
      );
      expect(screen.queryByRole('button', { name: /Thêm vào giỏ/i })).not.toBeInTheDocument();
    });

    it('navigates to /user/ebooks when "Đọc ngay" clicked (does not call onAddToCart)', () => {
      const onAddToCart = vi.fn();
      render(
        <MemoryRouter>
          <BookCard book={baseBook} owned onAddToCart={onAddToCart} />
        </MemoryRouter>,
      );
      fireEvent.click(screen.getByRole('button', { name: /Đọc ngay/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/user/ebooks');
      expect(onAddToCart).not.toHaveBeenCalled();
    });
  });

  describe('Highlight', () => {
    it('highlights a query that appears once in title', () => {
      render(
        <MemoryRouter>
          <BookCard book={{ ...baseBook, title: 'Đắc Nhân Tâm' }} highlightQuery="Nhân" />
        </MemoryRouter>,
      );
      const mark = document.querySelector('mark');
      expect(mark).not.toBeNull();
      expect(mark?.textContent).toMatch(/Nhân/i);
    });

    it('highlights ALL occurrences when query appears twice in a title', () => {
      render(
        <MemoryRouter>
          <BookCard book={{ ...baseBook, title: 'Tâm Tâm' }} highlightQuery="Tâm" />
        </MemoryRouter>,
      );
      const marks = document.querySelectorAll('mark');
      // Both occurrences must be wrapped — stateful /g regex bug would leave one unwrapped
      expect(marks.length).toBe(2);
      marks.forEach((m) => expect(m.textContent).toMatch(/Tâm/i));
    });

    it('does not render marks when query is empty', () => {
      render(
        <MemoryRouter>
          <BookCard book={baseBook} highlightQuery="" />
        </MemoryRouter>,
      );
      expect(document.querySelector('mark')).toBeNull();
    });
  });
});
