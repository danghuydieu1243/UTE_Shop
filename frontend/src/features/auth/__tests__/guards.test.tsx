import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { RequireRole, RedirectIfAuthenticated } from '../../../shared/auth/guards';
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

const renderWithRole = (user?: User) =>
  render(
    <Provider store={makeStore(user)}>
      <MemoryRouter initialEntries={['/protected']}>
        <Routes>
          <Route element={<RequireRole roles={['admin']} />}>
            <Route path="/protected" element={<div>Admin Content</div>} />
          </Route>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/403" element={<div>403 Forbidden</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );

describe('RequireRole', () => {
  it('redirects to /login when no user is logged in', () => {
    renderWithRole(undefined);
    expect(screen.getByText('Login Page')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('redirects to /403 when user role does not match required role', () => {
    renderWithRole({ id: 1, email: 'u@e.com', role: 'user', fullName: 'User', status: 'active' });
    expect(screen.getByText('403 Forbidden')).toBeInTheDocument();
    expect(screen.queryByText('Admin Content')).not.toBeInTheDocument();
  });

  it('renders children when user has the required role', () => {
    renderWithRole({ id: 2, email: 'a@e.com', role: 'admin', fullName: 'Admin', status: 'active' });
    expect(screen.getByText('Admin Content')).toBeInTheDocument();
  });
});

const renderAuthRoute = (user?: User) =>
  render(
    <Provider store={makeStore(user)}>
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route element={<RedirectIfAuthenticated />}>
            <Route path="/login" element={<div>Login Page</div>} />
          </Route>
          <Route path="/" element={<div>Home Page</div>} />
          <Route path="/vendor/dashboard" element={<div>Vendor Dashboard</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );

describe('RedirectIfAuthenticated', () => {
  it('hiển thị màn auth khi chưa đăng nhập', () => {
    renderAuthRoute(undefined);
    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirect user đã đăng nhập về home theo role (user → /)', () => {
    renderAuthRoute({ id: 1, email: 'u@e.com', role: 'user', fullName: 'User', status: 'active' });
    expect(screen.getByText('Home Page')).toBeInTheDocument();
    expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
  });

  it('redirect vendor đã đăng nhập về /vendor/dashboard', () => {
    renderAuthRoute({ id: 2, email: 'v@e.com', role: 'vendor', fullName: 'Vendor', status: 'active' });
    expect(screen.getByText('Vendor Dashboard')).toBeInTheDocument();
  });
});
