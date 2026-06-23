/**
 * NotificationsPage tests
 *
 * Coverage:
 *  1. Renders heading "Thông báo".
 *  2. Renders each notification title from mock data.
 *  3. Unread item (readAt=null) has an unread dot/indicator.
 *  4. Clicking an item calls markRead(id).
 *  5. Clicking "Đánh dấu tất cả đã đọc" calls markAllRead.
 *  6. Empty state when notifications list is empty.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';

// ── Mock RTK Query hooks ──────────────────────────────────────────────────────
const mockGetNotifications = vi.fn();
const mockGetUnreadCount = vi.fn();
const mockMarkReadFn = vi.fn();
const mockMarkAllReadFn = vi.fn();

vi.mock('../notificationsApi', async () => {
  const actual = await vi.importActual<typeof import('../notificationsApi')>('../notificationsApi');
  return {
    ...actual,
    useGetNotificationsQuery: (...args: unknown[]) => mockGetNotifications(...args),
    useGetUnreadCountQuery: (...args: unknown[]) => mockGetUnreadCount(...args),
    useMarkReadMutation: () => [mockMarkReadFn, {}],
    useMarkAllReadMutation: () => [mockMarkAllReadFn, {}],
  };
});

// Also mock useGetMeQuery used by AccountShell (indirectly via NotificationsPage)
vi.mock('../../auth/authApi', async () => {
  const actual = await vi.importActual<typeof import('../../auth/authApi')>('../../auth/authApi');
  return {
    ...actual,
    useGetMeQuery: () => ({ data: { fullName: 'Test User', email: 'test@example.com' } }),
    useLogoutMutation: () => [vi.fn(), {}],
  };
});

// ── Sample notification data ──────────────────────────────────────────────────
const MOCK_NOTIFICATIONS = [
  {
    id: 1,
    type: 'order',
    title: 'Đơn hàng #ORD-001 đã hoàn thành',
    body: 'Thanh toán thành công.',
    data: { orderCode: 'ORD-001' },
    readAt: null,
    createdAt: new Date().toISOString(), // hôm nay → group "Hôm nay"
  },
  {
    id: 2,
    type: 'ebook',
    title: 'E-book "Clean Code" đã sẵn sàng tải',
    body: 'Tải về ngay từ thư viện của bạn.',
    data: {},
    readAt: '2026-06-22T08:00:00Z', // đã đọc
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 ngày trước → "Trước đó"
  },
];

const MOCK_PAGINATION = { page: 1, limit: 20, total: 2, totalPages: 1 };

// ── Store factory ─────────────────────────────────────────────────────────────
const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

// ── Render helper ─────────────────────────────────────────────────────────────
const renderPage = async () => {
  const { default: NotificationsPage } = await import('../pages/NotificationsPage');
  return render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <NotificationsPage />
      </MemoryRouter>
    </Provider>,
  );
};

// ── Default mock setup ────────────────────────────────────────────────────────
beforeEach(() => {
  vi.clearAllMocks();
  mockGetNotifications.mockReturnValue({
    data: { notifications: MOCK_NOTIFICATIONS, pagination: MOCK_PAGINATION, unreadCount: 1 },
    isLoading: false,
    isFetching: false,
  });
  mockGetUnreadCount.mockReturnValue({ data: 1 });
  mockMarkReadFn.mockReturnValue({ unwrap: () => Promise.resolve() });
  mockMarkAllReadFn.mockReturnValue({ unwrap: () => Promise.resolve() });
});

// ─────────────────────────────────────────────────────────────────────────────
// 1. Renders heading
// ─────────────────────────────────────────────────────────────────────────────
describe('NotificationsPage — render', () => {
  it('renders page heading "Thông báo"', async () => {
    await renderPage();
    expect(screen.getByRole('heading', { name: 'Thông báo' })).toBeInTheDocument();
  });

  it('renders each notification title', async () => {
    await renderPage();
    expect(screen.getByText('Đơn hàng #ORD-001 đã hoàn thành')).toBeInTheDocument();
    expect(screen.getByText('E-book "Clean Code" đã sẵn sàng tải')).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Unread item has visual indicator
// ─────────────────────────────────────────────────────────────────────────────
describe('NotificationsPage — unread indicator', () => {
  it('unread item has data-unread attribute or aria indicator', async () => {
    await renderPage();
    // Item id=1 is unread (readAt=null)
    const unreadDot = document.querySelector('[data-testid="unread-dot"]');
    expect(unreadDot).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Click item calls markRead(id)
// ─────────────────────────────────────────────────────────────────────────────
describe('NotificationsPage — markRead on click', () => {
  it('clicking an unread notification item calls markRead with its id', async () => {
    await renderPage();
    const titleEl = screen.getByText('Đơn hàng #ORD-001 đã hoàn thành');
    // Click the parent notif-item row
    const itemEl = titleEl.closest('[data-testid="notif-item"]') ?? titleEl.parentElement!;
    fireEvent.click(itemEl);
    await waitFor(() => {
      expect(mockMarkReadFn).toHaveBeenCalledWith(1);
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. Click "Đánh dấu tất cả đã đọc" calls markAllRead
// ─────────────────────────────────────────────────────────────────────────────
describe('NotificationsPage — markAllRead', () => {
  it('clicking "Đánh dấu tất cả đã đọc" calls markAllRead', async () => {
    await renderPage();
    const btn = screen.getByRole('button', { name: /Đánh dấu tất cả đã đọc/i });
    fireEvent.click(btn);
    await waitFor(() => {
      expect(mockMarkAllReadFn).toHaveBeenCalled();
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. Empty state
// ─────────────────────────────────────────────────────────────────────────────
describe('NotificationsPage — empty state', () => {
  it('shows empty state message when notifications list is empty', async () => {
    mockGetNotifications.mockReturnValue({
      data: { notifications: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 }, unreadCount: 0 },
      isLoading: false,
      isFetching: false,
    });
    await renderPage();
    expect(screen.getByText('Bạn chưa có thông báo nào')).toBeInTheDocument();
  });
});
