import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { VendorPromotionsPage } from '../pages/VendorPromotionsPage';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';
import type { Coupon } from '../couponTypes';

/* ── Mocks ────────────────────────────────────────────────────── */
vi.mock('../vendorCouponsApi', () => ({
  useGetVendorCouponsQuery: vi.fn(),
  useDeleteCouponMutation: vi.fn(),
}));

import {
  useGetVendorCouponsQuery,
  useDeleteCouponMutation,
} from '../vendorCouponsApi';

const mockGetVendorCoupons = useGetVendorCouponsQuery as ReturnType<typeof vi.fn>;
const mockDeleteCouponMutation = useDeleteCouponMutation as ReturnType<typeof vi.fn>;

/* ── Fixtures ─────────────────────────────────────────────────── */
const makeCoupon = (id: number, code: string, status: Coupon['status'] = 'running'): Coupon => ({
  id,
  code,
  type: 'percent',
  value: 20,
  min_order: null,
  max_uses: 100,
  max_uses_per_user: null,
  used_count: 5,
  starts_at: '2026-01-01T00:00:00Z',
  ends_at: '2026-12-31T23:59:59Z',
  status,
});

const sampleCoupons: Coupon[] = [
  makeCoupon(1, 'SUMMER20', 'running'),
  makeCoupon(2, 'WELCOME10', 'scheduled'),
  makeCoupon(3, 'OLDCODE', 'ended'),
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
      <MemoryRouter initialEntries={['/vendor/promotions']}>
        <VendorPromotionsPage />
      </MemoryRouter>
    </Provider>,
  );

/* ── beforeEach ───────────────────────────────────────────────── */
const mockDelete = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve() });

beforeEach(() => {
  vi.clearAllMocks();
  mockGetVendorCoupons.mockReturnValue({
    data: { coupons: sampleCoupons, pagination: samplePagination },
    isFetching: false,
  });
  mockDeleteCouponMutation.mockReturnValue([mockDelete, { isLoading: false }]);
});

/* ── Tests ────────────────────────────────────────────────────── */
describe('VendorPromotionsPage', () => {
  it('renders table rows with coupon codes', () => {
    renderPage();
    expect(screen.getByText('SUMMER20')).toBeInTheDocument();
    expect(screen.getByText('WELCOME10')).toBeInTheDocument();
    expect(screen.getByText('OLDCODE')).toBeInTheDocument();
  });

  it('renders status badges for each coupon', () => {
    renderPage();
    expect(screen.getByText('Đang chạy')).toBeInTheDocument();
    expect(screen.getByText('Lên lịch')).toBeInTheDocument();
    expect(screen.getByText('Đã kết thúc')).toBeInTheDocument();
  });

  it('create button navigates to /vendor/promotions/new', () => {
    renderPage();
    const link = screen.getByRole('link', { name: /tạo mã giảm giá/i });
    expect(link).toHaveAttribute('href', '/vendor/promotions/new');
  });

  it('shows empty state when no coupons', () => {
    mockGetVendorCoupons.mockReturnValue({
      data: { coupons: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } },
      isFetching: false,
    });
    renderPage();
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('delete button opens confirm dialog', async () => {
    renderPage();
    const deleteButtons = screen.getAllByRole('button', { name: /xóa/i });
    fireEvent.click(deleteButtons[0]);
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  it('confirming delete calls deleteCoupon with correct id', async () => {
    renderPage();
    const deleteButtons = screen.getAllByRole('button', { name: /xóa/i });
    fireEvent.click(deleteButtons[0]);
    await waitFor(() => screen.getByRole('dialog'));

    const allXoaButtons = screen.getAllByRole('button', { name: /xóa/i });
    const confirmBtn = allXoaButtons[allXoaButtons.length - 1];
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith({ id: 1 });
    });
  });

  it('cancel delete closes dialog without calling mutation', async () => {
    renderPage();
    const deleteButtons = screen.getAllByRole('button', { name: /xóa/i });
    fireEvent.click(deleteButtons[0]);
    await waitFor(() => screen.getByRole('dialog'));

    fireEvent.click(screen.getByRole('button', { name: /hủy/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(mockDelete).not.toHaveBeenCalled();
  });
});
