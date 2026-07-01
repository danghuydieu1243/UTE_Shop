import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BookDetailPage } from '../pages/BookDetailPage';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';
import type { BookDetail, BookCard as BookCardDTO } from '../types';

/* ── Mock catalogApi ── */
vi.mock('../catalogApi', () => ({
  useGetBookDetailQuery: vi.fn(),
}));
import { useGetBookDetailQuery } from '../catalogApi';
const mockUseGetBookDetailQuery = useGetBookDetailQuery as ReturnType<typeof vi.fn>;

/* ── Mock reviewsApi (ReviewSection dependency) ── */
vi.mock('../../reviews/reviewsApi', () => ({
  useGetBookReviewsQuery: vi.fn(),
  useCreateReviewMutation: vi.fn(),
}));
import { useGetBookReviewsQuery, useCreateReviewMutation } from '../../reviews/reviewsApi';
const mockUseGetBookReviewsQuery = useGetBookReviewsQuery as ReturnType<typeof vi.fn>;
const mockUseCreateReviewMutation = useCreateReviewMutation as ReturnType<typeof vi.fn>;

/* ── Mock libraryApi (ReviewSection ownership gate) ── */
vi.mock('../../library/libraryApi', () => ({
  useGetMyEbooksQuery: vi.fn(),
  useGetWishlistQuery: vi.fn(),
}));
import { useGetMyEbooksQuery } from '../../library/libraryApi';

/* ── Mock useNavigate ── */
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useParams: () => ({ idOrSlug: 'tuoi-tre-dang-gia-bao-nhieu' }),
  };
});

/* ── Sample related book ── */
const makeRelatedBook = (id: number, title: string): BookCardDTO => ({
  id,
  slug: `book-${id}`,
  title,
  author: 'Tác Giả Test',
  authorSlug: 'tac-gia-test',
  coverImageUrl: null,
  price: 79000,
  originalPrice: null,
  discountPercent: null,
  fileFormat: 'PDF',
  fileSizeBytes: 5000000,
  ratingAvg: 4.5,
  ratingCount: 200,
  purchaseCount: 350,
  tag: null,
});

/* ── Full BookDetail fixture ── */
const sampleBook: BookDetail = {
  id: 29,
  slug: 'tuoi-tre-dang-gia-bao-nhieu',
  title: 'Tuổi Trẻ Đáng Giá Bao Nhiêu',
  author: { id: 5, name: 'Rosie Nguyễn', slug: 'rosie-nguyen' },
  publisher: { id: 3, name: 'NXB Hội Nhà Văn' },
  category: { id: 2, name: 'Văn học', slug: 'van-hoc' },
  description:
    '"Tuổi trẻ đáng giá bao nhiêu?" là cuốn sách của Rosie Nguyễn.\nSách gồm ba phần Học, Làm, Đi.\nGiọng văn gần gũi, chân thành.',
  tableOfContents: [
    'Lời mở đầu',
    'Phần I: Học',
    'Phần II: Làm',
    'Phần III: Đi',
    'Lời kết',
  ],
  price: 72000,
  originalPrice: 90000,
  discountPercent: 20,
  publishYear: 2018,
  isbn: '978-604-1-00000',
  fileFormat: 'PDF',
  fileSizeBytes: 13002342,
  coverImageUrl: null,
  images: [],
  ratingAvg: 4.9,
  ratingCount: 987,
  purchaseCount: 2341,
  publishedAt: '2018-01-01T00:00:00.000Z',
  vendor: { shopName: 'NXB Shop', shopSlug: 'nxb-shop' },
  relatedByAuthor: [makeRelatedBook(30, 'Mình Nói Gì Khi Nói Về Hạnh Phúc'), makeRelatedBook(31, 'Ta Ba Lô Trên Đất Á')],
  relatedByCategory: [makeRelatedBook(7, 'Cà Phê Cùng Tony'), makeRelatedBook(1, 'Đắc Nhân Tâm')],
};

/* ── Store factory ── */
const makeStore = (preloadedAuth?: Partial<{ user: unknown }>) =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
    preloadedState: preloadedAuth
      ? { auth: { accessToken: null, refreshToken: null, user: preloadedAuth.user as never } }
      : undefined,
  });

const renderPage = (storeOverride?: ReturnType<typeof makeStore>) =>
  render(
    <Provider store={storeOverride ?? makeStore()}>
      <MemoryRouter>
        <BookDetailPage />
      </MemoryRouter>
    </Provider>,
  );

/* ── Default ReviewSection mock setup ── */
const setupReviewMocks = () => {
  mockUseGetBookReviewsQuery.mockReturnValue({
    data: { reviews: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 1 } },
    isLoading: false,
    isError: false,
  });
  mockUseCreateReviewMutation.mockReturnValue([vi.fn(), { isLoading: false }]);
  (useGetMyEbooksQuery as ReturnType<typeof vi.fn>).mockReturnValue({
    data: { ebooks: [], pagination: { page: 1, limit: 200, total: 0, totalPages: 0 } },
    isLoading: false,
  });
};

describe('BookDetailPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockNavigate.mockClear();
    setupReviewMocks();
  });

  describe('Loading state', () => {
    it('renders skeleton while loading', () => {
      mockUseGetBookDetailQuery.mockReturnValue({ isLoading: true, isError: false, data: undefined });
      renderPage();
      // skeleton has no title text
      expect(screen.queryByText('Tuổi Trẻ Đáng Giá Bao Nhiêu')).not.toBeInTheDocument();
    });
  });

  describe('404 state', () => {
    it('renders friendly not-found message when BOOK_NOT_FOUND', () => {
      mockUseGetBookDetailQuery.mockReturnValue({
        isLoading: false,
        isError: true,
        error: { code: 'BOOK_NOT_FOUND' },
        data: undefined,
      });
      renderPage();
      expect(screen.getByText(/không tìm thấy sách/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /quay về danh sách sách/i })).toBeInTheDocument();
    });

    it('renders not-found for generic errors', () => {
      mockUseGetBookDetailQuery.mockReturnValue({
        isLoading: false,
        isError: true,
        error: { status: 500 },
        data: undefined,
      });
      renderPage();
      expect(screen.getByText(/không tìm thấy sách/i)).toBeInTheDocument();
    });
  });

  describe('Success state', () => {
    beforeEach(() => {
      mockUseGetBookDetailQuery.mockReturnValue({
        isLoading: false,
        isError: false,
        data: sampleBook,
      });
    });

    it('renders book title', () => {
      renderPage();
      expect(screen.getAllByText('Tuổi Trẻ Đáng Giá Bao Nhiêu').length).toBeGreaterThan(0);
    });

    it('renders author name', () => {
      renderPage();
      expect(screen.getAllByText('Rosie Nguyễn').length).toBeGreaterThan(0);
    });

    it('renders formatted price', () => {
      renderPage();
      expect(screen.getByText('72.000đ')).toBeInTheDocument();
    });

    it('renders original price with strikethrough', () => {
      renderPage();
      expect(screen.getByText('90.000đ')).toBeInTheDocument();
    });

    it('renders discount badge', () => {
      renderPage();
      expect(screen.getByText('−20%')).toBeInTheDocument();
    });

    it('renders file format chip', () => {
      renderPage();
      // Multiple PDF occurrences (badge top-left, chip, e-book row) — just check at least one
      expect(screen.getAllByText('PDF').length).toBeGreaterThan(0);
    });

    it('renders rating average', () => {
      renderPage();
      expect(screen.getAllByText('4.9').length).toBeGreaterThan(0);
    });

    it('renders breadcrumb with category link', () => {
      renderPage();
      const catLinks = screen.getAllByRole('link', { name: 'Văn học' });
      expect(catLinks.length).toBeGreaterThan(0);
      expect((catLinks[0] as HTMLAnchorElement).href).toContain('category=van-hoc');
    });

    it('renders file size info in ebook row', () => {
      renderPage();
      expect(screen.getAllByText(/PDF · \d+(\.\d+)? MB/).length).toBeGreaterThan(0);
    });
  });

  describe('Thumbnail gallery', () => {
    beforeEach(() => {
      mockUseGetBookDetailQuery.mockReturnValue({
        isLoading: false,
        isError: false,
        data: {
          ...sampleBook,
          images: [
            { url: 'http://img.test/cover.jpg', alt: 'Bìa', sortOrder: 0 },
            { url: 'http://img.test/back.jpg', alt: 'Sau', sortOrder: 1 },
          ],
        },
      });
    });

    it('renders thumbnail buttons', () => {
      renderPage();
      const thumbBtns = screen.getAllByRole('button', { name: /xem ảnh/i });
      expect(thumbBtns.length).toBe(2);
    });

    it('switches main image on thumbnail click (fade state change)', () => {
      renderPage();
      const [, secondThumb] = screen.getAllByRole('button', { name: /xem ảnh/i });
      fireEvent.click(secondThumb);
      act(() => {
        vi.advanceTimersByTime(200);
      });
      const mainImage = screen.getByTestId('book-detail-main-image') as HTMLImageElement;
      expect(mainImage.src).toContain('back.jpg');
    });
  });

  describe('Tab switching', () => {
    beforeEach(() => {
      mockUseGetBookDetailQuery.mockReturnValue({
        isLoading: false,
        isError: false,
        data: sampleBook,
      });
    });

    it('shows description panel by default', () => {
      renderPage();
      // The description content should be visible (not hidden)
      expect(screen.getByText(/Tuổi trẻ đáng giá bao nhiêu/)).toBeInTheDocument();
    });

    it('switches to Mục lục tab and shows TOC', () => {
      renderPage();
      const tocTab = screen.getByRole('button', { name: /mục lục/i });
      fireEvent.click(tocTab);
      expect(screen.getByText('Lời mở đầu')).toBeInTheDocument();
      expect(screen.getByText('Phần I: Học')).toBeInTheDocument();
    });

    it('switches to Đánh giá tab and shows review section', () => {
      renderPage();
      const reviewTab = screen.getByRole('button', { name: /đánh giá/i });
      fireEvent.click(reviewTab);
      // ReviewSection renders empty state when no reviews
      expect(screen.getByText(/chưa có đánh giá/i)).toBeInTheDocument();
    });

    it('empty TOC shows "Chưa cập nhật mục lục"', () => {
      mockUseGetBookDetailQuery.mockReturnValue({
        isLoading: false,
        isError: false,
        data: { ...sampleBook, tableOfContents: [] },
      });
      renderPage();
      const tocTab = screen.getByRole('button', { name: /mục lục/i });
      fireEvent.click(tocTab);
      expect(screen.getByText(/chưa cập nhật mục lục/i)).toBeInTheDocument();
    });
  });

  describe('Action buttons — guest', () => {
    beforeEach(() => {
      // No auth user = guest
      mockUseGetBookDetailQuery.mockReturnValue({
        isLoading: false,
        isError: false,
        data: sampleBook,
      });
    });

    it('"Mua ngay" navigates guest to /login', () => {
      renderPage(makeStore()); // no user in store
      const buyBtn = screen.getByRole('button', { name: /mua ngay/i });
      fireEvent.click(buyBtn);
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('/login'),
      );
    });

    it('"Thêm vào giỏ" navigates guest to /login', () => {
      renderPage(makeStore());
      // Multiple "Thêm vào giỏ" buttons exist (from related BookCards too) — click the first (main actions block)
      const cartBtns = screen.getAllByRole('button', { name: /thêm vào giỏ/i });
      fireEvent.click(cartBtns[0]);
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('/login'),
      );
    });

    it('"Lưu vào Wishlist" navigates guest to /login', () => {
      renderPage(makeStore());
      // Multiple wishlist buttons (gallery heart + ghost row) — click ghost row
      const wishBtns = screen.getAllByRole('button', { name: /lưu vào wishlist/i });
      fireEvent.click(wishBtns[0]);
      expect(mockNavigate).toHaveBeenCalledWith(
        expect.stringContaining('/login'),
      );
    });
  });

  describe('Action buttons — logged-in user', () => {
    const storeWithUser = () =>
      makeStore({
        user: { id: 1, email: 'test@test.com', role: 'user', fullName: 'Test User' },
      });

    beforeEach(() => {
      mockUseGetBookDetailQuery.mockReturnValue({
        isLoading: false,
        isError: false,
        data: sampleBook,
      });
    });

    it('"Mua ngay" does NOT navigate to /login for logged-in user', () => {
      renderPage(storeWithUser());
      const buyBtn = screen.getByRole('button', { name: /mua ngay/i });
      fireEvent.click(buyBtn);
      expect(mockNavigate).not.toHaveBeenCalledWith(
        expect.stringContaining('/login'),
      );
    });
  });

  describe('Related carousels', () => {
    beforeEach(() => {
      mockUseGetBookDetailQuery.mockReturnValue({
        isLoading: false,
        isError: false,
        data: sampleBook,
      });
    });

    it('renders "Sách của Rosie Nguyễn" carousel', () => {
      renderPage();
      // Section heading is a <span> element with the exact carousel title text
      const spans = document.querySelectorAll('span');
      const headingSpan = Array.from(spans).find(
        (s) => s.textContent?.trim() === 'Sách của Rosie Nguyễn',
      );
      expect(headingSpan).toBeDefined();
    });

    it('renders related-by-author BookCards', () => {
      renderPage();
      expect(
        screen.getAllByText('Mình Nói Gì Khi Nói Về Hạnh Phúc').length,
      ).toBeGreaterThan(0);
    });

    it('renders "Có thể bạn cũng thích" carousel', () => {
      renderPage();
      expect(screen.getByText(/có thể bạn cũng thích/i)).toBeInTheDocument();
    });

    it('renders related-by-category BookCards', () => {
      renderPage();
      expect(screen.getAllByText('Cà Phê Cùng Tony').length).toBeGreaterThan(0);
    });

    it('hides related-by-author section when empty', () => {
      mockUseGetBookDetailQuery.mockReturnValue({
        isLoading: false,
        isError: false,
        data: { ...sampleBook, relatedByAuthor: [] },
      });
      renderPage();
      // Carousel heading is a <span> with exact text "Sách của Rosie Nguyễn" (uppercase tracking)
      // Use queryAllByRole heading or check the section-title span specifically
      const spans = document.querySelectorAll('span');
      const headingSpan = Array.from(spans).find(
        (s) => s.textContent?.trim() === 'Sách của Rosie Nguyễn',
      );
      expect(headingSpan).toBeUndefined();
    });

    it('hides related-by-category section when empty', () => {
      mockUseGetBookDetailQuery.mockReturnValue({
        isLoading: false,
        isError: false,
        data: { ...sampleBook, relatedByCategory: [] },
      });
      renderPage();
      expect(screen.queryByText(/có thể bạn cũng thích/i)).not.toBeInTheDocument();
    });
  });
});
