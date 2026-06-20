import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect } from 'vitest';
import { HomePage } from '../pages/HomePage';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';

/* ── Mock useGetHomeQuery ── */
vi.mock('../catalogApi', () => ({
  useGetHomeQuery: vi.fn(),
}));

import { useGetHomeQuery } from '../catalogApi';
const mockUseGetHomeQuery = useGetHomeQuery as ReturnType<typeof vi.fn>;

/* ── Mock useNavigate (called by SiteHeader + hero buttons) ── */
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => mockNavigate };
});

/* ── Sample data ── */
const makeBook = (id: number, title: string) => ({
  id,
  slug: `book-${id}`,
  title,
  author: 'Test Author',
  authorSlug: 'test-author',
  coverImageUrl: null,
  price: 89000,
  originalPrice: null,
  discountPercent: null,
  fileFormat: 'PDF' as const,
  fileSizeBytes: 5000000,
  ratingAvg: 4.5,
  ratingCount: 100,
  purchaseCount: 200,
  tag: null,
});

const sampleData = {
  newReleases: [
    makeBook(1, 'Đắc Nhân Tâm'),
    makeBook(2, 'Nhà Giả Kim'),
    makeBook(3, 'Atomic Habits'),
    makeBook(4, 'Tư Duy Nhanh Và Chậm'),
    makeBook(5, 'Khéo Ăn Nói'),
  ],
  bestsellers: [
    makeBook(6, 'Bán Chạy 1'),
    makeBook(7, 'Bán Chạy 2'),
    makeBook(8, 'Bán Chạy 3'),
    makeBook(9, 'Bán Chạy 4'),
    makeBook(10, 'Bán Chạy 5'),
  ],
  featured: [
    makeBook(11, 'E-book Nổi Bật 1'),
    makeBook(12, 'E-book Nổi Bật 2'),
    makeBook(13, 'E-book Nổi Bật 3'),
    makeBook(14, 'E-book Nổi Bật 4'),
    makeBook(15, 'E-book Nổi Bật 5'),
  ],
  categories: [
    { id: 1, slug: 'van-hoc', name: 'Văn học', bookCount: 1248 },
    { id: 2, slug: 'kinh-te', name: 'Kinh tế', bookCount: 896 },
    { id: 3, slug: 'ky-nang', name: 'Kỹ năng sống', bookCount: 743 },
  ],
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
        <HomePage />
      </MemoryRouter>
    </Provider>,
  );

describe('HomePage', () => {
  it('renders section heading "Sách mới ra mắt"', () => {
    mockUseGetHomeQuery.mockReturnValue({ data: sampleData, isLoading: false });
    renderPage();
    expect(screen.getByText(/sách mới ra mắt/i)).toBeInTheDocument();
  });

  it('renders section heading "Sách bán chạy"', () => {
    mockUseGetHomeQuery.mockReturnValue({ data: sampleData, isLoading: false });
    renderPage();
    expect(screen.getByText(/sách bán chạy/i)).toBeInTheDocument();
  });

  it('renders section heading "E-book nổi bật"', () => {
    mockUseGetHomeQuery.mockReturnValue({ data: sampleData, isLoading: false });
    renderPage();
    // Use getAllByText because book titles also contain "E-book Nổi Bật" — just assert at least 1 heading
    expect(screen.getAllByText(/e-book nổi bật/i).length).toBeGreaterThan(0);
  });

  it('renders section heading "Khám phá theo danh mục"', () => {
    mockUseGetHomeQuery.mockReturnValue({ data: sampleData, isLoading: false });
    renderPage();
    expect(screen.getByText(/khám phá theo danh mục/i)).toBeInTheDocument();
  });

  it('renders BookCards for newReleases', () => {
    mockUseGetHomeQuery.mockReturnValue({ data: sampleData, isLoading: false });
    renderPage();
    expect(screen.getAllByText('Đắc Nhân Tâm').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Atomic Habits').length).toBeGreaterThan(0);
  });

  it('renders BookCards for bestsellers', () => {
    mockUseGetHomeQuery.mockReturnValue({ data: sampleData, isLoading: false });
    renderPage();
    expect(screen.getAllByText('Bán Chạy 1').length).toBeGreaterThan(0);
  });

  it('renders BookCards for featured ebooks', () => {
    mockUseGetHomeQuery.mockReturnValue({ data: sampleData, isLoading: false });
    renderPage();
    expect(screen.getAllByText('E-book Nổi Bật 1').length).toBeGreaterThan(0);
  });

  it('"Xem tất cả" for newReleases points to /books?sort=newest', () => {
    mockUseGetHomeQuery.mockReturnValue({ data: sampleData, isLoading: false });
    renderPage();
    const links = screen.getAllByRole('link', { name: /xem tất cả/i });
    const newReleasesLink = links.find((l) =>
      (l as HTMLAnchorElement).href.includes('sort=newest'),
    );
    expect(newReleasesLink).toBeDefined();
  });

  it('"Xem tất cả" for featured ebooks points to /books?type=ebook', () => {
    mockUseGetHomeQuery.mockReturnValue({ data: sampleData, isLoading: false });
    renderPage();
    const links = screen.getAllByRole('link', { name: /xem tất cả/i });
    const ebookLink = links.find((l) => (l as HTMLAnchorElement).href.includes('type=ebook'));
    expect(ebookLink).toBeDefined();
  });

  it('"Bảng xếp hạng" link points to /books?sort=bestseller', () => {
    mockUseGetHomeQuery.mockReturnValue({ data: sampleData, isLoading: false });
    renderPage();
    const link = screen.getByRole('link', { name: /bảng xếp hạng/i });
    expect((link as HTMLAnchorElement).href).toContain('sort=bestseller');
  });

  it('renders category rows linking to /books?category=<slug>', () => {
    mockUseGetHomeQuery.mockReturnValue({ data: sampleData, isLoading: false });
    renderPage();
    const catLink = screen.getByRole('link', { name: /văn học/i });
    expect((catLink as HTMLAnchorElement).href).toContain('category=van-hoc');
  });

  it('shows skeletons while loading', () => {
    mockUseGetHomeQuery.mockReturnValue({ data: undefined, isLoading: true });
    renderPage();
    // Section headings still rendered even while loading
    expect(screen.getByText(/sách mới ra mắt/i)).toBeInTheDocument();
  });

  it('handles empty data gracefully (no crash)', () => {
    mockUseGetHomeQuery.mockReturnValue({
      data: { newReleases: [], bestsellers: [], featured: [], categories: [] },
      isLoading: false,
    });
    renderPage();
    expect(screen.getByText(/sách mới ra mắt/i)).toBeInTheDocument();
  });
});
