import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CatalogPage } from '../pages/CatalogPage';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';
import type { BookCard } from '../types';

/* ── Mocks ── */
vi.mock('../catalogApi', () => ({
  useGetBooksQuery: vi.fn(),
  useGetCategoriesQuery: vi.fn(),
  useGetFiltersQuery: vi.fn(),
}));

import {
  useGetBooksQuery,
  useGetCategoriesQuery,
  useGetFiltersQuery,
} from '../catalogApi';

const mockUseGetBooksQuery = useGetBooksQuery as ReturnType<typeof vi.fn>;
const mockUseGetCategoriesQuery = useGetCategoriesQuery as ReturnType<typeof vi.fn>;
const mockUseGetFiltersQuery = useGetFiltersQuery as ReturnType<typeof vi.fn>;

/* Mock navigate */
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

/* ── Sample data ── */
const makeBook = (id: number, title: string, author = 'Test Author'): BookCard => ({
  id,
  slug: `book-${id}`,
  title,
  author,
  authorSlug: 'test-author',
  coverImageUrl: null,
  price: 89000,
  originalPrice: null,
  discountPercent: null,
  fileFormat: 'PDF',
  fileSizeBytes: 5000000,
  ratingAvg: 4.5,
  ratingCount: 100,
  purchaseCount: 200,
  tag: null,
});

const sampleBooks = [
  makeBook(1, 'Đắc Nhân Tâm', 'Dale Carnegie'),
  makeBook(2, 'Nhà Giả Kim', 'Paulo Coelho'),
  makeBook(3, 'Atomic Habits', 'James Clear'),
  makeBook(4, 'Tư Duy Nhanh Và Chậm', 'Daniel Kahneman'),
];

const samplePagination = {
  page: 1,
  limit: 20,
  total: 4,
  totalPages: 1,
};

const sampleCategories = [
  { id: 1, slug: 'van-hoc', name: 'Văn học', parentId: null, sortOrder: 1, bookCount: 100 },
  { id: 2, slug: 'kinh-te', name: 'Kinh tế', parentId: null, sortOrder: 2, bookCount: 80 },
];

const sampleFilters = {
  authors: [
    { slug: 'dale-carnegie', name: 'Dale Carnegie', count: 3 },
    { slug: 'paulo-coelho', name: 'Paulo Coelho', count: 2 },
  ],
  publishers: [
    { slug: 'nxb-tre', name: 'NXB Trẻ', count: 10 },
  ],
  priceRange: { min: 0, max: 500000 },
  formats: [
    { value: 'PDF' as const, count: 50 },
    { value: 'EPUB' as const, count: 30 },
  ],
};

/* ── Store factory ── */
const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

/* ── Render helpers ── */
const renderPage = (initialEntries = ['/books']) =>
  render(
    <Provider store={makeStore()}>
      <MemoryRouter initialEntries={initialEntries}>
        <CatalogPage />
      </MemoryRouter>
    </Provider>,
  );

/* ── Default mock setup ── */
beforeEach(() => {
  mockUseGetBooksQuery.mockReturnValue({
    data: { books: sampleBooks, pagination: samplePagination },
    isFetching: false,
  });
  mockUseGetCategoriesQuery.mockReturnValue({ data: sampleCategories });
  mockUseGetFiltersQuery.mockReturnValue({ data: sampleFilters });
});

/* ─────────────────────────────────────────── */
/*  Tests                                      */
/* ─────────────────────────────────────────── */
describe('CatalogPage', () => {
  it('renders BookCards for all books in the result', () => {
    renderPage();
    expect(screen.getAllByText('Đắc Nhân Tâm').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Nhà Giả Kim').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Atomic Habits').length).toBeGreaterThan(0);
  });

  it('shows total result count in sort bar', () => {
    renderPage();
    // "Hiển thị 4 kết quả" — may appear multiple (desktop + mobile sidebar)
    expect(screen.getAllByText(/hiển thị/i).length).toBeGreaterThan(0);
    // The total count "4" should appear somewhere
    expect(screen.getAllByText('4').length).toBeGreaterThan(0);
  });

  it('renders sidebar filter heading "Bộ lọc"', () => {
    renderPage();
    // Could be multiple (desktop + mobile), just check at least one
    expect(screen.getAllByText(/bộ lọc/i).length).toBeGreaterThan(0);
  });

  it('renders format filter accordions', () => {
    renderPage();
    expect(screen.getByText('PDF')).toBeInTheDocument();
    expect(screen.getByText('EPUB')).toBeInTheDocument();
  });

  it('renders category checkboxes from API', () => {
    renderPage();
    expect(screen.getAllByText('Văn học').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Kinh tế').length).toBeGreaterThan(0);
  });

  it('ticking a format checkbox does NOT immediately refetch (staged state)', () => {
    renderPage();
    // Find and click the PDF checkbox
    const pdfCheckbox = screen.getByRole('checkbox', { name: /pdf/i });
    fireEvent.click(pdfCheckbox);
    // Should not have triggered a new render with new params
    // The checkbox should now be checked (staged change)
    expect(pdfCheckbox).toBeChecked();
    // getBooks should NOT have been called with format filter before Apply
    const callsAfter = mockUseGetBooksQuery.mock.calls;
    // All calls should still NOT include format=PDF (only staged, not committed)
    const hasFormatCall = callsAfter.some(
      (call) => call[0]?.format?.includes('PDF'),
    );
    expect(hasFormatCall).toBe(false);
  });

  it('clicking "Áp dụng bộ lọc" commits staged filters', async () => {
    renderPage();
    // Stage a format filter
    const pdfCheckbox = screen.getByRole('checkbox', { name: /pdf/i });
    fireEvent.click(pdfCheckbox);
    expect(pdfCheckbox).toBeChecked();

    // Apply
    const applyBtn = screen.getByRole('button', { name: /áp dụng bộ lọc/i });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      // After apply, useGetBooksQuery should be called with format containing PDF
      const calls = mockUseGetBooksQuery.mock.calls;
      const hasFormatCall = calls.some(
        (call) => Array.isArray(call[0]?.format) && call[0].format.includes('PDF'),
      );
      expect(hasFormatCall).toBe(true);
    });
  });

  it('shows empty state when no books returned', () => {
    mockUseGetBooksQuery.mockReturnValue({
      data: { books: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } },
      isFetching: false,
    });
    renderPage();
    expect(screen.getByText(/không tìm thấy kết quả/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /xóa bộ lọc/i })).toBeInTheDocument();
  });

  it('renders search breadcrumb when ?q= is set', () => {
    renderPage(['/books?q=atomic']);
    expect(screen.getAllByText(/tìm kiếm/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/atomic/i).length).toBeGreaterThan(0);
  });

  it('shows search query in result count bar when ?q= is set', () => {
    mockUseGetBooksQuery.mockReturnValue({
      data: { books: [makeBook(1, 'Atomic Habits')], pagination: { ...samplePagination, total: 1 } },
      isFetching: false,
    });
    renderPage(['/books?q=Atomic']);
    // Sort bar should mention the query
    expect(screen.getAllByText(/Atomic/).length).toBeGreaterThan(0);
  });

  it('removing a chip calls setSearchParams and triggers refetch immediately', async () => {
    // Start with a committed filter via URL
    mockUseGetBooksQuery.mockReturnValue({
      data: { books: sampleBooks, pagination: samplePagination },
      isFetching: false,
    });
    renderPage(['/books?format=PDF']);

    // Wait for chip to appear
    await waitFor(() => {
      const chips = screen.getAllByText('PDF');
      // One is the chip label, one is the checkbox label — find the chip container
      expect(chips.length).toBeGreaterThan(0);
    });

    // Find the × button in the chip (aria-label includes "PDF")
    const removeBtn = screen.getByRole('button', { name: /xóa bộ lọc pdf/i });
    fireEvent.click(removeBtn);

    // After chip removal, format should be gone from calls
    await waitFor(() => {
      const calls = mockUseGetBooksQuery.mock.calls;
      // Latest call should not have format=PDF
      const latestCall = calls[calls.length - 1];
      expect(
        latestCall[0]?.format === undefined || latestCall[0]?.format?.length === 0,
      ).toBe(true);
    });
  });

  it('renders "Bộ lọc" button for mobile toggling', () => {
    renderPage();
    // At least one button with "Bộ lọc" label (mobile toggle)
    const buttons = screen.getAllByRole('button', { name: /bộ lọc/i });
    expect(buttons.length).toBeGreaterThan(0);
  });
});
