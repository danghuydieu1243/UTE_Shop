import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProfileEditForm } from '../components/ProfileEditForm';
import { baseApi } from '../../../shared/api/baseApi';
import authReducer from '../../../shared/auth/authSlice';
import type { User } from '../../../shared/types/auth';

/* ── Mock profileApi ── */
const mockUpdate = vi.fn();
vi.mock('../profileApi', () => ({
  useUpdateProfileMutation: () => [mockUpdate, { isLoading: false }],
}));

const user: User = {
  id: 1,
  email: 'user@test.com',
  role: 'user',
  fullName: 'Nguyễn Văn A',
  status: 'active',
  phone: null,
};

const makeStore = () =>
  configureStore({
    reducer: { [baseApi.reducerPath]: baseApi.reducer, auth: authReducer },
    middleware: (getDefault) => getDefault().concat(baseApi.middleware),
  });

const renderForm = () =>
  render(
    <Provider store={makeStore()}>
      <ProfileEditForm user={user} />
    </Provider>,
  );

describe('ProfileEditForm validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdate.mockReturnValue({ unwrap: vi.fn().mockResolvedValue({ ...user, phone: '0912345678' }) });
  });

  it('chặn submit khi SĐT sai định dạng và không gọi API', async () => {
    renderForm();
    fireEvent.change(screen.getByPlaceholderText('0901234567'), { target: { value: 'abc123' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

    expect(
      await screen.findByText('Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0'),
    ).toBeInTheDocument();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('chặn submit khi họ tên dưới 2 ký tự', async () => {
    renderForm();
    fireEvent.change(screen.getByPlaceholderText('Nguyễn Văn A'), { target: { value: 'A' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

    expect(await screen.findByText('Họ và tên tối thiểu 2 ký tự')).toBeInTheDocument();
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it('gọi API với phone hợp lệ và hiển thị thông báo thành công', async () => {
    renderForm();
    fireEvent.change(screen.getByPlaceholderText('0901234567'), { target: { value: '0912345678' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ fullName: 'Nguyễn Văn A', phone: '0912345678' });
    });
    expect(await screen.findByText('Cập nhật thành công!')).toBeInTheDocument();
  });

  it('gửi phone = null khi để trống (xoá SĐT)', async () => {
    renderForm();
    // phone để trống mặc định
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ fullName: 'Nguyễn Văn A', phone: null });
    });
  });
});
