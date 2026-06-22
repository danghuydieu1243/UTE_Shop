import { render, screen } from '@testing-library/react';
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
});
