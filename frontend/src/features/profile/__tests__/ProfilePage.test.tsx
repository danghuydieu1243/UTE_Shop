import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProfilePage } from '../pages/ProfilePage';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';

/* ── Mocks ────────────────────────────────────────────────────── */
vi.mock('../../auth/authApi', () => ({
  useGetMeQuery: vi.fn(),
  useLogoutMutation: vi.fn(() => [vi.fn(), {}]),
}));

vi.mock('../../loyalty/loyaltyApi', () => ({
  useGetLoyaltyQuery: vi.fn(),
}));

vi.mock('../components/ProfileEditForm', () => ({
  ProfileEditForm: () => <div data-testid="profile-edit-form">Profile Form</div>,
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => vi.fn() };
});

import { useGetMeQuery } from '../../auth/authApi';
import { useGetLoyaltyQuery } from '../../loyalty/loyaltyApi';

const mockUseGetMeQuery = useGetMeQuery as ReturnType<typeof vi.fn>;
const mockUseGetLoyaltyQuery = useGetLoyaltyQuery as ReturnType<typeof vi.fn>;

/* ── Store & render helpers ──────────────────────────────────── */
const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

const renderPage = () =>
  render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    </Provider>,
  );

/* ── Tests ────────────────────────────────────────────────────── */
describe('ProfilePage loyalty balance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseGetMeQuery.mockReturnValue({
      data: { fullName: 'Nguyễn Văn A', email: 'user@test.com', role: 'user' },
      isLoading: false,
      isError: false,
    });
  });

  it('shows loyalty balance when data is loaded', () => {
    mockUseGetLoyaltyQuery.mockReturnValue({
      data: { balance: 350, transactions: [] },
      isLoading: false,
    });
    renderPage();
    expect(screen.getByText(/350/)).toBeInTheDocument();
    expect(screen.getByText(/điểm thưởng/i)).toBeInTheDocument();
  });

  it('shows 0 when loyalty balance is 0', () => {
    mockUseGetLoyaltyQuery.mockReturnValue({
      data: { balance: 0, transactions: [] },
      isLoading: false,
    });
    renderPage();
    // "0" may appear multiple times — just ensure điểm thưởng label is present
    expect(screen.getByText(/điểm thưởng/i)).toBeInTheDocument();
    // The balance value "0" appears at minimum once
    const zeroEls = screen.getAllByText(/0/);
    expect(zeroEls.length).toBeGreaterThanOrEqual(1);
  });

  it('does not show loyalty section while loading', () => {
    mockUseGetLoyaltyQuery.mockReturnValue({
      data: undefined,
      isLoading: true,
    });
    renderPage();
    expect(screen.queryByText(/điểm thưởng/i)).not.toBeInTheDocument();
  });
});
