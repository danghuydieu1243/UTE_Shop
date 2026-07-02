/**
 * AdminSettingsPage tests — TDD RED phase (Task 8).
 * Mocks RTK Query hooks (useGetCommissionQuery / useUpdateCommissionMutation), theo
 * đúng pattern của AdminUsersPage.test.tsx (vi.mock('../adminApi', ...) + vi.importActual).
 *
 * Coverage:
 *  1. Render hiển thị giá trị % hiện tại từ query.
 *  2. Sửa % và bấm LƯU → gọi updateCommission({ ratePercent }) đúng payload.
 *  3. Hiển thị Alert thành công sau khi lưu.
 *  4. Hiển thị Alert lỗi khi mutation lỗi.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';

// ── We mock the RTK Query hooks so tests stay unit-level ─────────────────────
const mockGetCommission = vi.fn();
const mockUpdateFn = vi.fn();
const mockUseUpdateCommission = vi.fn();

vi.mock('../adminApi', async () => {
  const actual = await vi.importActual<typeof import('../adminApi')>('../adminApi');
  return {
    ...actual,
    useGetCommissionQuery: (...args: unknown[]) => mockGetCommission(...args),
    useUpdateCommissionMutation: (...args: unknown[]) => mockUseUpdateCommission(...args),
  };
});

// ── Store factory ─────────────────────────────────────────────────────────────
const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

// ── Render helper ─────────────────────────────────────────────────────────────
const renderPage = async () => {
  const { AdminSettingsPage } = await import('../pages/AdminSettingsPage');
  return render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <AdminSettingsPage />
      </MemoryRouter>
    </Provider>,
  );
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCommission.mockReturnValue({
    data: { rateBps: 1000, ratePercent: 10 },
    isLoading: false,
  });
  mockUpdateFn.mockReturnValue({ unwrap: () => Promise.resolve({ rateBps: 1500, ratePercent: 15 }) });
  mockUseUpdateCommission.mockReturnValue([
    mockUpdateFn,
    { isLoading: false, isSuccess: false, error: undefined },
  ]);
});

describe('AdminSettingsPage — render', () => {
  it('renders page heading', async () => {
    await renderPage();
    expect(screen.getByText('Cấu hình phí sàn')).toBeInTheDocument();
  });

  it('renders current commission percent from query', async () => {
    await renderPage();
    const input = screen.getByLabelText(/tỉ lệ phí sàn/i) as HTMLInputElement;
    expect(input.value).toBe('10');
  });

  it('renders the disclaimer note', async () => {
    await renderPage();
    expect(
      screen.getByText(/Áp dụng cho các đơn thanh toán từ sau khi lưu; đơn cũ không đổi/i),
    ).toBeInTheDocument();
  });

  it('renders Spinner while loading and not the form', async () => {
    mockGetCommission.mockReturnValue({ data: undefined, isLoading: true });
    await renderPage();
    expect(screen.queryByLabelText(/tỉ lệ phí sàn/i)).not.toBeInTheDocument();
  });
});

describe('AdminSettingsPage — save', () => {
  it('calls updateCommission with the edited percent on save', async () => {
    await renderPage();
    const input = screen.getByLabelText(/tỉ lệ phí sàn/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '15' } });
    fireEvent.click(screen.getByRole('button', { name: /lưu/i }));

    await waitFor(() => {
      expect(mockUpdateFn).toHaveBeenCalledWith({ ratePercent: 15 });
    });
  });

  it('does NOT call updateCommission when value is out of range', async () => {
    await renderPage();
    const input = screen.getByLabelText(/tỉ lệ phí sàn/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '150' } });
    fireEvent.click(screen.getByRole('button', { name: /lưu/i }));

    await waitFor(() => {
      expect(mockUpdateFn).not.toHaveBeenCalled();
    });
  });

  it('shows success Alert when isSuccess is true', async () => {
    mockUseUpdateCommission.mockReturnValue([
      mockUpdateFn,
      { isLoading: false, isSuccess: true, error: undefined },
    ]);
    await renderPage();
    expect(screen.getByText(/Đã lưu tỉ lệ phí sàn/i)).toBeInTheDocument();
  });

  it('shows error Alert with server message when mutation fails', async () => {
    mockUseUpdateCommission.mockReturnValue([
      mockUpdateFn,
      { isLoading: false, isSuccess: false, error: { message: 'Tỉ lệ không hợp lệ' } },
    ]);
    await renderPage();
    expect(screen.getByText('Tỉ lệ không hợp lệ')).toBeInTheDocument();
  });
});
