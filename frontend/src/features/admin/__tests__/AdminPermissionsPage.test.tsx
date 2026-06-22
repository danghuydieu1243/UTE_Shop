import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect } from 'vitest';
import { AdminPermissionsPage } from '../pages/AdminPermissionsPage';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';

const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

const renderPage = () =>
  render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <AdminPermissionsPage />
      </MemoryRouter>
    </Provider>,
  );

/** Find the <tr> that contains the given group label text. */
const getRow = (groupLabel: string): HTMLElement => {
  const cell = screen.getByText(groupLabel);
  // Walk up to the nearest <tr>
  let el: HTMLElement | null = cell;
  while (el && el.tagName !== 'TR') {
    el = el.parentElement as HTMLElement | null;
  }
  if (!el) throw new Error(`Could not find <tr> for group: ${groupLabel}`);
  return el;
};

/**
 * Returns the ordered cell text values for a row (excluding the first label cell).
 * Order matches ROLE_HEADERS: guest, user, vendor, manager, admin.
 */
const getRowCells = (groupLabel: string): string[] => {
  const row = getRow(groupLabel);
  const cells = within(row).getAllByRole('cell');
  // cells[0] is the group label; cells[1..5] are role values
  return cells.slice(1).map((c) => c.textContent ?? '');
};

describe('AdminPermissionsPage', () => {
  it('renders page heading', () => {
    renderPage();
    expect(screen.getByText('Ma trận quyền')).toBeInTheDocument();
  });

  it('renders role column headers', () => {
    renderPage();
    expect(screen.getByText('Guest')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Vendor')).toBeInTheDocument();
    expect(screen.getByText('Manager')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('renders known permission group rows', () => {
    renderPage();
    expect(screen.getByText('Xem catalog / tìm kiếm')).toBeInTheDocument();
    expect(screen.getByText('Mua hàng / thanh toán / đơn của tôi')).toBeInTheDocument();
    expect(screen.getByText('Quản lý người dùng')).toBeInTheDocument();
    expect(screen.getByText('Cấu hình phân quyền hệ thống')).toBeInTheDocument();
  });

  it('renders the read-only disclaimer note', () => {
    renderPage();
    expect(screen.getByText(/Cố định theo thiết kế/i)).toBeInTheDocument();
  });

  it('renders check marks and dashes in cells', () => {
    renderPage();
    // Multiple checkmarks should be present
    const checks = screen.getAllByText('✓');
    expect(checks.length).toBeGreaterThan(0);
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  // ── Cell-value assertions (mirrors RBAC_MATRIX.md exactly) ──────────────

  it('catalog row: all roles have ✓', () => {
    renderPage();
    // [guest, user, vendor, manager, admin]
    expect(getRowCells('Xem catalog / tìm kiếm')).toEqual(['✓', '✓', '✓', '✓', '✓']);
  });

  it('cart/checkout row: only user ✓, others —', () => {
    renderPage();
    expect(getRowCells('Mua hàng / thanh toán / đơn của tôi')).toEqual(['—', '✓', '—', '—', '—']);
  });

  it('quản lý người dùng: only admin ✓, manager —', () => {
    renderPage();
    const cells = getRowCells('Quản lý người dùng');
    // manager is index 3, admin is index 4
    expect(cells[3]).toBe('—'); // manager
    expect(cells[4]).toBe('✓'); // admin
  });

  it('quản lý đơn hàng toàn sàn: manager — (not ✓), admin ✓', () => {
    renderPage();
    const cells = getRowCells('Quản lý đơn hàng toàn sàn');
    expect(cells[3]).toBe('—'); // manager must NOT have this permission
    expect(cells[4]).toBe('✓'); // admin has it
  });

  it('xem doanh thu tổng: manager —, admin ✓', () => {
    renderPage();
    const cells = getRowCells('Xem doanh thu tổng toàn sàn');
    expect(cells[3]).toBe('—'); // manager
    expect(cells[4]).toBe('✓'); // admin
  });

  it('cấu hình phân quyền: manager —, admin ✓', () => {
    renderPage();
    const cells = getRowCells('Cấu hình phân quyền hệ thống');
    expect(cells[3]).toBe('—'); // manager
    expect(cells[4]).toBe('✓'); // admin
  });
});
