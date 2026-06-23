/** VendorSettingsPage.test.tsx — Phase 6c, Task 5.
 *  Mocks RTK Query hooks; tests:
 *  - render bank list (masked number shown, KHÔNG full)
 *  - "+ Thêm" opens BankAccountFormModal
 *  - submit form calls createBankAccount with correct input
 *  - "Đặt mặc định" calls setDefault mutation
 *  - "Xóa" calls delete mutation
 *  - empty state → CTA thêm
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';
import { VendorSettingsPage } from '../pages/VendorSettingsPage';
import type { BankAccount } from '../types';

/* ── Mocks ───────────────────────────────────────────────────────────────── */
vi.mock('../bankAccountsApi', () => ({
  useGetBankAccountsQuery: vi.fn(),
  useCreateBankAccountMutation: vi.fn(),
  useUpdateBankAccountMutation: vi.fn(),
  useSetDefaultBankAccountMutation: vi.fn(),
  useDeleteBankAccountMutation: vi.fn(),
}));

vi.mock('../../vendor/components/VendorShell', () => ({
  VendorShell: ({
    title,
    children,
  }: {
    title: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <div data-testid="shell-title">{title}</div>
      <div data-testid="shell-content">{children}</div>
    </div>
  ),
  BtnPrimary: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }) => <button onClick={onClick}>{children}</button>,
}));

import {
  useGetBankAccountsQuery,
  useCreateBankAccountMutation,
  useUpdateBankAccountMutation,
  useSetDefaultBankAccountMutation,
  useDeleteBankAccountMutation,
} from '../bankAccountsApi';

const mockGetBankAccounts = useGetBankAccountsQuery as ReturnType<typeof vi.fn>;
const mockCreateBankAccount = useCreateBankAccountMutation as ReturnType<typeof vi.fn>;
const mockUpdateBankAccount = useUpdateBankAccountMutation as ReturnType<typeof vi.fn>;
const mockSetDefault = useSetDefaultBankAccountMutation as ReturnType<typeof vi.fn>;
const mockDelete = useDeleteBankAccountMutation as ReturnType<typeof vi.fn>;

/* ── Sample data ──────────────────────────────────────────────────────────── */
const MOCK_ACCOUNTS: BankAccount[] = [
  {
    id: 1,
    bankName: 'MB Bank',
    accountNumberMasked: '**** **** 1234',
    accountHolder: 'NGUYEN VAN A',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    bankName: 'Vietcombank',
    accountNumberMasked: '**** **** 8890',
    accountHolder: 'NGUYEN VAN A',
    isDefault: false,
    createdAt: '2026-01-02T00:00:00Z',
  },
];

/* ── Mutation fn stubs ────────────────────────────────────────────────────── */
const mockCreateFn = vi.fn();
const mockUpdateFn = vi.fn();
const mockSetDefaultFn = vi.fn();
const mockDeleteFn = vi.fn();

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function makeStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (gDM) => gDM().concat(baseApi.middleware),
  });
}

function renderPage() {
  return render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <VendorSettingsPage />
      </MemoryRouter>
    </Provider>,
  );
}

/* ── Setup ───────────────────────────────────────────────────────────────── */
beforeEach(() => {
  vi.clearAllMocks();

  mockGetBankAccounts.mockReturnValue({
    data: MOCK_ACCOUNTS,
    isLoading: false,
    isError: false,
  });

  mockCreateFn.mockReturnValue({
    unwrap: () =>
      Promise.resolve({
        id: 3,
        bankName: 'Techcombank',
        accountNumberMasked: '**** 9999',
        accountHolder: 'NGUYEN VAN B',
        isDefault: false,
        createdAt: '2026-06-22T00:00:00Z',
      }),
  });
  mockCreateBankAccount.mockReturnValue([mockCreateFn, { isLoading: false }]);

  mockUpdateFn.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  mockUpdateBankAccount.mockReturnValue([mockUpdateFn, { isLoading: false }]);

  mockSetDefaultFn.mockReturnValue({ unwrap: () => Promise.resolve({}) });
  mockSetDefault.mockReturnValue([mockSetDefaultFn, { isLoading: false }]);

  mockDeleteFn.mockReturnValue({ unwrap: () => Promise.resolve(null) });
  mockDelete.mockReturnValue([mockDeleteFn, { isLoading: false }]);
});

/* ── Tests ───────────────────────────────────────────────────────────────── */
describe('VendorSettingsPage', () => {
  it('renders page title "Cài đặt shop"', () => {
    renderPage();
    expect(screen.getByTestId('shell-title')).toHaveTextContent('Cài đặt shop');
  });

  it('renders bank list with masked account numbers (not full numbers)', () => {
    renderPage();
    // accountNumberMasked shown as-is
    expect(screen.getByText(/\*{4} \*{4} 1234/)).toBeInTheDocument();
    expect(screen.getByText(/\*{4} \*{4} 8890/)).toBeInTheDocument();
    // Full account numbers should NOT appear
    const content = document.body.textContent ?? '';
    expect(content).not.toMatch(/(?<!\*)\d{10,}/);
  });

  it('renders bank names', () => {
    renderPage();
    expect(screen.getByText('MB Bank')).toBeInTheDocument();
    expect(screen.getByText('Vietcombank')).toBeInTheDocument();
  });

  it('renders "Mặc định" badge for default account', () => {
    renderPage();
    expect(screen.getByText('Mặc định')).toBeInTheDocument();
  });

  it('renders account holders', () => {
    renderPage();
    const holders = screen.getAllByText(/NGUYEN VAN A/);
    expect(holders.length).toBeGreaterThanOrEqual(2);
  });

  it('renders "Đặt mặc định" button only for non-default accounts', () => {
    renderPage();
    const btns = screen.getAllByText('Đặt mặc định');
    // Only 1 account is non-default
    expect(btns.length).toBe(1);
  });

  it('renders "Sửa" and "Xóa" buttons for each account', () => {
    renderPage();
    expect(screen.getAllByText('Sửa').length).toBe(2);
    expect(screen.getAllByText('Xóa').length).toBe(2);
  });

  it('note "Thông tin cửa hàng — bản sau" is shown', () => {
    renderPage();
    expect(screen.getByText(/Thông tin cửa hàng — bản sau/)).toBeInTheDocument();
  });

  describe('empty state', () => {
    it('renders CTA add button when no accounts', () => {
      mockGetBankAccounts.mockReturnValue({ data: [], isLoading: false, isError: false });
      renderPage();
      expect(screen.getByText(/Chưa có tài khoản ngân hàng/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /thêm tài khoản ngân hàng/i })).toBeInTheDocument();
    });
  });

  describe('open modal', () => {
    it('clicking "+ Thêm tài khoản ngân hàng" opens BankAccountFormModal', () => {
      renderPage();
      const addBtn = screen.getByText('+ Thêm tài khoản ngân hàng');
      fireEvent.click(addBtn);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Thêm tài khoản ngân hàng')).toBeInTheDocument();
    });

    it('modal shows Ngân hàng select, Số tài khoản input, Tên chủ tài khoản input', () => {
      renderPage();
      fireEvent.click(screen.getByText('+ Thêm tài khoản ngân hàng'));
      expect(screen.getByLabelText('Ngân hàng')).toBeInTheDocument();
      expect(screen.getByLabelText('Số tài khoản')).toBeInTheDocument();
      expect(screen.getByLabelText('Tên chủ tài khoản')).toBeInTheDocument();
    });

    it('modal closes when Hủy button is clicked', () => {
      renderPage();
      fireEvent.click(screen.getByText('+ Thêm tài khoản ngân hàng'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('submit createBankAccount', () => {
    it('calls createBankAccount with correct input on form submit', async () => {
      renderPage();
      fireEvent.click(screen.getByText('+ Thêm tài khoản ngân hàng'));

      // Select bank (default is Vietcombank)
      const bankSelect = screen.getByLabelText('Ngân hàng') as HTMLSelectElement;
      fireEvent.change(bankSelect, { target: { value: 'Techcombank' } });

      // Fill account number
      const accountInput = screen.getByLabelText('Số tài khoản');
      fireEvent.change(accountInput, { target: { value: '0123456789' } });

      // Fill account holder
      const holderInput = screen.getByLabelText('Tên chủ tài khoản');
      fireEvent.change(holderInput, { target: { value: 'nguyen van b' } });

      // Submit
      fireEvent.click(screen.getByRole('button', { name: /lưu tài khoản/i }));

      await waitFor(() => {
        expect(mockCreateFn).toHaveBeenCalledWith(
          expect.objectContaining({
            bankName: 'Techcombank',
            accountNumber: '0123456789',
            accountHolder: 'NGUYEN VAN B', // auto-uppercased
          }),
        );
      });
    });

    it('does NOT call createBankAccount if account number is empty', async () => {
      renderPage();
      fireEvent.click(screen.getByText('+ Thêm tài khoản ngân hàng'));

      const holderInput = screen.getByLabelText('Tên chủ tài khoản');
      fireEvent.change(holderInput, { target: { value: 'NGUYEN VAN A' } });

      // Leave account number empty, submit
      fireEvent.click(screen.getByRole('button', { name: /lưu tài khoản/i }));

      await waitFor(() => {
        expect(mockCreateFn).not.toHaveBeenCalled();
      });
    });
  });

  describe('"Đặt mặc định" button', () => {
    it('calls setDefaultBankAccount with correct id', async () => {
      renderPage();
      // Account id=2 is non-default
      const setDefaultBtn = screen.getByRole('button', { name: /đặt mặc định vietcombank/i });
      fireEvent.click(setDefaultBtn);

      await waitFor(() => {
        expect(mockSetDefaultFn).toHaveBeenCalledWith(2);
      });
    });
  });

  describe('"Xóa" button', () => {
    it('calls deleteBankAccount with correct id', async () => {
      renderPage();
      // Click "Xóa" for account id=1 (MB Bank, Mặc định)
      const deleteBtn = screen.getByRole('button', { name: /xóa mb bank/i });
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(mockDeleteFn).toHaveBeenCalledWith(1);
      });
    });

    it('shows server error message when delete fails (e.g. BANK_ACCOUNT_IN_USE)', async () => {
      mockDeleteFn.mockReturnValue({
        unwrap: () => Promise.reject({ message: 'Tài khoản đang được sử dụng trong giao dịch đang xử lý.' }),
      });
      renderPage();

      const deleteBtn = screen.getByRole('button', { name: /xóa mb bank/i });
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(
          screen.getByText(/Tài khoản đang được sử dụng trong giao dịch đang xử lý/i),
        ).toBeInTheDocument();
      });
    });
  });

  describe('edit mode', () => {
    it('clicking "Sửa" opens modal in edit mode (title "Sửa tài khoản ngân hàng")', () => {
      renderPage();
      const editBtns = screen.getAllByText('Sửa');
      fireEvent.click(editBtns[0]);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Sửa tài khoản ngân hàng')).toBeInTheDocument();
    });

    it('edit modal does NOT show Số tài khoản field', () => {
      renderPage();
      fireEvent.click(screen.getAllByText('Sửa')[0]);
      expect(screen.queryByLabelText('Số tài khoản')).not.toBeInTheDocument();
    });

    it('edit modal prefills bankName', () => {
      renderPage();
      fireEvent.click(screen.getAllByText('Sửa')[0]); // MB Bank account
      const bankSelect = screen.getByLabelText('Ngân hàng') as HTMLSelectElement;
      expect(bankSelect.value).toBe('MB Bank');
    });
  });
});
