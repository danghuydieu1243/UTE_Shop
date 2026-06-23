import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Alert } from '../../../shared/ui';
import { useResetPasswordMutation } from '../authApi';
import { passwordStrength, PASSWORD_4GROUPS } from '../../../shared/validation/password';

const resetSchema = z
  .object({
    newPassword: z
      .string()
      .min(9, 'Mật khẩu phải ≥ 9 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt')
      .regex(PASSWORD_4GROUPS, 'Mật khẩu phải ≥ 9 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt'),
    confirm: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((d) => d.newPassword === d.confirm, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirm'],
  });

type FormValues = z.infer<typeof resetSchema>;

const strengthLabel: Record<string, string> = {
  weak: 'Yếu',
  medium: 'Trung bình',
  strong: 'Mạnh',
};
const strengthColor: Record<string, string> = {
  weak: 'bg-danger-fg',
  medium: 'bg-warning-fg',
  strong: 'bg-success-fg',
};
const strengthBars: Record<string, number> = { weak: 1, medium: 2, strong: 3 };

export const ResetForm = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const token = searchParams.get('token') ?? '';

  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(resetSchema),
  });

  const newPasswordValue = watch('newPassword') ?? '';
  const strength = newPasswordValue ? passwordStrength(newPasswordValue) : null;

  const onSubmit = async (values: FormValues) => {
    setApiError(null);
    setSuccessMsg(null);
    if (strength && strengthBars[strength] < 2) return;
    try {
      await resetPassword({ email, resetToken: token, newPassword: values.newPassword }).unwrap();
      setSuccessMsg('Mật khẩu đã được đặt lại thành công! Đang chuyển về đăng nhập...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      setApiError(e?.message ?? 'Đã có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {apiError && <Alert kind="danger">{apiError}</Alert>}
      {successMsg && <Alert kind="success">{successMsg}</Alert>}

      {/* New password with strength bar */}
      <div>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[1.5px] text-ink-2">
            Mật khẩu mới
          </span>
          <div className="relative">
            <input
              type={showNew ? 'text' : 'password'}
              placeholder="Tối thiểu 9 ký tự"
              autoComplete="new-password"
              className={`w-full rounded border bg-surface px-3 py-2.5 pr-10 text-sm text-ink outline-none transition-colors focus:border-ink ${
                errors.newPassword ? 'border-danger-fg' : 'border-line'
              }`}
              {...register('newPassword')}
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
              aria-label={showNew ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showNew ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
          {errors.newPassword && (
            <span className="mt-1 block text-xs text-danger-fg">{errors.newPassword.message}</span>
          )}
        </label>
        {/* Strength bar */}
        {newPasswordValue && strength && (
          <div className="mt-2">
            <div className="flex gap-1">
              {[1, 2, 3].map((bar) => (
                <div
                  key={bar}
                  className={`h-[3px] flex-1 rounded-full transition-colors ${
                    bar <= strengthBars[strength] ? strengthColor[strength] : 'bg-line'
                  }`}
                />
              ))}
            </div>
            <span
              className="mt-1 block text-xs font-medium"
              style={{
                color:
                  strength === 'weak'
                    ? '#B43A3A'
                    : strength === 'medium'
                    ? '#9A6B16'
                    : '#2E7D4F',
              }}
            >
              {strengthLabel[strength]}
            </span>
          </div>
        )}
      </div>

      {/* Confirm password */}
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[1.5px] text-ink-2">
          Xác nhận mật khẩu mới
        </span>
        <div className="relative">
          <input
            type={showConfirm ? 'text' : 'password'}
            placeholder="Nhập lại mật khẩu mới"
            autoComplete="new-password"
            className={`w-full rounded border bg-surface px-3 py-2.5 pr-10 text-sm text-ink outline-none transition-colors focus:border-ink ${
              errors.confirm ? 'border-danger-fg' : 'border-line'
            }`}
            {...register('confirm')}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
            aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {showConfirm ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
        {errors.confirm && (
          <span className="mt-1 block text-xs text-danger-fg">{errors.confirm.message}</span>
        )}
      </label>

      <Button
        type="submit"
        loading={isLoading}
        disabled={!!successMsg || (strength !== null && strengthBars[strength ?? 'weak'] < 2)}
        className="h-12 w-full"
      >
        ĐẶT LẠI MẬT KHẨU
      </Button>
    </form>
  );
};
