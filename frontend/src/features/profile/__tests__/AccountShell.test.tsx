import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { describe, expect, it, vi } from 'vitest';
import { AccountShell } from '../components/AccountShell';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer, { setCredentials } from '../../../shared/auth/authSlice';

vi.mock('../../auth/authApi', () => ({
  useLogoutMutation: vi.fn(() => [vi.fn(), {}]),
}));

vi.mock('../../notifications/notificationsApi', () => ({
  useGetUnreadCountQuery: vi.fn(() => ({ data: 0 })),
}));

const makeStore = () => {
  const store = configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

  store.dispatch(
    setCredentials({
      accessToken: 'at',
      refreshToken: 'rt',
      user: { id: 1, email: 'user@test.com', role: 'user', fullName: 'User Test', status: 'active' },
    }),
  );

  return store;
};

describe('AccountShell header actions', () => {
  it('renders wishlist and cart icons as navigable links in /user pages', () => {
    render(
      <Provider store={makeStore()}>
        <MemoryRouter>
          <AccountShell
            breadcrumbLabel="Hồ sơ"
            activeNav="/user/profile"
            userData={{ fullName: 'User Test', email: 'user@test.com' }}
          >
            <div>Content</div>
          </AccountShell>
        </MemoryRouter>
      </Provider>,
    );

    expect(screen.getByLabelText('Yêu thích').closest('a')).toHaveAttribute('href', '/user/wishlist');
    expect(screen.getByLabelText('Giỏ hàng').closest('a')).toHaveAttribute('href', '/cart');
  });
});
