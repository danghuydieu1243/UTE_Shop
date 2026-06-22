import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, it, expect } from 'vitest';
import { RequireRole } from '../../../shared/auth/guards';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer, { setCredentials } from '../../../shared/auth/authSlice';
import type { User } from '../../../shared/types/auth';

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

const adminUser: User = { id: 1, email: 'admin@test.com', role: 'admin', fullName: 'Admin', status: 'active' };
const managerUser: User = { id: 2, email: 'manager@test.com', role: 'manager', fullName: 'Manager', status: 'active' };

/** Simulates /admin/users protected by RequireRole(['admin']) nested inside RequireRole(['admin','manager']) */
const renderAdminOnlyRoute = (user: User, path: string = '/admin/users') =>
  render(
    <Provider store={makeStore(user)}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          {/* Outer guard: admin + manager */}
          <Route element={<RequireRole roles={['admin', 'manager']} />}>
            {/* Inner guard: admin only */}
            <Route element={<RequireRole roles={['admin']} />}>
              <Route path="/admin/users" element={<div>Admin Users Page</div>} />
              <Route path="/admin/permissions" element={<div>Admin Permissions Page</div>} />
            </Route>
            <Route path="/admin/dashboard" element={<div>Admin Dashboard</div>} />
          </Route>
          <Route path="/403" element={<div>403 Forbidden</div>} />
          <Route path="/login" element={<div>Login Page</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );

describe('Admin-only route guard', () => {
  it('allows admin to access /admin/users', () => {
    renderAdminOnlyRoute(adminUser, '/admin/users');
    expect(screen.getByText('Admin Users Page')).toBeInTheDocument();
  });

  it('blocks manager from accessing /admin/users → shows 403', () => {
    renderAdminOnlyRoute(managerUser, '/admin/users');
    expect(screen.getByText('403 Forbidden')).toBeInTheDocument();
    expect(screen.queryByText('Admin Users Page')).not.toBeInTheDocument();
  });

  it('allows admin to access /admin/permissions', () => {
    renderAdminOnlyRoute(adminUser, '/admin/permissions');
    expect(screen.getByText('Admin Permissions Page')).toBeInTheDocument();
  });

  it('blocks manager from accessing /admin/permissions → shows 403', () => {
    renderAdminOnlyRoute(managerUser, '/admin/permissions');
    expect(screen.getByText('403 Forbidden')).toBeInTheDocument();
    expect(screen.queryByText('Admin Permissions Page')).not.toBeInTheDocument();
  });

  it('allows manager to access /admin/dashboard (shared route)', () => {
    renderAdminOnlyRoute(managerUser, '/admin/dashboard');
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });
});
