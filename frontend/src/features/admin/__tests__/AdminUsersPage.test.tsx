/**
 * AdminUsersPage tests — TDD RED phase
 * Tests written BEFORE implementation per TDD discipline.
 *
 * Coverage:
 *  1. Page renders a table of users from mocked getAdminUsers (email + role/status badge).
 *  2. transformResponse reads the array+meta shape correctly (contract lock).
 *  3. Changing role filter updates query args.
 *  4. Changing status filter updates query args.
 *  5. Clicking "Khóa" calls updateUserStatus with {id, status:'locked'}.
 *  6. Lock error (409 ADMIN_CANNOT_LOCK_SELF) shows a friendly message.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';
import type { EnvelopeMeta } from '../../../shared/api/baseApi';

// ── We mock the RTK Query hooks so tests stay unit-level ─────────────────────
const mockGetAdminUsers = vi.fn();
const mockUnwrap = vi.fn();

vi.mock('../adminApi', async () => {
  const actual = await vi.importActual<typeof import('../adminApi')>('../adminApi');
  return {
    ...actual,
    useGetAdminUsersQuery: (...args: unknown[]) => mockGetAdminUsers(...args),
    useUpdateUserStatusMutation: () => [
      (...args: unknown[]) => ({ unwrap: () => mockUnwrap(...args) }),
      {},
    ],
  };
});

// ── Sample data ───────────────────────────────────────────────────────────────
const MOCK_USERS = [
  {
    id: 1,
    email: 'alice@example.com',
    fullName: 'Alice Nguyen',
    role: 'user' as const,
    status: 'active' as const,
    phone: null,
    createdAt: '2024-01-15T08:00:00.000Z',
    emailVerifiedAt: '2024-01-15T08:05:00.000Z',
  },
  {
    id: 2,
    email: 'bob@example.com',
    fullName: 'Bob Tran',
    role: 'vendor' as const,
    status: 'locked' as const,
    phone: '0912345678',
    createdAt: '2024-02-10T10:00:00.000Z',
    emailVerifiedAt: null,
  },
  {
    id: 3,
    email: 'charlie@example.com',
    fullName: 'Charlie Le',
    role: 'admin' as const,
    status: 'active' as const,
    phone: null,
    createdAt: '2024-03-01T12:00:00.000Z',
    emailVerifiedAt: '2024-03-01T12:10:00.000Z',
  },
];

const MOCK_PAGINATION = { page: 1, limit: 20, total: 3, totalPages: 1 };
const MOCK_STATS = { total: 3, active: 2, locked: 1, pending: 0 };

// ── Store factory ─────────────────────────────────────────────────────────────
const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

// ── Render helper ─────────────────────────────────────────────────────────────
const renderPage = async () => {
  // Lazy import so the vi.mock above is in effect
  const { AdminUsersPage } = await import('../pages/AdminUsersPage');
  return render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <AdminUsersPage />
      </MemoryRouter>
    </Provider>,
  );
};

// ── Setup default mock ────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockGetAdminUsers.mockReturnValue({
    data: { users: MOCK_USERS, pagination: MOCK_PAGINATION, stats: MOCK_STATS },
    isFetching: false,
    isLoading: false,
  });
  mockUnwrap.mockResolvedValue({ id: 1, status: 'locked' });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Renders table with user rows
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminUsersPage — render', () => {
  it('renders the page heading "Quản lý người dùng"', async () => {
    await renderPage();
    expect(screen.getByText('Quản lý người dùng')).toBeInTheDocument();
  });

  it('renders email and full name for each user', async () => {
    await renderPage();
    expect(screen.getByText('alice@example.com')).toBeInTheDocument();
    expect(screen.getByText('Alice Nguyen')).toBeInTheDocument();
    expect(screen.getByText('bob@example.com')).toBeInTheDocument();
    expect(screen.getByText('Bob Tran')).toBeInTheDocument();
  });

  it('renders role badge for each user', async () => {
    await renderPage();
    // role badge text also appears in dropdown options, so use getAllByText
    expect(screen.getAllByText('User').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Vendor').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Admin').length).toBeGreaterThan(0);
  });

  it('renders status badge for active/locked users', async () => {
    await renderPage();
    // "Hoạt động" for active, "Bị khóa" for locked
    // Note: "Hoạt động" and "Bị khóa" also appear in the dropdown options, so use getAllByText
    expect(screen.getAllByText('Hoạt động').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bị khóa').length).toBeGreaterThan(0);
  });

  it('renders stat chips with real backend stats values', async () => {
    await renderPage();
    // Chip labels — "Tổng" appears only once; "Hoạt động" and "Bị khóa" also appear
    // in status badges and dropdown options, so use getAllByText for those.
    expect(screen.getByText('Tổng')).toBeInTheDocument();
    expect(screen.getAllByText('Hoạt động').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bị khóa').length).toBeGreaterThan(0);
    // MOCK_STATS: total=3, active=2, locked=1.
    // Numbers may appear elsewhere (pagination), so use getAllByText.
    expect(screen.getAllByText('3').length).toBeGreaterThan(0); // total chip value
    expect(screen.getAllByText('2').length).toBeGreaterThan(0); // active chip value
    expect(screen.getAllByText('1').length).toBeGreaterThan(0); // locked chip value
  });

  it('renders Lock button for active users', async () => {
    await renderPage();
    // alice (active) should have a "Khóa" button
    const lockButtons = screen.getAllByText('Khóa');
    expect(lockButtons.length).toBeGreaterThan(0);
  });

  it('renders Unlock button for locked users', async () => {
    await renderPage();
    // bob (locked) should have an "Mở khóa" button
    expect(screen.getByText('Mở khóa')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. transformResponse contract lock — tests the REAL shape
//    Uses the exported transformAdminUsersResponse function directly so we can
//    verify the array + meta reading logic without RTK Query internals.
// ─────────────────────────────────────────────────────────────────────────────
describe('adminApi.getAdminUsers transformResponse — contract lock', () => {
  it('reads the array from envelope data and meta.pagination correctly', async () => {
    // Import the real (un-mocked) transformAdminUsersResponse
    // vi.mock only mocks the hooks, not the named export
    const { transformAdminUsersResponse } = await import('../adminApi');

    // Simulate what baseApi rawBaseQuery returns after envelope unwrap:
    //   data = res.data.data (the users array)
    //   meta = res.data.meta ({ pagination })
    const envelopeData = MOCK_USERS;
    const envelopeMeta: EnvelopeMeta = { pagination: MOCK_PAGINATION, stats: MOCK_STATS };

    const result = transformAdminUsersResponse(envelopeData as never, envelopeMeta);

    expect(Array.isArray(result.users)).toBe(true);
    expect(result.users).toHaveLength(3);
    expect(result.users[0].email).toBe('alice@example.com');
    expect(result.pagination.total).toBe(3);
    expect(result.pagination.totalPages).toBe(1);
    // Stats from meta
    expect(result.stats.total).toBe(3);
    expect(result.stats.active).toBe(2);
    expect(result.stats.locked).toBe(1);
    expect(result.stats.pending).toBe(0);
  });

  it('handles non-array data gracefully (returns empty users)', async () => {
    const { transformAdminUsersResponse } = await import('../adminApi');
    const result = transformAdminUsersResponse(null as never, undefined);
    expect(result.users).toEqual([]);
    expect(result.pagination.total).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Role filter changes query args
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminUsersPage — role filter', () => {
  it('calls getAdminUsers with role param when role filter changes', async () => {
    await renderPage();
    const roleSelect = screen.getByLabelText('Lọc vai trò');
    fireEvent.change(roleSelect, { target: { value: 'vendor' } });
    await waitFor(() => {
      expect(mockGetAdminUsers).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'vendor' }),
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Status filter changes query args
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminUsersPage — status filter', () => {
  it('calls getAdminUsers with status param when status filter changes', async () => {
    await renderPage();
    const statusSelect = screen.getByLabelText('Lọc trạng thái');
    fireEvent.change(statusSelect, { target: { value: 'locked' } });
    await waitFor(() => {
      expect(mockGetAdminUsers).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'locked' }),
      );
    });
  });

  it('passes status=pending when "Chưa xác thực" is selected', async () => {
    await renderPage();
    const statusSelect = screen.getByLabelText('Lọc trạng thái');
    fireEvent.change(statusSelect, { target: { value: 'pending' } });
    await waitFor(() => {
      expect(mockGetAdminUsers).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'pending' }),
      );
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Lock action calls updateUserStatus
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminUsersPage — lock action', () => {
  it('clicking Khóa then confirming calls updateUserStatus with {id, status:"locked"}', async () => {
    const user = userEvent.setup();
    await renderPage();

    // Find the Lock button for alice (id=1, active)
    const lockButtons = screen.getAllByText('Khóa');
    await user.click(lockButtons[0]);

    // Confirm dialog should appear
    const confirmBtn = await screen.findByRole('button', { name: /Xác nhận/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockUnwrap).toHaveBeenCalledWith({ id: 1, status: 'locked' });
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Lock error (ADMIN_CANNOT_LOCK_SELF) shows friendly toast
// ─────────────────────────────────────────────────────────────────────────────
describe('AdminUsersPage — lock error handling', () => {
  it('shows friendly message on ADMIN_CANNOT_LOCK_SELF error (409)', async () => {
    mockUnwrap.mockRejectedValueOnce({
      code: 'ADMIN_CANNOT_LOCK_SELF',
      message: 'Không thể khóa chính mình',
      status: 409,
    });

    const user = userEvent.setup();
    await renderPage();

    const lockButtons = screen.getAllByText('Khóa');
    await user.click(lockButtons[0]);

    const confirmBtn = await screen.findByRole('button', { name: /Xác nhận/i });
    await user.click(confirmBtn);

    // A friendly toast should show the exact message from the handler
    await waitFor(() => {
      expect(screen.getByText(/không thể khóa chính mình/i)).toBeInTheDocument();
    });
  });

  it('shows friendly message on AUTH_FORBIDDEN error (403)', async () => {
    mockUnwrap.mockRejectedValueOnce({
      code: 'AUTH_FORBIDDEN',
      message: 'Không thể khóa admin khác',
      status: 403,
    });

    const user = userEvent.setup();
    await renderPage();

    // charlie (admin, active) — find the lock button in the admin row
    const lockButtons = screen.getAllByText('Khóa');
    await user.click(lockButtons[lockButtons.length - 1]); // last active user (charlie)

    const confirmBtn = await screen.findByRole('button', { name: /Xác nhận/i });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(screen.getByText(/không thể khóa tài khoản admin khác/i)).toBeInTheDocument();
    });
  });
});
