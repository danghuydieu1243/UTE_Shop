import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ReviewSection } from '../components/ReviewSection';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';

/* ── Mock reviewsApi ── */
vi.mock('../reviewsApi', () => ({
  useGetBookReviewsQuery: vi.fn(),
  useGetMyReviewQuery: vi.fn(),
  useCreateReviewMutation: vi.fn(),
  useUpdateReviewMutation: vi.fn(),
}));
import {
  useGetBookReviewsQuery,
  useGetMyReviewQuery,
  useCreateReviewMutation,
  useUpdateReviewMutation,
} from '../reviewsApi';
const mockUseGetBookReviewsQuery = useGetBookReviewsQuery as ReturnType<typeof vi.fn>;
const mockUseGetMyReviewQuery = useGetMyReviewQuery as ReturnType<typeof vi.fn>;
const mockUseCreateReviewMutation = useCreateReviewMutation as ReturnType<typeof vi.fn>;
const mockUseUpdateReviewMutation = useUpdateReviewMutation as ReturnType<typeof vi.fn>;

/* ── Mock libraryApi ── */
vi.mock('../../library/libraryApi', () => ({
  useGetMyEbooksQuery: vi.fn(),
}));
import { useGetMyEbooksQuery } from '../../library/libraryApi';
const mockUseGetMyEbooksQuery = useGetMyEbooksQuery as ReturnType<typeof vi.fn>;

/* ── Sample data ── */
const sampleReviews = [
  {
    id: 1,
    rating: 5,
    comment: 'Sách rất hay, nội dung phong phú',
    userName: 'Nguyễn Văn A',
    createdAt: '2024-03-15T10:00:00.000Z',
    vendorReply: null,
    vendorRepliedAt: null,
  },
  {
    id: 2,
    rating: 4,
    comment: 'Tốt nhưng hơi dài',
    userName: 'Trần Thị B',
    createdAt: '2024-03-16T11:00:00.000Z',
    vendorReply: 'Cảm ơn bạn đã đánh giá!',
    vendorRepliedAt: '2024-03-17T09:00:00.000Z',
  },
  {
    id: 3,
    rating: 3,
    comment: 'Bình thường',
    userName: 'Lê Văn C',
    createdAt: '2024-03-18T12:00:00.000Z',
    vendorReply: null,
    vendorRepliedAt: null,
  },
];

const defaultPagination = {
  page: 1,
  limit: 10,
  total: 3,
  totalPages: 1,
};

/* ── Store factory ── */
const makeStore = (user?: unknown) =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
    preloadedState: user
      ? { auth: { accessToken: null, refreshToken: null, user: user as never } }
      : undefined,
  });

const defaultProps = {
  bookId: 29,
  bookSlug: 'tuoi-tre-dang-gia-bao-nhieu',
  ratingAvg: 4.3,
  ratingCount: 3,
};

const renderSection = (props = defaultProps, storeUser?: unknown) => {
  const store = makeStore(storeUser);
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <ReviewSection {...props} />
      </MemoryRouter>
    </Provider>,
  );
};

/* ── Default mock setup ── */
const setupDefaultMocks = () => {
  mockUseGetBookReviewsQuery.mockReturnValue({
    data: { reviews: sampleReviews, pagination: defaultPagination },
    isLoading: false,
    isError: false,
  });
  mockUseGetMyReviewQuery.mockReturnValue({ data: null, isLoading: false });
  mockUseCreateReviewMutation.mockReturnValue([
    vi.fn(() => ({ unwrap: () => Promise.resolve({}) })),
    { isLoading: false },
  ]);
  mockUseUpdateReviewMutation.mockReturnValue([
    vi.fn(() => ({ unwrap: () => Promise.resolve({}) })),
    { isLoading: false },
  ]);
  mockUseGetMyEbooksQuery.mockReturnValue({
    data: { ebooks: [], pagination: { page: 1, limit: 200, total: 0, totalPages: 0 } },
    isLoading: false,
  });
};

describe('ReviewSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /* ── Test 1: renders list of reviews ── */
  describe('renders review list', () => {
    it('renders comment and userName of each review (from transformResponse data.reviews)', () => {
      setupDefaultMocks();
      // Verify that component reads resp directly as array — simulate correct shape
      mockUseGetBookReviewsQuery.mockReturnValue({
        data: { reviews: sampleReviews, pagination: defaultPagination },
        isLoading: false,
        isError: false,
      });
      renderSection();

      // Should render first review's comment
      expect(screen.getByText('Sách rất hay, nội dung phong phú')).toBeInTheDocument();
      // Should render user name
      expect(screen.getByText('Nguyễn Văn A')).toBeInTheDocument();
      // Should render second review
      expect(screen.getByText('Tốt nhưng hơi dài')).toBeInTheDocument();
      expect(screen.getByText('Trần Thị B')).toBeInTheDocument();
    });

    it('renders star rating for reviews', () => {
      setupDefaultMocks();
      renderSection();
      // 5-star review should show 5 filled stars
      const starElements = screen.getAllByLabelText(/sao/i);
      expect(starElements.length).toBeGreaterThan(0);
    });
  });

  /* ── Test 2: no form for guest ── */
  describe('write-review form visibility — guest', () => {
    it('does NOT show write-review form when no user in store', () => {
      setupDefaultMocks();
      mockUseGetMyEbooksQuery.mockReturnValue({ data: undefined, isLoading: false });
      renderSection(defaultProps, undefined); // no user

      expect(screen.queryByRole('button', { name: /gửi đánh giá/i })).not.toBeInTheDocument();
    });
  });

  /* ── Test 3: no form for vendor ── */
  describe('write-review form visibility — vendor', () => {
    it('does NOT show write-review form for vendor user (role !== user)', () => {
      setupDefaultMocks();
      mockUseGetMyEbooksQuery.mockReturnValue({ data: undefined, isLoading: false });
      renderSection(defaultProps, { id: 2, email: 'vendor@test.com', role: 'vendor', fullName: 'Vendor User' });

      expect(screen.queryByRole('button', { name: /gửi đánh giá/i })).not.toBeInTheDocument();
    });
  });

  /* ── Test 4: form shown when user owns the book ── */
  describe('write-review form visibility — user who owns book', () => {
    it('shows write-review form when user (role=user) owns the book', () => {
      setupDefaultMocks();
      // User owns bookId=29
      mockUseGetMyEbooksQuery.mockReturnValue({
        data: {
          ebooks: [
            {
              bookId: 29,
              slug: 'tuoi-tre-dang-gia-bao-nhieu',
              title: 'Tuổi Trẻ Đáng Giá Bao Nhiêu',
              author: 'Rosie Nguyễn',
              coverImageUrl: null,
              fileFormat: 'PDF',
              fileSizeBytes: 13000000,
              grantedAt: '2024-01-01T00:00:00.000Z',
              orderCode: 'ORD-001',
            },
          ],
          pagination: { page: 1, limit: 200, total: 1, totalPages: 1 },
        },
        isLoading: false,
      });
      renderSection(defaultProps, { id: 1, email: 'user@test.com', role: 'user', fullName: 'Test User' });

      expect(screen.getByRole('button', { name: /gửi đánh giá/i })).toBeInTheDocument();
    });

    it('shows "Mua sách để viết đánh giá" when user does NOT own the book', () => {
      setupDefaultMocks();
      mockUseGetMyEbooksQuery.mockReturnValue({
        data: {
          ebooks: [], // does not own book 29
          pagination: { page: 1, limit: 200, total: 0, totalPages: 0 },
        },
        isLoading: false,
      });
      renderSection(defaultProps, { id: 1, email: 'user@test.com', role: 'user', fullName: 'Test User' });

      expect(screen.getByText(/mua sách để viết đánh giá/i)).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /gửi đánh giá/i })).not.toBeInTheDocument();
    });
  });

  /* ── Test 5: submitting form calls createReview ── */
  describe('form submission', () => {
    it('calls createReview with {bookId, rating, comment} on submit', async () => {
      const mockCreateReview = vi.fn(() => ({
        unwrap: () => Promise.resolve({ id: 99, userId: 1, rating: 5, comment: 'test', userName: 'User', createdAt: '', vendorReply: null, vendorRepliedAt: null }),
      }));
      setupDefaultMocks();
      mockUseCreateReviewMutation.mockReturnValue([mockCreateReview, { isLoading: false }]);
      mockUseGetMyEbooksQuery.mockReturnValue({
        data: {
          ebooks: [
            { bookId: 29, slug: 'test', title: 'Test', author: null, coverImageUrl: null, fileFormat: 'PDF', fileSizeBytes: 0, grantedAt: '', orderCode: 'ORD-001' },
          ],
          pagination: { page: 1, limit: 200, total: 1, totalPages: 1 },
        },
        isLoading: false,
      });

      renderSection(defaultProps, { id: 1, email: 'user@test.com', role: 'user', fullName: 'Test User' });

      // Select a star rating (click 5th star)
      const starButtons = screen.getAllByRole('button', { name: /chọn \d+ sao/i });
      fireEvent.click(starButtons[4]); // 5 stars

      // Enter comment
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Sách rất tốt' } });

      // Submit
      const submitBtn = screen.getByRole('button', { name: /gửi đánh giá/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockCreateReview).toHaveBeenCalledWith({
          bookId: 29,
          rating: 5,
          comment: 'Sách rất tốt',
          idOrSlug: 'tuoi-tre-dang-gia-bao-nhieu',
        });
      });
    });
  });

  /* ── Test 5b: edit mode when user already reviewed ── */
  describe('edit mode — user already reviewed', () => {
    const ownedEbooks = {
      data: {
        ebooks: [
          { bookId: 29, slug: 'test', title: 'Test', author: null, coverImageUrl: null, fileFormat: 'PDF', fileSizeBytes: 0, grantedAt: '', orderCode: 'ORD-001' },
        ],
        pagination: { page: 1, limit: 200, total: 1, totalPages: 1 },
      },
      isLoading: false,
    };

    it('prefills form + shows "Cập nhật đánh giá" button when myReview exists', () => {
      setupDefaultMocks();
      mockUseGetMyEbooksQuery.mockReturnValue(ownedEbooks);
      mockUseGetMyReviewQuery.mockReturnValue({
        data: { id: 7, userId: 1, rating: 3, comment: 'Đánh giá cũ', userName: 'Test User', createdAt: '', vendorReply: null, vendorRepliedAt: null },
        isLoading: false,
      });
      renderSection(defaultProps, { id: 1, email: 'user@test.com', role: 'user', fullName: 'Test User' });

      expect(screen.getByRole('button', { name: /cập nhật đánh giá/i })).toBeInTheDocument();
      expect(screen.getByText(/chỉnh sửa đánh giá của bạn/i)).toBeInTheDocument();
      // Prefilled comment
      expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('Đánh giá cũ');
    });

    it('calls updateReview (not createReview) on submit when already reviewed', async () => {
      const mockUpdate = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));
      const mockCreate = vi.fn(() => ({ unwrap: () => Promise.resolve({}) }));
      setupDefaultMocks();
      mockUseCreateReviewMutation.mockReturnValue([mockCreate, { isLoading: false }]);
      mockUseUpdateReviewMutation.mockReturnValue([mockUpdate, { isLoading: false }]);
      mockUseGetMyEbooksQuery.mockReturnValue(ownedEbooks);
      mockUseGetMyReviewQuery.mockReturnValue({
        data: { id: 7, userId: 1, rating: 3, comment: 'cũ', userName: 'Test User', createdAt: '', vendorReply: null, vendorRepliedAt: null },
        isLoading: false,
      });
      renderSection(defaultProps, { id: 1, email: 'user@test.com', role: 'user', fullName: 'Test User' });

      const submitBtn = screen.getByRole('button', { name: /cập nhật đánh giá/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledWith({
          bookId: 29,
          rating: 3,
          comment: 'cũ',
          idOrSlug: 'tuoi-tre-dang-gia-bao-nhieu',
        });
      });
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  /* ── Test 6: vendorReply renders when present ── */
  describe('vendor reply', () => {
    it('renders vendor reply block with label when vendorReply is present', () => {
      setupDefaultMocks();
      renderSection();

      expect(screen.getByText(/phản hồi từ người bán/i)).toBeInTheDocument();
      expect(screen.getByText('Cảm ơn bạn đã đánh giá!')).toBeInTheDocument();
    });

    it('does NOT render vendor reply block when vendorReply is null', () => {
      setupDefaultMocks();
      // Only show the first review which has no reply
      mockUseGetBookReviewsQuery.mockReturnValue({
        data: {
          reviews: [sampleReviews[0]], // no vendorReply
          pagination: { page: 1, limit: 10, total: 1, totalPages: 1 },
        },
        isLoading: false,
        isError: false,
      });
      renderSection();

      expect(screen.queryByText(/phản hồi từ người bán/i)).not.toBeInTheDocument();
    });
  });

  /* ── Test 7: filter chip 5★ ── */
  describe('filter chips', () => {
    it('clicking 5★ filter chip shows only 5-star reviews', () => {
      setupDefaultMocks();
      renderSection();

      // All reviews visible initially
      expect(screen.getByText('Sách rất hay, nội dung phong phú')).toBeInTheDocument();
      expect(screen.getByText('Tốt nhưng hơi dài')).toBeInTheDocument();
      expect(screen.getByText('Bình thường')).toBeInTheDocument();

      // Click 5★ filter
      const fiveStarChip = screen.getByRole('button', { name: /^5★$/i });
      fireEvent.click(fiveStarChip);

      // Only 5-star review should be visible
      expect(screen.getByText('Sách rất hay, nội dung phong phú')).toBeInTheDocument();
      expect(screen.queryByText('Tốt nhưng hơi dài')).not.toBeInTheDocument();
      expect(screen.queryByText('Bình thường')).not.toBeInTheDocument();
    });
  });

  /* ── Test 8: "Tải thêm" button hidden when single page ── */
  describe('"Tải thêm đánh giá" button visibility', () => {
    it('hides "Tải thêm đánh giá" button when totalPages === 1', () => {
      setupDefaultMocks();
      mockUseGetBookReviewsQuery.mockReturnValue({
        data: {
          reviews: sampleReviews,
          pagination: { page: 1, limit: 10, total: 3, totalPages: 1 }, // single page
        },
        isLoading: false,
        isError: false,
      });
      renderSection();

      expect(screen.queryByRole('button', { name: /tải thêm đánh giá/i })).not.toBeInTheDocument();
    });

    it('shows "Tải thêm đánh giá" button when more pages exist', () => {
      setupDefaultMocks();
      mockUseGetBookReviewsQuery.mockReturnValue({
        data: {
          reviews: sampleReviews,
          pagination: { page: 1, limit: 10, total: 25, totalPages: 3 }, // multiple pages
        },
        isLoading: false,
        isError: false,
      });
      renderSection();

      expect(screen.getByRole('button', { name: /tải thêm đánh giá/i })).toBeInTheDocument();
    });
  });
});
