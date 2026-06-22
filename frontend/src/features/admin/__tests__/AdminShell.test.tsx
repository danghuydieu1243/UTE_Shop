import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect } from 'vitest';
import { AdminShell } from '../components/AdminShell';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer, { setCredentials } from '../../../shared/auth/authSlice';
import type { User } from '../../../shared/types/auth';

vi.mock('../../auth/authApi', () => ({
  useLogoutMutation: vi.fn(() => [vi.fn(), {}]),
}));

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router-dom')>();
  return { ...actual, useNavigate: () => vi.fn() };
});

const makeStore = (user?: User) => {
  const store = configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });
  if (user) {
    store.dispatch(setCredentials({ accessToken: 'at', refreshToken: 'rt', user }));
  }
  return store;
};

const adminUser: User = { id: 1, email: 'admin@test.com', role: 'admin', fullName: 'Admin User', status: 'active' };
const managerUser: User = { id: 2, email: 'manager@test.com', role: 'manager', fullName: 'Manager User', status: 'active' };

const renderShell = (user: User) =>
  render(
    <Provider store={makeStore(user)}>
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AdminShell />
      </MemoryRouter>
    </Provider>,
  );

describe('AdminShell', () => {
  it('renders all nav items for an admin user', () => {
    renderShell(adminUser);
    expect(screen.getByText('Tổng quan')).toBeInTheDocument();
    expect(screen.getByText('Người dùng')).toBeInTheDocument();
    expect(screen.getByText('Vendor')).toBeInTheDocument();
    expect(screen.getByText('Sản phẩm')).toBeInTheDocument();
    expect(screen.getByText('Đơn hàng')).toBeInTheDocument();
    expect(screen.getByText('Cài đặt hệ thống')).toBeInTheDocument();
  });

  it('hides "Người dùng" and "Cài đặt hệ thống" for a manager user', () => {
    renderShell(managerUser);
    expect(screen.queryByText('Người dùng')).not.toBeInTheDocument();
    expect(screen.queryByText('Cài đặt hệ thống')).not.toBeInTheDocument();
  });

  it('still shows non-restricted nav items for manager', () => {
    renderShell(managerUser);
    expect(screen.getByText('Tổng quan')).toBeInTheDocument();
    expect(screen.getByText('Vendor')).toBeInTheDocument();
    expect(screen.getByText('Sản phẩm')).toBeInTheDocument();
    expect(screen.getByText('Đơn hàng')).toBeInTheDocument();
  });

  it('shows brand name "Athena / Admin Panel"', () => {
    renderShell(adminUser);
    expect(screen.getByText('Athena · Admin Panel')).toBeInTheDocument();
  });

  it('shows user full name in sidebar', () => {
    renderShell(adminUser);
    expect(screen.getByText('Admin User')).toBeInTheDocument();
  });

  it('renders logout button', () => {
    renderShell(adminUser);
    expect(screen.getByText('Đăng xuất')).toBeInTheDocument();
  });
});
