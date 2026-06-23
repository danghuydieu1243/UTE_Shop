/** AdminDashboardPage.test.tsx — Phase 6b, Task 5.
 *  Tests role-based revenue hiding: admin sees revenue KPI/chart/column; manager does not.
 *  Uses real store with preloaded auth state + mocked RTK Query hook.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';
import type { AdminDashboard } from '../types';
import { AdminDashboardPage } from '../../admin/pages/AdminDashboardPage';

// ── Mock RTK Query hook ────────────────────────────────────────────────────────
const mockGetAdminDashboard = vi.fn();

vi.mock('../analyticsApi', async () => {
  const actual = await vi.importActual<typeof import('../analyticsApi')>('../analyticsApi');
  return {
    ...actual,
    useGetAdminDashboardQuery: (...args: unknown[]) => mockGetAdminDashboard(...args),
  };
});

// ── Sample data ───────────────────────────────────────────────────────────────
const ADMIN_DATA: AdminDashboard = {
  kpis: {
    totalUsers: 1_248,
    totalVendors: 37,
    orders: 412,
    revenue: 18_450_000,
  },
  revenueSeries: [
    { date: '2026-06-01', value: 2_000_000 },
    { date: '2026-06-15', value: 5_500_000 },
    { date: '2026-06-30', value: 10_950_000 },
  ],
  newUsersSeries: [
    { date: '2026-06-01', count: 12 },
    { date: '2026-06-15', count: 25 },
    { date: '2026-06-30', count: 18 },
  ],
  topBooks: [
    {
      bookId: 1,
      title: 'Clean Code',
      vendorShop: 'Tech Books VN',
      fileFormat: 'pdf',
      revenue: 4_500_000,
      sold: 50,
    },
    {
      bookId: 2,
      title: 'Refactoring',
      vendorShop: 'Dev Store',
      fileFormat: 'epub',
      revenue: 2_970_000,
      sold: 33,
    },
  ],
  recentOrders: [
    {
      code: 'ORD-001',
      buyer: 'Nguyễn Văn A',
      total: 90_000,
      status: 'COMPLETED',
      createdAt: '2026-06-01T03:30:00Z',
    },
    {
      code: 'ORD-002',
      buyer: 'Trần Thị B',
      total: 180_000,
      status: 'NEW',
      createdAt: '2026-06-02T10:00:00Z',
    },
  ],
};

// Manager data: revenue fields all null/empty as BE strips them
const MANAGER_DATA: AdminDashboard = {
  kpis: {
    totalUsers: 1_248,
    totalVendors: 37,
    orders: 412,
    revenue: null,
  },
  revenueSeries: null,
  newUsersSeries: [
    { date: '2026-06-01', count: 12 },
    { date: '2026-06-15', count: 25 },
  ],
  topBooks: [
    {
      bookId: 1,
      title: 'Clean Code',
      vendorShop: 'Tech Books VN',
      fileFormat: 'pdf',
      revenue: null,
      sold: 50,
    },
  ],
  recentOrders: [
    {
      code: 'ORD-001',
      buyer: 'Nguyễn Văn A',
      total: 90_000,
      status: 'COMPLETED',
      createdAt: '2026-06-01T03:30:00Z',
    },
  ],
};

// ── Store factories ────────────────────────────────────────────────────────────
function makeStoreWithRole(role: 'admin' | 'manager') {
  return configureStore({
    reducer: {
      auth: authReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (gDM) => gDM().concat(baseApi.middleware),
    preloadedState: {
      auth: {
        accessToken: 'test-token',
        refreshToken: 'test-refresh',
        user: {
          id: 1,
          email: `${role}@uteshop.com`,
          role,
          fullName: role === 'admin' ? 'Admin User' : 'Manager User',
          status: 'active',
        },
      },
    },
  });
}

function renderAs(role: 'admin' | 'manager') {
  return render(
    <Provider store={makeStoreWithRole(role)}>
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    </Provider>,
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('AdminDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Basic render ───────────────────────────────────────────────────────────
  it('renders "Tổng quan hệ thống" heading', () => {
    mockGetAdminDashboard.mockReturnValue({ data: ADMIN_DATA, isLoading: false });
    renderAs('admin');
    expect(screen.getByRole('heading', { name: /Tổng quan hệ thống/i })).toBeInTheDocument();
  });

  it('renders KPI: totalUsers', () => {
    mockGetAdminDashboard.mockReturnValue({ data: ADMIN_DATA, isLoading: false });
    renderAs('admin');
    expect(screen.getByText('1248')).toBeInTheDocument();
  });

  it('renders KPI: totalVendors', () => {
    mockGetAdminDashboard.mockReturnValue({ data: ADMIN_DATA, isLoading: false });
    renderAs('admin');
    expect(screen.getByText('37')).toBeInTheDocument();
  });

  it('renders KPI: orders', () => {
    mockGetAdminDashboard.mockReturnValue({ data: ADMIN_DATA, isLoading: false });
    renderAs('admin');
    expect(screen.getByText('412')).toBeInTheDocument();
  });

  it('shows loading state while isLoading is true', () => {
    mockGetAdminDashboard.mockReturnValue({ data: undefined, isLoading: true });
    renderAs('admin');
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('shows error state (not blank) when query errors', () => {
    mockGetAdminDashboard.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch: vi.fn() });
    renderAs('admin');
    expect(screen.getByTestId('error')).toBeInTheDocument();
    expect(screen.getByText(/Không tải được/i)).toBeInTheDocument();
  });

  it('changing period dropdown calls query with the new period value', () => {
    mockGetAdminDashboard.mockReturnValue({ data: ADMIN_DATA, isLoading: false });
    renderAs('admin');
    const select = screen.getByRole('combobox', { name: /khoảng thời gian/i });
    const callsBefore = mockGetAdminDashboard.mock.calls.length;
    fireEvent.change(select, { target: { value: '7d' } });
    expect(mockGetAdminDashboard.mock.calls.length).toBeGreaterThan(callsBefore);
    expect(mockGetAdminDashboard.mock.calls.at(-1)?.[0]).toBe('7d');
  });

  // ── Admin role ─────────────────────────────────────────────────────────────
  describe('role: admin', () => {
    beforeEach(() => {
      mockGetAdminDashboard.mockReturnValue({ data: ADMIN_DATA, isLoading: false });
    });

    it('shows "Doanh thu (kỳ)" KPI card with formatted revenue', () => {
      renderAs('admin');
      expect(screen.getByText('Doanh thu (kỳ)')).toBeInTheDocument();
      // 18_450_000 → "18.450.000đ"
      expect(screen.getByText('18.450.000đ')).toBeInTheDocument();
    });

    it('renders revenue LineAreaChart (SVG path present)', () => {
      const { container } = renderAs('admin');
      const svgs = container.querySelectorAll('svg');
      // Both revenue chart and newUsers chart should be present → at least 2 SVGs
      expect(svgs.length).toBeGreaterThanOrEqual(2);
      expect(container.querySelector('path')).not.toBeNull();
    });

    it('renders "Doanh thu" column header trong bảng Top Sách (scope đúng table header)', () => {
      renderAs('admin');
      const tableHeaders = screen.queryAllByRole('columnheader');
      const revenueHeader = tableHeaders.find((th) => th.textContent?.includes('Doanh thu'));
      expect(revenueHeader).toBeDefined();
    });

    it('renders top book title and vendor', () => {
      renderAs('admin');
      expect(screen.getByText('Clean Code')).toBeInTheDocument();
      expect(screen.getByText('Tech Books VN')).toBeInTheDocument();
    });

    it('renders fileFormat pill', () => {
      renderAs('admin');
      expect(screen.getByText('PDF')).toBeInTheDocument();
    });

    it('renders recent order code', () => {
      renderAs('admin');
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });

    it('maps UPPERCASE order status to Vietnamese badge label (contract lock)', () => {
      renderAs('admin');
      // status 'COMPLETED' → "Hoàn thành", 'NEW' → "Mới" (KHÔNG hiện token thô)
      expect(screen.getByText('Hoàn thành')).toBeInTheDocument();
      expect(screen.getByText('Mới')).toBeInTheDocument();
      expect(screen.queryByText('COMPLETED')).not.toBeInTheDocument();
    });

    it('renders "Xem tất cả →" link to /admin/orders', () => {
      renderAs('admin');
      const link = screen.getByRole('link', { name: /Xem tất cả/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', '/admin/orders');
    });

    it('renders newUsersSeries BarChart SVG', () => {
      const { container } = renderAs('admin');
      expect(container.querySelector('svg[aria-label="Bar chart"]')).not.toBeNull();
    });
  });

  // ── Manager role ───────────────────────────────────────────────────────────
  describe('role: manager', () => {
    beforeEach(() => {
      mockGetAdminDashboard.mockReturnValue({ data: MANAGER_DATA, isLoading: false });
    });

    it('does NOT render "Doanh thu (kỳ)" KPI card', () => {
      renderAs('manager');
      expect(screen.queryByText('Doanh thu (kỳ)')).not.toBeInTheDocument();
    });

    it('does NOT render revenue LineAreaChart (no line-area SVG path for revenue)', () => {
      const { container } = renderAs('manager');
      // Only one chart SVG (BarChart for newUsers); no LineAreaChart
      const svgs = container.querySelectorAll('svg');
      // Should have exactly 1 SVG (BarChart) — no revenue chart
      expect(svgs.length).toBe(1);
    });

    it('does NOT render "Doanh thu" column header in Top Sách table', () => {
      renderAs('manager');
      // Doanh thu should not appear anywhere (neither as KPI card label nor as table header)
      expect(screen.queryByText('Doanh thu (kỳ)')).not.toBeInTheDocument();
      // The table header specifically
      const tableHeaders = screen.queryAllByRole('columnheader');
      const revenueHeader = tableHeaders.find((th) => th.textContent?.includes('Doanh thu'));
      expect(revenueHeader).toBeUndefined();
    });

    it('still renders KPI: totalUsers, totalVendors, orders', () => {
      renderAs('manager');
      expect(screen.getByText('Tổng người dùng')).toBeInTheDocument();
      expect(screen.getByText('Tổng Vendor')).toBeInTheDocument();
      expect(screen.getByText('Đơn hàng (kỳ)')).toBeInTheDocument();
    });

    it('still renders BarChart for newUsersSeries', () => {
      const { container } = renderAs('manager');
      // Manager sees newUsers BarChart but NOT revenue LineAreaChart
      expect(container.querySelector('svg[aria-label="Bar chart"]')).not.toBeNull();
      // Only 1 SVG (BarChart) — no revenue LineAreaChart
      expect(container.querySelectorAll('svg').length).toBe(1);
    });

    it('still renders recentOrders', () => {
      renderAs('manager');
      expect(screen.getByText('ORD-001')).toBeInTheDocument();
    });
  });
});
