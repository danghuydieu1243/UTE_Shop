import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { VendorBookFormPage } from '../pages/VendorBookFormPage';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';
import type { VendorBookDetail } from '../types';
import type { Category } from '../../catalog/types';

/* ── Mocks ─────────────────────────────────────────────────────────────────── */
vi.mock('../vendorBooksApi', () => ({
  useGetVendorBookQuery: vi.fn(),
  useCreateVendorBookMutation: vi.fn(),
  useUpdateVendorBookMutation: vi.fn(),
}));

vi.mock('../../catalog/catalogApi', () => ({
  useGetCategoriesQuery: vi.fn(),
}));

import {
  useGetVendorBookQuery,
  useCreateVendorBookMutation,
  useUpdateVendorBookMutation,
} from '../vendorBooksApi';

import { useGetCategoriesQuery } from '../../catalog/catalogApi';

const mockGetVendorBook = useGetVendorBookQuery as ReturnType<typeof vi.fn>;
const mockCreateMutation = useCreateVendorBookMutation as ReturnType<typeof vi.fn>;
const mockUpdateMutation = useUpdateVendorBookMutation as ReturnType<typeof vi.fn>;
const mockGetCategories = useGetCategoriesQuery as ReturnType<typeof vi.fn>;

/* ── Fixtures ──────────────────────────────────────────────────────────────── */
const sampleCategories: Category[] = [
  { id: 1, slug: 'lap-trinh', name: 'Lập trình', parentId: null, sortOrder: 1, bookCount: 5 },
  { id: 2, slug: 'kinh-doanh', name: 'Kinh doanh', parentId: null, sortOrder: 2, bookCount: 3 },
];

const sampleBook: VendorBookDetail = {
  id: 42,
  slug: 'react-tu-a-den-z',
  title: 'React từ A đến Z',
  description: 'Hướng dẫn React đầy đủ',
  tableOfContents: ['Chương 1: Giới thiệu', 'Chương 2: Components'],
  price: 120000,
  originalPrice: 150000,
  categoryId: 1,
  authorName: 'Nguyễn Văn A',
  publisherName: 'NXB Lập trình',
  publishYear: 2026,
  isbn: '978-604-01',
  fileFormat: 'PDF',
  fileSizeBytes: 13000000,
  coverImageUrl: '/uploads/covers/react.jpg',
  images: [{ url: '/uploads/covers/react.jpg', alt: 'cover', sortOrder: 0 }],
  status: 'published',
  purchaseCount: 50,
  updatedAt: '2024-01-01T00:00:00Z',
  publishedAt: '2024-01-01T00:00:00Z',
};

/* ── Store factory ──────────────────────────────────────────────────────────── */
const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

/* ── Render helpers ─────────────────────────────────────────────────────────── */
const renderCreate = () =>
  render(
    <Provider store={makeStore()}>
      <MemoryRouter initialEntries={['/vendor/books/new']}>
        <Routes>
          <Route path="/vendor/books/new" element={<VendorBookFormPage />} />
          <Route path="/vendor/books" element={<div>Books list</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );

const renderEdit = (id = 42) =>
  render(
    <Provider store={makeStore()}>
      <MemoryRouter initialEntries={[`/vendor/books/${id}/edit`]}>
        <Routes>
          <Route path="/vendor/books/:id/edit" element={<VendorBookFormPage />} />
          <Route path="/vendor/books" element={<div>Books list</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );

/* ── beforeEach ─────────────────────────────────────────────────────────────── */
beforeEach(() => {
  vi.clearAllMocks();
  mockGetCategories.mockReturnValue({ data: sampleCategories });
  mockGetVendorBook.mockReturnValue({ data: undefined, isLoading: false });
  mockCreateMutation.mockReturnValue([vi.fn(), { isLoading: false }]);
  mockUpdateMutation.mockReturnValue([vi.fn(), { isLoading: false }]);
});

/* ── Tests ──────────────────────────────────────────────────────────────────── */
describe('VendorBookFormPage — create mode', () => {
  it('renders empty form with breadcrumb "Thêm E-book mới"', () => {
    renderCreate();
    expect(screen.getByText('Thêm E-book mới')).toBeInTheDocument();
    // Cards — use getAllByText since text appears in labels + headings
    expect(screen.getAllByText(/thông tin cơ bản/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/ảnh bìa/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/file e-book/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/thông tin xuất bản/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/trạng thái/i).length).toBeGreaterThanOrEqual(1);
  });

  it('populates category select from useGetCategoriesQuery', () => {
    renderCreate();
    expect(screen.getByText('Lập trình')).toBeInTheDocument();
    expect(screen.getByText('Kinh doanh')).toBeInTheDocument();
  });

  it('title counter updates as user types', async () => {
    renderCreate();
    const titleInput = screen.getByPlaceholderText('Nhập tên E-book...');
    fireEvent.change(titleInput, { target: { value: 'Hello World' } });
    await waitFor(() => {
      expect(screen.getByText('11 / 200')).toBeInTheDocument();
    });
  });

  it('blocks submit with validation errors when no title entered', async () => {
    const mockCreate = vi.fn();
    mockCreateMutation.mockReturnValue([mockCreate, { isLoading: false }]);

    renderCreate();
    // Click "Đăng sách" without filling anything
    fireEvent.click(screen.getByRole('button', { name: /đăng sách/i }));

    await waitFor(() => {
      expect(mockCreate).not.toHaveBeenCalled();
    });

    // Should show a Zod validation error for title
    await waitFor(() => {
      expect(
        screen.getByText(/tên e-book phải có ít nhất 2 ký tự/i),
      ).toBeInTheDocument();
    });
  });

  it('shows required-field validation errors on empty submit — author also required', async () => {
    const mockCreate = vi.fn();
    mockCreateMutation.mockReturnValue([mockCreate, { isLoading: false }]);

    renderCreate();
    fireEvent.click(screen.getByRole('button', { name: /lưu nháp/i }));

    await waitFor(() => {
      expect(screen.getByText(/tên tác giả không được để trống/i)).toBeInTheDocument();
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('"Lưu nháp" button is present and submittable', () => {
    renderCreate();
    const btn = screen.getByRole('button', { name: /lưu nháp/i });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });

  it('"Đăng sách" button is present and submittable', () => {
    renderCreate();
    const btn = screen.getByRole('button', { name: /đăng sách/i });
    expect(btn).toBeInTheDocument();
    expect(btn).not.toBeDisabled();
  });

  it('buttons are disabled while submitting (isLoading=true)', () => {
    mockCreateMutation.mockReturnValue([vi.fn(), { isLoading: true }]);
    renderCreate();
    expect(screen.getByRole('button', { name: /lưu nháp/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /đăng sách/i })).toBeDisabled();
  });

  it('"Đăng sách" radio is checked by default (status=published default)', () => {
    renderCreate();
    const publishedRadio = screen.getByRole('radio', { name: /công khai/i }) as HTMLInputElement;
    expect(publishedRadio.value).toBe('published');
    // The "Công khai" option is the default status
    const draftRadio = screen.getByRole('radio', { name: /lưu nháp/i }) as HTMLInputElement;
    expect(draftRadio.value).toBe('draft');
    expect(publishedRadio.checked).toBe(true);
  });

  it('selecting "Lưu nháp" radio changes status value', () => {
    renderCreate();
    const draftRadio = screen.getByRole('radio', { name: /lưu nháp/i }) as HTMLInputElement;
    fireEvent.click(draftRadio);
    expect(draftRadio.checked).toBe(true);
  });
});

describe('VendorBookFormPage — edit mode', () => {
  beforeEach(() => {
    mockGetVendorBook.mockReturnValue({ data: sampleBook, isLoading: false });
  });

  it('prefills title, description, and authorName fields from existing book data', async () => {
    renderEdit(42);

    await waitFor(() => {
      expect(
        (screen.getByPlaceholderText('Nhập tên E-book...') as HTMLInputElement).value,
      ).toBe('React từ A đến Z');
    });

    expect(
      (screen.getByPlaceholderText('Mô tả nội dung E-book...') as HTMLTextAreaElement).value,
    ).toBe('Hướng dẫn React đầy đủ');
    expect(
      (screen.getByPlaceholderText('Tên tác giả') as HTMLInputElement).value,
    ).toBe('Nguyễn Văn A');
  });

  it('shows "Sửa: <title>" in breadcrumb for edit mode', async () => {
    renderEdit(42);

    await waitFor(() => {
      expect(screen.getByText(/Sửa: React từ A đến Z/)).toBeInTheDocument();
    });
  });

  it('shows existing cover image in preview panel', async () => {
    renderEdit(42);

    // The component renders an img with src from the existing image URL
    await waitFor(() => {
      const imgs = document.querySelectorAll('img');
      const hasCoverImg = Array.from(imgs).some((img) => img.src.includes('react.jpg'));
      expect(hasCoverImg).toBe(true);
    });
  });

  it('shows existing file name with "(đã tải)" label', async () => {
    renderEdit(42);

    await waitFor(() => {
      expect(screen.getByText(/đã tải/i)).toBeInTheDocument();
    });
  });

  it('category select is prefilled from existing book (categoryId=1)', async () => {
    renderEdit(42);

    await waitFor(() => {
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('1');
    });
  });

  it('shows API error banner when mutation rejects with error code', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      unwrap: () =>
        Promise.reject({ data: { code: 'FILE_TOO_LARGE', message: 'File too large' } }),
    });
    mockUpdateMutation.mockReturnValue([mockUpdate, { isLoading: false }]);

    renderEdit(42);

    // Wait for prefill
    await waitFor(() => {
      expect(
        (screen.getByPlaceholderText('Nhập tên E-book...') as HTMLInputElement).value,
      ).toBe('React từ A đến Z');
    });

    fireEvent.click(screen.getByRole('button', { name: /đăng sách/i }));

    await waitFor(() => {
      expect(screen.getByText((t) => t.includes('File quá lớn'))).toBeInTheDocument();
    });
  });

  it('"Lưu nháp" in edit mode calls update with status=draft in FormData', async () => {
    const appendSpy = vi.spyOn(FormData.prototype, 'append');
    const mockUpdate = vi.fn().mockReturnValue({
      unwrap: () => Promise.resolve(sampleBook),
    });
    mockUpdateMutation.mockReturnValue([mockUpdate, { isLoading: false }]);

    renderEdit(42);
    await waitFor(() => {
      expect(
        (screen.getByPlaceholderText('Nhập tên E-book...') as HTMLInputElement).value,
      ).toBe('React từ A đến Z');
    });

    fireEvent.click(screen.getByRole('button', { name: /lưu nháp/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
      const statusCall = appendSpy.mock.calls.find(([key]) => key === 'status');
      expect(statusCall?.[1]).toBe('draft');
    });

    appendSpy.mockRestore();
  });

  it('"Đăng sách" in edit mode calls update with status=published in FormData', async () => {
    const appendSpy = vi.spyOn(FormData.prototype, 'append');
    const mockUpdate = vi.fn().mockReturnValue({
      unwrap: () => Promise.resolve(sampleBook),
    });
    mockUpdateMutation.mockReturnValue([mockUpdate, { isLoading: false }]);

    renderEdit(42);
    await waitFor(() => {
      expect(
        (screen.getByPlaceholderText('Nhập tên E-book...') as HTMLInputElement).value,
      ).toBe('React từ A đến Z');
    });

    fireEvent.click(screen.getByRole('button', { name: /đăng sách/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
      const statusCall = appendSpy.mock.calls.find(([key]) => key === 'status');
      expect(statusCall?.[1]).toBe('published');
    });

    appendSpy.mockRestore();
  });

  it('uses updateVendorBook mutation on submit (not createVendorBook)', async () => {
    const mockUpdate = vi.fn().mockReturnValue({
      unwrap: () => Promise.resolve(sampleBook),
    });
    mockUpdateMutation.mockReturnValue([mockUpdate, { isLoading: false }]);
    const mockCreate = vi.fn();
    mockCreateMutation.mockReturnValue([mockCreate, { isLoading: false }]);

    renderEdit(42);

    // Wait for prefill
    await waitFor(() => {
      expect(
        (screen.getByPlaceholderText('Nhập tên E-book...') as HTMLInputElement).value,
      ).toBe('React từ A đến Z');
    });

    // In edit mode, files are optional — just submit as-is
    fireEvent.click(screen.getByRole('button', { name: /đăng sách/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    }, { timeout: 3000 });

    expect(mockCreate).not.toHaveBeenCalled();
  });
});
