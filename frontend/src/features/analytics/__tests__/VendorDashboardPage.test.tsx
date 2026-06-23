/** VendorDashboardPage.test.tsx — Phase 6b, Task 4.
 *  Mocks useGetVendorDashboardQuery (unit-level, mirrors VendorBooksPage/admin test idiom).
 *  Coverage: render heading, 4 KPI values, chart svg/path, top books title, recent order code,
 *            period dropdown change calls query with new period.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';
import { VendorDashboardPage } from '../pages/VendorDashboardPage';

// ── Mock RTK Query hook ────────────────────────────────────────────────────────
const mockGetVendorDashboard = vi.fn();

vi.mock('../analyticsApi', async () => {
  const actual = await vi.importActual<typeof import('../analyticsApi')>('../analyticsApi');
  return {
    ...actual,
    useGetVendorDashboardQuery: (...args: unknown[]) => mockGetVendorDashboard(...args),
  };
});

// Mock VendorShell to avoid full sidebar render in tests (avoids store dependency for auth state)
vi.mock('../../vendor/components/VendorShell', () => ({
  VendorShell: ({ title, actions, children }: { title: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode }) => (
    <div>
      <div data-testid="shell-title">{title}</div>
      <div data-testid="shell-actions">{actions}</div>
      <div data-testid="shell-content">{children}</div>
    </div>
  ),
}));

// ── Sample data ───────────────────────────────────────────────────────────────
const MOCK_DATA = {
  kpis: {
    revenue: 4_500_000,
    orders: 37,
    productsOnSale: 12,
    avgRating: 4.3,
  },
  revenueSeries: [
    { date: '2026-06-01', value: 500_000 },
    { date: '2026-06-15', value: 1_200_000 },
    { date: '2026-06-30', value: 2_800_000 },
  ],
  topBooks: [
    { bookId: 1, title: 'Clean Code', author: 'Robert Martin', sold: 18, revenue: 1_620_000 },
    { bookId: 2, title: 'Refactoring', author: 'Martin Fowler', sold: 11, revenue: 990_000 },
  ],
  recentOrders: [
    { code: 'ORD-001', title: 'Clean Code', total: 90_000 },
    { code: 'ORD-002', title: 'Refactoring', total: 90_000 },
  ],
};

// ── Helper: create a minimal store ────────────────────────────────────────────
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
        <VendorDashboardPage />
      </MemoryRouter>
    </Provider>,
  );
}

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('VendorDashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetVendorDashboard.mockReturnValue({ data: MOCK_DATA, isLoading: false });
  });

  it('renders "Tổng quan" as page title', () => {
    renderPage();
    expect(screen.getByTestId('shell-title')).toHaveTextContent('Tổng quan');
  });

  it('renders formatted revenue KPI', () => {
    renderPage();
    // 4500000 → "4.500.000đ"
    expect(screen.getByText('4.500.000đ')).toBeTruthy();
  });

  it('renders orders KPI', () => {
    renderPage();
    expect(screen.getByText('37')).toBeTruthy();
  });

  it('renders productsOnSale KPI', () => {
    renderPage();
    expect(screen.getByText('12')).toBeTruthy();
  });

  it('renders avgRating KPI formatted as "x.x / 5"', () => {
    renderPage();
    expect(screen.getByText('4.3 / 5')).toBeTruthy();
  });

  it('renders chart SVG with a path element', () => {
    const { container } = renderPage();
    expect(container.querySelector('svg')).not.toBeNull();
    expect(container.querySelector('path')).not.toBeNull();
  });

  it('renders top book title in the table', () => {
    renderPage();
    // "Clean Code" appears in both recentOrders list and topBooks table
    const items = screen.getAllByText('Clean Code');
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it('renders recent order code', () => {
    renderPage();
    expect(screen.getByText('ORD-001')).toBeTruthy();
  });

  it('changing period dropdown calls query with the new period value', () => {
    renderPage();
    const select = screen.getByRole('combobox', { name: /khoảng thời gian/i });
    fireEvent.change(select, { target: { value: '7d' } });
    // After change, the hook should be called with '7d'
    const lastCall = mockGetVendorDashboard.mock.calls.at(-1);
    expect(lastCall?.[0]).toBe('7d');
  });

  it('shows loading state while isLoading is true', () => {
    mockGetVendorDashboard.mockReturnValue({ data: undefined, isLoading: true });
    const { getByTestId } = renderPage();
    expect(getByTestId('loading')).toBeTruthy();
  });
});
