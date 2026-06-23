import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert } from '../../../shared/ui';
import { useChangePasswordMutation } from '../profileApi';
import { passwordStrength, PASSWORD_4GROUPS } from '../../../shared/validation/password';

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
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

type FormValues = z.infer<typeof changePasswordSchema>;

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
// 4 segments: weak=1, medium=2, strong=3 filled out of 4
const strengthBars: Record<string, number> = { weak: 1, medium: 2, strong: 3 };

const EyeOpenIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeClosedIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export const ChangePasswordForm = () => {
  const [changePassword, { isLoading }] = useChangePasswordMutation();
  const [apiError, setApiError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  const newPasswordValue = watch('newPassword') ?? '';
  const strength = newPasswordValue ? passwordStrength(newPasswordValue) : null;

  const onSubmit = async (values: FormValues) => {
    setApiError(null);
    setSuccessMsg(null);
    if (strength && strengthBars[strength] < 2) return;
    try {
      await changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }).unwrap();
      setSuccessMsg('Đổi mật khẩu thành công!');
      reset();
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e?.code === 'PASSWORD_MISMATCH') {
        setApiError(e?.message ?? 'Mật khẩu hiện tại không đúng');
      } else {
        setApiError(e?.message ?? 'Đã có lỗi xảy ra, vui lòng thử lại.');
      }
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      {successMsg && <Alert kind="success">{successMsg}</Alert>}
      {apiError && <Alert kind="danger">{apiError}</Alert>}

      {/* Current password */}
      <div>
        <label className="block">
          <span className="block text-[11px] font-medium uppercase tracking-[0.5px] text-ink-3 mb-1.5">
            Mật khẩu hiện tại
          </span>
          <div className="relative flex">
            <input
              type={showCurrent ? 'text' : 'password'}
              placeholder="Nhập mật khẩu hiện tại"
              autoComplete="current-password"
              className={`h-[42px] border rounded bg-surface text-[14px] text-ink outline-none w-full pr-[44px] pl-[14px] focus:border-ink transition-colors ${
                errors.currentPassword ? 'border-danger-fg' : 'border-line'
              }`}
              {...register('currentPassword')}
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-[14px] top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink border-none bg-transparent p-0 cursor-pointer"
              aria-label={showCurrent ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showCurrent ? <EyeClosedIcon /> : <EyeOpenIcon />}
            </button>
          </div>
        </label>
        {errors.currentPassword && (
          <span className="mt-0.5 block text-[11px] text-danger-fg">{errors.currentPassword.message}</span>
        )}
      </div>

      {/* New password with strength bar */}
      <div>
        <label className="block">
          <span className="block text-[11px] font-medium uppercase tracking-[0.5px] text-ink-3 mb-1.5">
            Mật khẩu mới
          </span>
          <div className="relative flex">
            <input
              type={showNew ? 'text' : 'password'}
              placeholder="Tối thiểu 9 ký tự"
              autoComplete="new-password"
              className={`h-[42px] border rounded bg-surface text-[14px] text-ink outline-none w-full pr-[44px] pl-[14px] focus:border-ink transition-colors ${
                errors.newPassword ? 'border-danger-fg' : 'border-line'
              }`}
              {...register('newPassword')}
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-[14px] top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink border-none bg-transparent p-0 cursor-pointer"
              aria-label={showNew ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showNew ? <EyeClosedIcon /> : <EyeOpenIcon />}
            </button>
          </div>
          {errors.newPassword && (
            <span className="mt-0.5 block text-[11px] text-danger-fg">{errors.newPassword.message}</span>
          )}
        </label>
        {/* Strength bar — 4 segments */}
        {newPasswordValue && strength && (
          <div className="mt-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((bar) => (
                <div
                  key={bar}
                  className={`h-[3px] flex-1 rounded-full transition-colors ${
                    bar <= strengthBars[strength] ? strengthColor[strength] : 'bg-line'
                  }`}
                />
              ))}
            </div>
            <span
              className="mt-1 block text-[11px] font-medium"
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
        {/* Strength hint */}
        <p className="mt-1.5 text-[11px] text-ink-3">
          Tối thiểu 9 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt
        </p>
      </div>

      {/* Confirm password */}
      <div>
        <label className="block">
          <span className="block text-[11px] font-medium uppercase tracking-[0.5px] text-ink-3 mb-1.5">
            Xác nhận mật khẩu mới
          </span>
          <div className="relative flex">
            <input
              type={showConfirm ? 'text' : 'password'}
              placeholder="Nhập lại mật khẩu mới"
              autoComplete="new-password"
              className={`h-[42px] border rounded bg-surface text-[14px] text-ink outline-none w-full pr-[44px] pl-[14px] focus:border-ink transition-colors ${
                errors.confirm ? 'border-danger-fg' : 'border-line'
              }`}
              {...register('confirm')}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-[14px] top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink border-none bg-transparent p-0 cursor-pointer"
              aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showConfirm ? <EyeClosedIcon /> : <EyeOpenIcon />}
            </button>
          </div>
        </label>
        {errors.confirm && (
          <span className="mt-0.5 block text-[11px] text-danger-fg">{errors.confirm.message}</span>
        )}
      </div>

      {/* Form actions */}
      <div className="flex items-center gap-3 mt-7 pt-6 border-t border-line">
        <button
          type="submit"
          disabled={isLoading || (strength !== null && (strengthBars[strength ?? 'weak'] < 2))}
          className="h-[42px] px-7 bg-ink text-paper border-none rounded text-[11px] font-semibold tracking-[1.5px] uppercase cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
        </button>
      </div>
    </form>
  );
};
