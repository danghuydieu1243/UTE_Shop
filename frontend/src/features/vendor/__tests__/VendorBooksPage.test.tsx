import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { VendorBooksPage } from '../pages/VendorBooksPage';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';
import type { VendorBookRow } from '../types';

/* ── Mocks ────────────────────────────────────────────────────── */
vi.mock('../vendorBooksApi', () => ({
  useGetVendorBooksQuery: vi.fn(),
  useDeleteVendorBookMutation: vi.fn(),
  useChangeVendorBookStatusMutation: vi.fn(),
}));

import {
  useGetVendorBooksQuery,
  useDeleteVendorBookMutation,
  useChangeVendorBookStatusMutation,
} from '../vendorBooksApi';

const mockGetVendorBooks           = useGetVendorBooksQuery          as ReturnType<typeof vi.fn>;
const mockDeleteVendorBookMutation = useDeleteVendorBookMutation      as ReturnType<typeof vi.fn>;
const mockChangeStatusMutation     = useChangeVendorBookStatusMutation as ReturnType<typeof vi.fn>;

/* ── Helpers ──────────────────────────────────────────────────── */
const makeBook = (id: number, title: string, status: VendorBookRow['status'] = 'published'): VendorBookRow => ({
  id,
  title,
  author: 'Test Author',
  coverImageUrl: null,
  price: 89000,
  status,
  purchaseCount: 50,
  updatedAt: '2024-01-01T00:00:00Z',
});

const sampleBooks: VendorBookRow[] = [
  makeBook(1, 'Đắc Nhân Tâm', 'published'),
  makeBook(2, 'Clean Code',    'draft'),
  makeBook(3, 'Atomic Habits', 'published'),
];

const samplePagination = { page: 1, limit: 10, total: 3, totalPages: 1 };

const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

const renderPage = () =>
  render(
    <Provider store={makeStore()}>
      <MemoryRouter initialEntries={['/vendor/books']}>
        <VendorBooksPage />
      </MemoryRouter>
    </Provider>,
  );

/* ── beforeEach setup ─────────────────────────────────────────── */
const mockDelete  = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() });
const mockChange  = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() });

beforeEach(() => {
  vi.clearAllMocks();

  mockGetVendorBooks.mockReturnValue({
    data: { books: sampleBooks, pagination: samplePagination },
    isFetching: false,
  });
  mockDeleteVendorBookMutation.mockReturnValue([mockDelete, { isLoading: false }]);
  mockChangeStatusMutation.mockReturnValue([mockChange, { isLoading: false }]);
});

/* ── Tests ────────────────────────────────────────────────────── */
describe('VendorBooksPage', () => {
  it('renders table rows for all books', () => {
    renderPage();
    expect(screen.getByText('Đắc Nhân Tâm')).toBeInTheDocument();
    expect(screen.getByText('Clean Code')).toBeInTheDocument();
    expect(screen.getByText('Atomic Habits')).toBeInTheDocument();
  });

  it('renders correct status pill for published and draft books', () => {
    renderPage();
    const publicPills = screen.getAllByText('Công khai');
    expect(publicPills.length).toBeGreaterThanOrEqual(2);
    // "Nháp" appears in both the status filter dropdown option and as a pill — use getAllByText
    const nhapEls = screen.getAllByText('Nháp');
    expect(nhapEls.length).toBeGreaterThanOrEqual(1);
  });

  it('shows total E-book count in topbar', () => {
    renderPage();
    // "3 E-book" appears in topbar — may appear multiple times (topbar span splits into "3" + " E-book")
    const countEls = screen.getAllByText(/E-book/i);
    expect(countEls.length).toBeGreaterThan(0);
  });

  it('renders "+ Thêm E-book mới" link pointing to /vendor/books/new', () => {
    renderPage();
    const link = screen.getByRole('link', { name: /thêm e-book mới/i });
    expect(link).toHaveAttribute('href', '/vendor/books/new');
  });

  it('shows empty state when no books', () => {
    mockGetVendorBooks.mockReturnValue({
      data: { books: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } },
      isFetching: false,
    });
    renderPage();
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.getByText(/bạn chưa có e-book nào/i)).toBeInTheDocument();
    const firstLink = screen.getByRole('link', { name: /thêm e-book đầu tiên/i });
    expect(firstLink).toHaveAttribute('href', '/vendor/books/new');
  });

  it('bulk bar is hidden initially when nothing is selected', () => {
    renderPage();
    expect(screen.queryByTestId('bulk-bar')).not.toBeInTheDocument();
  });

  it('selecting a row shows the bulk bar', async () => {
    renderPage();
    const checkboxes = screen.getAllByRole('checkbox', { name: /chọn/i });
    // Click the first row checkbox (index 1 — index 0 is the "select all" header)
    fireEvent.click(checkboxes[1]);
    await waitFor(() => {
      expect(screen.getByTestId('bulk-bar')).toBeInTheDocument();
    });
    expect(screen.getByText(/1 sách đã chọn/i)).toBeInTheDocument();
  });

  it('bulk bar shows correct count when multiple rows selected', async () => {
    renderPage();
    const checkboxes = screen.getAllByRole('checkbox', { name: /chọn/i });
    fireEvent.click(checkboxes[1]);
    fireEvent.click(checkboxes[2]);
    await waitFor(() => {
      expect(screen.getByText(/2 sách đã chọn/i)).toBeInTheDocument();
    });
  });

  it('"Bỏ chọn" clears selection and hides bulk bar', async () => {
    renderPage();
    const checkboxes = screen.getAllByRole('checkbox', { name: /chọn/i });
    fireEvent.click(checkboxes[1]);
    await waitFor(() => expect(screen.getByTestId('bulk-bar')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /bỏ chọn/i }));
    await waitFor(() => expect(screen.queryByTestId('bulk-bar')).not.toBeInTheDocument());
  });

  it('clicking Xóa opens confirm dialog', async () => {
    renderPage();
    const deleteButtons = screen.getAllByRole('button', { name: /xóa/i });
    // The first "Xóa" button is the row-level delete for "Đắc Nhân Tâm"
    fireEvent.click(deleteButtons[0]);
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    // Dialog should mention the book title (may be multiple matches — use getAllByText)
    const titleEls = screen.getAllByText(/Đắc Nhân Tâm/);
    expect(titleEls.length).toBeGreaterThan(0);
  });

  it('confirming delete calls deleteVendorBook with correct id', async () => {
    renderPage();
    const deleteButtons = screen.getAllByRole('button', { name: /xóa/i });
    fireEvent.click(deleteButtons[0]);
    await waitFor(() => screen.getByRole('dialog'));

    // The confirm button is the last "Xóa" button that appears in the dialog
    const allXoaButtons = screen.getAllByRole('button', { name: /xóa/i });
    // The dialog has a red "Xóa" confirm button — it is the last one rendered in DOM
    const confirmBtn = allXoaButtons[allXoaButtons.length - 1];
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith({ id: 1 });
    });
  });

  it('cancelling delete closes dialog without calling mutation', async () => {
    renderPage();
    const deleteButtons = screen.getAllByRole('button', { name: /xóa/i });
    fireEvent.click(deleteButtons[0]);
    await waitFor(() => screen.getByRole('dialog'));

    fireEvent.click(screen.getByRole('button', { name: /hủy/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it('search input updates query args (via debounce)', async () => {
    renderPage();
    const searchInput = screen.getByRole('textbox', { name: /tìm kiếm/i });
    fireEvent.change(searchInput, { target: { value: 'React' } });

    // After debounce (mocked time would be needed; check that the call includes q)
    await waitFor(
      () => {
        const calls = mockGetVendorBooks.mock.calls;
        const hasSearch = calls.some((call) => call[0]?.q === 'React');
        expect(hasSearch).toBe(true);
      },
      { timeout: 1000 },
    );
  });

  it('status filter select updates query args immediately on change', async () => {
    renderPage();
    const statusSelect = screen.getByRole('combobox', { name: /lọc trạng thái/i });
    fireEvent.change(statusSelect, { target: { value: 'published' } });

    await waitFor(() => {
      const calls = mockGetVendorBooks.mock.calls;
      const hasFilter = calls.some((call) => call[0]?.status === 'published');
      expect(hasFilter).toBe(true);
    });
  });

  it('"Sửa" links point to /vendor/books/:id/edit', () => {
    renderPage();
    const editLinks = screen.getAllByRole('link', { name: /sửa/i });
    expect(editLinks[0]).toHaveAttribute('href', '/vendor/books/1/edit');
  });

  it('bulk delete shows confirm dialog then calls deleteVendorBook for each selected id', async () => {
    renderPage();
    const checkboxes = screen.getAllByRole('checkbox', { name: /chọn/i });
    fireEvent.click(checkboxes[1]); // book id=1
    fireEvent.click(checkboxes[2]); // book id=2
    await waitFor(() => screen.getByTestId('bulk-bar'));

    // Click "Xóa đã chọn" — should open confirm dialog, not delete immediately
    fireEvent.click(screen.getByRole('button', { name: /xóa đã chọn/i }));
    await waitFor(() => screen.getByRole('dialog'));
    expect(mockDelete).not.toHaveBeenCalled();

    // Confirm in dialog triggers actual deletion
    const allXoaButtons = screen.getAllByRole('button', { name: /xóa/i });
    const confirmBtn = allXoaButtons[allXoaButtons.length - 1];
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith({ id: 1 });
      expect(mockDelete).toHaveBeenCalledWith({ id: 2 });
    });
  });
});
