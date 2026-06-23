/** VendorWalletPage.test.tsx — Phase 6c, Task 4.
 *  Mocks RTK Query hooks; tests: render balance, chart, transactions,
 *  open WithdrawModal, validate <100k blocks submit, valid submit calls createWithdrawal.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';
import { VendorWalletPage } from '../pages/VendorWalletPage';
import type { WalletData, BankAccount } from '../types';

/* ── Mocks ───────────────────────────────────────────────────────────────── */
vi.mock('../walletApi', () => ({
  useGetWalletQuery: vi.fn(),
  useCreateWithdrawalMutation: vi.fn(),
}));

vi.mock('../bankAccountsApi', () => ({
  useGetBankAccountsQuery: vi.fn(),
}));

vi.mock('../../vendor/components/VendorShell', () => ({
  VendorShell: ({
    title,
    actions,
    children,
  }: {
    title: React.ReactNode;
    actions?: React.ReactNode;
    children: React.ReactNode;
  }) => (
    <div>
      <div data-testid="shell-title">{title}</div>
      <div data-testid="shell-actions">{actions}</div>
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

import { useGetWalletQuery, useCreateWithdrawalMutation } from '../walletApi';
import { useGetBankAccountsQuery } from '../bankAccountsApi';

const mockGetWallet = useGetWalletQuery as ReturnType<typeof vi.fn>;
const mockGetBankAccounts = useGetBankAccountsQuery as ReturnType<typeof vi.fn>;
const mockCreateWithdrawal = useCreateWithdrawalMutation as ReturnType<typeof vi.fn>;

/* ── Sample data ──────────────────────────────────────────────────────────── */
const MOCK_WALLET: WalletData = {
  availableBalance: 3_500_000,
  pendingBalance: 500_000,
  totalWithdrawn: 1_000_000,
  monthlySeries: [
    { month: '2026-04', value: 800_000 },
    { month: '2026-05', value: 1_200_000 },
    { month: '2026-06', value: 1_500_000 },
  ],
  transactions: [
    {
      id: 1,
      type: 'sale',
      amount: 90_000,
      description: 'Bán "Clean Code"',
      status: 'completed',
      createdAt: '2026-06-01T10:00:00Z',
    },
    {
      id: 2,
      type: 'withdrawal',
      amount: 500_000,
      description: 'Rút tiền về TK **** 1234',
      status: 'pending',
      createdAt: '2026-06-02T10:00:00Z',
    },
  ],
  pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
};

const MOCK_ACCOUNTS: BankAccount[] = [
  {
    id: 1,
    bankName: 'Vietcombank',
    accountNumberMasked: '**** 5678',
    accountHolder: 'Nguyen Van A',
    isDefault: true,
    createdAt: '2026-01-01T00:00:00Z',
  },
];

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
        <VendorWalletPage />
      </MemoryRouter>
    </Provider>,
  );
}

/* ── Setup ───────────────────────────────────────────────────────────────── */
const mockWithdrawFn = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  mockGetWallet.mockReturnValue({ data: MOCK_WALLET, isLoading: false, isError: false });
  mockGetBankAccounts.mockReturnValue({ data: MOCK_ACCOUNTS, isLoading: false });
  mockCreateWithdrawal.mockReturnValue([
    mockWithdrawFn,
    { isLoading: false },
  ]);
  mockWithdrawFn.mockReturnValue({ unwrap: () => Promise.resolve({ id: 10, amount: 200_000, status: 'pending', bankAccountId: 1, requestedAt: '2026-06-22T00:00:00Z' }) });
});

/* ── Tests ───────────────────────────────────────────────────────────────── */
describe('VendorWalletPage', () => {
  it('renders "Ví & Doanh thu" as page title', () => {
    renderPage();
    expect(screen.getByTestId('shell-title')).toHaveTextContent('Ví & Doanh thu');
  });

  it('renders formatted availableBalance', () => {
    renderPage();
    // 3_500_000 → "3.500.000đ"
    expect(screen.getByTestId('available-balance')).toHaveTextContent('3.500.000đ');
  });

  it('renders pendingBalance', () => {
    renderPage();
    expect(screen.getByTestId('pending-balance')).toHaveTextContent('500.000đ');
  });

  it('renders totalWithdrawn', () => {
    renderPage();
    expect(screen.getByTestId('total-withdrawn')).toHaveTextContent('1.000.000đ');
  });

  it('renders BarChart SVG for monthly revenue', () => {
    const { container } = renderPage();
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('renders transaction description in table', () => {
    renderPage();
    expect(screen.getByText('Bán "Clean Code"')).toBeInTheDocument();
  });

  it('renders transaction type label', () => {
    renderPage();
    const items = screen.getAllByText('Doanh thu');
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it('renders Rút tiền button in shell actions', () => {
    renderPage();
    const actions = screen.getByTestId('shell-actions');
    expect(actions).toHaveTextContent('Rút tiền');
  });

  it('opens WithdrawModal on Rút tiền button click', () => {
    renderPage();
    // The withdraw button is inside shell-actions (not the tab button)
    const actions = screen.getByTestId('shell-actions');
    const btn = actions.querySelector('button') as HTMLButtonElement;
    fireEvent.click(btn);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockGetWallet.mockReturnValue({ data: undefined, isLoading: true, isError: false });
    renderPage();
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  describe('WithdrawModal', () => {
    function openModal() {
      renderPage();
      // Click the withdraw button inside shell-actions (not the tab filter button)
      const actions = screen.getByTestId('shell-actions');
      const btn = actions.querySelector('button') as HTMLButtonElement;
      fireEvent.click(btn);
    }

    it('shows dialog with available balance info', () => {
      openModal();
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      // The modal shows the available balance inside the dialog element
      const balanceItems = screen.getAllByText('3.500.000đ');
      expect(balanceItems.length).toBeGreaterThanOrEqual(1);
    });

    it('blocks submit when amount < 100.000đ', async () => {
      openModal();
      const input = screen.getByLabelText('Số tiền rút');
      fireEvent.change(input, { target: { value: '50000' } });

      const submitBtn = screen.getByRole('button', { name: /xác nhận rút/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/tối thiểu/i)).toBeInTheDocument();
      });
      expect(mockWithdrawFn).not.toHaveBeenCalled();
    });

    it('calls createWithdrawal on valid submit', async () => {
      openModal();
      const input = screen.getByLabelText('Số tiền rút');
      fireEvent.change(input, { target: { value: '200000' } });

      const submitBtn = screen.getByRole('button', { name: /xác nhận rút/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(mockWithdrawFn).toHaveBeenCalledWith({
          amount: 200_000,
          bankAccountId: 1,
        });
      });
    });

    it('50% shortcut sets half of availableBalance', () => {
      openModal();
      const shortcutBtn = screen.getByRole('button', { name: '50%' });
      fireEvent.click(shortcutBtn);
      const input = screen.getByLabelText('Số tiền rút') as HTMLInputElement;
      expect(Number(input.value)).toBe(1_750_000);
    });

    it('Tối đa shortcut sets full availableBalance', () => {
      openModal();
      const shortcutBtn = screen.getByRole('button', { name: 'Tối đa' });
      fireEvent.click(shortcutBtn);
      const input = screen.getByLabelText('Số tiền rút') as HTMLInputElement;
      expect(Number(input.value)).toBe(3_500_000);
    });

    it('shows empty bank account message + link when no accounts', () => {
      mockGetBankAccounts.mockReturnValue({ data: [], isLoading: false });
      openModal();
      expect(screen.getByText(/chưa có tài khoản ngân hàng/i)).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /thêm ngay/i })).toBeInTheDocument();
    });
  });
});
