// Tests cho MyEbooksPage — Screen 15, E-book của tôi
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import MyEbooksPage from '../pages/MyEbooksPage';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';

/* ── Mock libraryApi ── */
vi.mock('../libraryApi', () => ({
  useGetMyEbooksQuery: vi.fn(),
  useRequestDownloadMutation: vi.fn(),
}));

/* ── Mock authApi (useGetMeQuery dùng trong AccountShell) ── */
vi.mock('../../auth/authApi', () => ({
  useGetMeQuery: vi.fn(() => ({
    data: { fullName: 'Nguyễn Văn A', email: 'user@test.com' },
  })),
  useLogoutMutation: vi.fn(() => [vi.fn(), {}]),
}));

import { useGetMyEbooksQuery, useRequestDownloadMutation } from '../libraryApi';

const mockUseGetMyEbooksQuery = useGetMyEbooksQuery as ReturnType<typeof vi.fn>;
const mockUseRequestDownloadMutation = useRequestDownloadMutation as ReturnType<typeof vi.fn>;

/* ── Dữ liệu mẫu ── */
const mockEbooks = [
  {
    bookId: 1,
    slug: 'dac-nhan-tam',
    title: 'Đắc Nhân Tâm',
    author: 'Dale Carnegie',
    coverImageUrl: null,
    fileFormat: 'PDF',
    fileSizeBytes: 8_912_896, // ~8.5 MB
    grantedAt: '2024-01-15T10:00:00Z',
    orderCode: 'ATHENA-001',
  },
  {
    bookId: 2,
    slug: 'atomic-habits',
    title: 'Atomic Habits',
    author: 'James Clear',
    coverImageUrl: null,
    fileFormat: 'EPUB',
    fileSizeBytes: 3_145_728, // 3 MB
    grantedAt: '2024-02-01T10:00:00Z',
    orderCode: 'ATHENA-002',
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
        <MyEbooksPage />
      </MemoryRouter>
    </Provider>,
  );

// Hàm trigger mutation (tham chiếu chung để assert đã gọi đúng bookId)
let triggerDownload: ReturnType<typeof vi.fn>;

describe('MyEbooksPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    triggerDownload = vi.fn().mockReturnValue({
      unwrap: vi.fn().mockResolvedValue({
        url: '/api/v1/download?token=test',
        expiresAt: '2024-01-15T10:05:00Z',
        fileFormat: 'PDF',
        fileSizeBytes: 8_912_896,
      }),
    });
    mockUseRequestDownloadMutation.mockReturnValue([triggerDownload, { isLoading: false }]);
  });

  it('hiển thị danh sách card khi có dữ liệu', () => {
    mockUseGetMyEbooksQuery.mockReturnValue({
      data: { ebooks: mockEbooks, pagination: defaultPagination },
      isLoading: false,
    });
    renderPage();

    // Dùng getAllByText vì title xuất hiện cả trong fallback cover lẫn text card
    expect(screen.getAllByText('Đắc Nhân Tâm').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Atomic Habits').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Dale Carnegie').length).toBeGreaterThanOrEqual(1);
    // Hiển thị số lượng
    expect(screen.getByText(/2 cuốn/)).toBeInTheDocument();
  });

  it('hiển thị empty state khi không có e-book', () => {
    mockUseGetMyEbooksQuery.mockReturnValue({
      data: { ebooks: [], pagination: { page: 1, limit: 12, total: 0, totalPages: 0 } },
      isLoading: false,
    });
    renderPage();

    expect(screen.getByText('Bạn chưa có E-book nào')).toBeInTheDocument();
    expect(screen.getByText('Mua E-book để bắt đầu xây dựng thư viện')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Khám phá E-book/i }),
    ).toBeInTheDocument();
  });

  it('hiển thị skeleton khi đang tải (isLoading=true)', () => {
    mockUseGetMyEbooksQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    renderPage();

    // Skeleton có class animate-pulse
    const skeletons = document.querySelectorAll('.animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
    // Không hiện dữ liệu thật
    expect(screen.queryByText('Đắc Nhân Tâm')).not.toBeInTheDocument();
  });

  it('lọc client-side theo tên sách khi nhập từ khóa tìm kiếm', () => {
    mockUseGetMyEbooksQuery.mockReturnValue({
      data: { ebooks: mockEbooks, pagination: defaultPagination },
      isLoading: false,
    });
    renderPage();

    // Ban đầu hiện cả 2 sách
    expect(screen.getAllByText('Đắc Nhân Tâm').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Atomic Habits').length).toBeGreaterThanOrEqual(1);

    // Nhập tìm kiếm "atomic"
    const searchInput = screen.getByPlaceholderText('Tìm trong thư viện...');
    fireEvent.change(searchInput, { target: { value: 'atomic' } });

    // Chỉ còn Atomic Habits
    expect(screen.queryByText('Đắc Nhân Tâm')).not.toBeInTheDocument();
    expect(screen.getAllByText('Atomic Habits').length).toBeGreaterThanOrEqual(1);
  });

  it('click "Tải xuống" gọi requestDownload đúng bookId và điều hướng tới signed URL', async () => {
    // Stub window.location.assign (jsdom chưa hỗ trợ điều hướng thật)
    const assignSpy = vi.fn();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign: assignSpy },
    });

    mockUseGetMyEbooksQuery.mockReturnValue({
      data: { ebooks: mockEbooks, pagination: defaultPagination },
      isLoading: false,
    });
    renderPage();

    const downloadBtns = screen.getAllByRole('button', { name: /Tải xuống/i });
    fireEvent.click(downloadBtns[0]);

    await waitFor(() => {
      // bookId của item đầu (sort mặc định "Ngày mua" desc → Atomic Habits 2024-02 đứng trước → bookId 2)
      expect(triggerDownload).toHaveBeenCalledWith(2);
      expect(assignSpy).toHaveBeenCalledWith('/api/v1/download?token=test');
    });
  });

  it('sắp xếp "Tên A→Z" đặt Atomic Habits trước Đắc Nhân Tâm', () => {
    mockUseGetMyEbooksQuery.mockReturnValue({
      data: { ebooks: mockEbooks, pagination: defaultPagination },
      isLoading: false,
    });
    renderPage();

    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'name' } });

    // Lấy tên card (text-[13px] font-semibold) theo thứ tự xuất hiện trong DOM
    const titles = screen
      .getAllByText(/Atomic Habits|Đắc Nhân Tâm/)
      .map((el) => el.textContent);
    const idxAtomic = titles.findIndex((t) => t === 'Atomic Habits');
    const idxDac = titles.findIndex((t) => t === 'Đắc Nhân Tâm');
    // A < Đ theo localeCompare 'vi' → Atomic đứng trước
    expect(idxAtomic).toBeLessThan(idxDac);
  });
});
