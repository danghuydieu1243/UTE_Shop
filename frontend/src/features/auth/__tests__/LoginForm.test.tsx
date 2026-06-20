import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import { LoginForm } from '../components/LoginForm';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';

const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

const renderLoginForm = () =>
  render(
    <Provider store={makeStore()}>
      <MemoryRouter>
        <LoginForm />
      </MemoryRouter>
    </Provider>,
  );

describe('LoginForm', () => {
  it('renders email and password fields', () => {
    renderLoginForm();
    expect(screen.getByPlaceholderText('email@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nhập mật khẩu')).toBeInTheDocument();
  });

  it('shows validation errors when submitted empty', async () => {
    renderLoginForm();
    const submitButton = screen.getByRole('button', { name: 'Đăng nhập' });
    await userEvent.click(submitButton);
    expect(await screen.findByText('Email không hợp lệ')).toBeInTheDocument();
    expect(await screen.findByText('Vui lòng nhập mật khẩu')).toBeInTheDocument();
  });

  it('shows email validation error for invalid email', async () => {
    renderLoginForm();
    const emailInput = screen.getByPlaceholderText('email@example.com');
    await userEvent.type(emailInput, 'notanemail');
    const submitButton = screen.getByRole('button', { name: 'Đăng nhập' });
    await userEvent.click(submitButton);
    expect(await screen.findByText('Email không hợp lệ')).toBeInTheDocument();
  });

  it('renders forgot password and register links', () => {
    renderLoginForm();
    expect(screen.getByText('Quên mật khẩu?')).toBeInTheDocument();
    expect(screen.getByText('Đăng ký ngay')).toBeInTheDocument();
  });
});
