import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { VendorPromotionFormPage } from '../pages/VendorPromotionFormPage';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';
import type { Coupon } from '../couponTypes';

/* ── Mocks ────────────────────────────────────────────────────── */
vi.mock('../vendorCouponsApi', () => ({
  useCreateCouponMutation: vi.fn(),
  useUpdateCouponMutation: vi.fn(),
}));

import {
  useCreateCouponMutation,
  useUpdateCouponMutation,
} from '../vendorCouponsApi';

const mockCreateMutation = useCreateCouponMutation as ReturnType<typeof vi.fn>;
const mockUpdateMutation = useUpdateCouponMutation as ReturnType<typeof vi.fn>;

/* ── Fixtures ─────────────────────────────────────────────────── */
const sampleCoupon: Coupon = {
  id: 5,
  code: 'SAVE30',
  type: 'percent',
  value: 30,
  min_order: 100000,
  max_uses: 50,
  max_uses_per_user: 1,
  used_count: 3,
  starts_at: '2026-06-01T00:00:00Z',
  ends_at: '2026-12-31T23:59:59Z',
  status: 'running',
};

/* ── Store factory ────────────────────────────────────────────── */
const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

/* ── Render helpers ───────────────────────────────────────────── */
const renderCreate = () =>
  render(
    <Provider store={makeStore()}>
      <MemoryRouter initialEntries={['/vendor/promotions/new']}>
        <Routes>
          <Route path="/vendor/promotions/new" element={<VendorPromotionFormPage />} />
          <Route path="/vendor/promotions" element={<div>Promotions list</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );

const renderEdit = (id = 5, coupon: Coupon = sampleCoupon) =>
  render(
    <Provider store={makeStore()}>
      <MemoryRouter
        initialEntries={[{ pathname: `/vendor/promotions/${id}/edit`, state: { coupon } }]}
      >
        <Routes>
          <Route path="/vendor/promotions/:id/edit" element={<VendorPromotionFormPage />} />
          <Route path="/vendor/promotions" element={<div>Promotions list</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );

/* ── beforeEach ───────────────────────────────────────────────── */
beforeEach(() => {
  vi.clearAllMocks();
  mockCreateMutation.mockReturnValue([vi.fn(), { isLoading: false }]);
  mockUpdateMutation.mockReturnValue([vi.fn(), { isLoading: false }]);
});

/* ── Tests ────────────────────────────────────────────────────── */
describe('VendorPromotionFormPage — create mode', () => {
  it('renders form with required fields', () => {
    renderCreate();
    expect(screen.getByPlaceholderText(/SUMMER20/i)).toBeInTheDocument();
    expect(screen.getAllByText(/thông tin mã/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/giới hạn/i).length).toBeGreaterThanOrEqual(1);
  });

  it('submit with valid data calls createCoupon', async () => {
    const mockCreate = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ id: 10 }) });
    mockCreateMutation.mockReturnValue([mockCreate, { isLoading: false }]);
    renderCreate();

    // Fill code
    fireEvent.change(screen.getByPlaceholderText(/SUMMER20/i), {
      target: { value: 'TEST50' },
    });
    // value field
    const valueInputs = document.querySelectorAll('input[type="number"]');
    fireEvent.change(valueInputs[0], { target: { value: '50', valueAsNumber: 50 } });

    fireEvent.click(screen.getByRole('button', { name: /lưu mã giảm giá/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalled();
    });
  });

  it('percent value 101 shows validation error', async () => {
    const mockCreate = vi.fn();
    mockCreateMutation.mockReturnValue([mockCreate, { isLoading: false }]);
    renderCreate();

    fireEvent.change(screen.getByPlaceholderText(/SUMMER20/i), {
      target: { value: 'BADPCT' },
    });
    const valueInputs = document.querySelectorAll('input[type="number"]');
    fireEvent.change(valueInputs[0], { target: { value: '101', valueAsNumber: 101 } });

    fireEvent.click(screen.getByRole('button', { name: /lưu mã giảm giá/i }));

    await waitFor(() => {
      expect(screen.getByText(/phần trăm phải từ 1 đến 100/i)).toBeInTheDocument();
    });
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('VendorPromotionFormPage — edit mode', () => {
  it('prefills code and value from existing coupon data', async () => {
    renderEdit(5, sampleCoupon);

    await waitFor(() => {
      const codeInput = screen.getByPlaceholderText(/SUMMER20/i) as HTMLInputElement;
      expect(codeInput.value).toBe('SAVE30');
    });
  });

  it('submit calls updateCoupon in edit mode', async () => {
    const mockUpdate = vi.fn().mockReturnValue({ unwrap: () => Promise.resolve({ id: 5 }) });
    mockUpdateMutation.mockReturnValue([mockUpdate, { isLoading: false }]);

    renderEdit(5, sampleCoupon);

    await waitFor(() => {
      expect((screen.getByPlaceholderText(/SUMMER20/i) as HTMLInputElement).value).toBe('SAVE30');
    });

    fireEvent.click(screen.getByRole('button', { name: /lưu mã giảm giá/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });
  });
});
