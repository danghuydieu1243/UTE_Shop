import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, Alert } from '../../../shared/ui';
import { useRegisterMutation } from '../authApi';
import { passwordStrength, PASSWORD_4GROUPS } from '../../../shared/validation/password';

const baseSchema = z.object({
  accountType: z.enum(['user', 'vendor']),
  fullName: z.string().min(2, 'Vui lòng nhập họ tên (tối thiểu 2 ký tự)'),
  email: z.string().email('Email không hợp lệ'),
  shopName: z.string().optional(),
  password: z
    .string()
    .min(9, 'Mật khẩu phải ≥ 9 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt')
    .regex(PASSWORD_4GROUPS, 'Mật khẩu phải ≥ 9 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt'),
  confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  agreeTerms: z.boolean(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Mật khẩu xác nhận không khớp',
  path: ['confirmPassword'],
}).refine((d) => {
  if (d.accountType === 'vendor') return (d.shopName?.trim().length ?? 0) >= 2;
  return true;
}, {
  message: 'Vui lòng nhập tên shop (tối thiểu 2 ký tự)',
  path: ['shopName'],
});

type FormValues = z.infer<typeof baseSchema>;

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

export const RegisterForm = () => {
  const navigate = useNavigate();
  const [register, { isLoading }] = useRegisterMutation();
  const [apiError, setApiError] = useState<{ message: string; code?: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register: rhfRegister,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(baseSchema),
    defaultValues: { accountType: 'user', agreeTerms: false },
  });

  const accountType = watch('accountType');
  const passwordValue = watch('password') ?? '';
  const agreeTerms = watch('agreeTerms');
  const strength = passwordValue ? passwordStrength(passwordValue) : null;

  const onSubmit = async (values: FormValues) => {
    setApiError(null);
    if (strengthBars[strength ?? 'weak'] < 2) return; // weak passwords blocked
    try {
      await register({
        accountType: values.accountType,
        email: values.email,
        password: values.password,
        fullName: values.fullName,
        shopName: values.accountType === 'vendor' ? values.shopName : undefined,
      }).unwrap();
      navigate(`/verify-otp?email=${encodeURIComponent(values.email)}&purpose=register`);
    } catch (err: unknown) {
      const e = err as { data?: { code?: string; message?: string } };
      setApiError({
        message: e?.data?.message ?? 'Đã có lỗi xảy ra, vui lòng thử lại.',
        code: e?.data?.code,
      });
    }
  };

  const isVendor = accountType === 'vendor';

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {apiError && (
        <Alert kind="danger">
          {apiError.message}
          {apiError.code === 'EMAIL_TAKEN' && (
            <>
              {' '}
              <Link to="/login" className="underline font-medium">
                Đăng nhập?
              </Link>
            </>
          )}
        </Alert>
      )}

      {/* Account type toggle */}
      <div>
        <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[1.5px] text-ink-2">
          Loại tài khoản
        </span>
        <div className="flex gap-2">
          {(['user', 'vendor'] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setValue('accountType', type, { shouldValidate: true })}
              className={`flex-1 rounded border py-2 text-xs font-medium transition-colors ${
                accountType === type
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line bg-surface text-ink-2 hover:border-ink hover:text-ink'
              }`}
            >
              <div className="font-semibold uppercase tracking-wide">
                {type === 'user' ? 'Người mua' : 'Người bán'}
              </div>
              <div className="text-[11px] opacity-70">
                {type === 'user' ? 'Mua & tải E-book' : 'Đăng & bán E-book'}
              </div>
            </button>
          ))}
        </div>
      </div>

      <Input
        label="Họ và tên"
        type="text"
        placeholder="Nguyễn Văn A"
        autoComplete="name"
        error={errors.fullName?.message}
        {...rhfRegister('fullName')}
      />

      <Input
        label="Email"
        type="email"
        placeholder="email@example.com"
        autoComplete="email"
        error={errors.email?.message}
        {...rhfRegister('email')}
      />

      {/* Vendor-only fields */}
      {isVendor && (
        <>
          <Input
            label="Tên shop / Nhà phát hành"
            type="text"
            placeholder="VD: Nhà sách Athena"
            autoComplete="organization"
            error={errors.shopName?.message}
            {...rhfRegister('shopName')}
          />
          <div className="rounded bg-cover-bg px-4 py-3 text-[13px] text-ink-2">
            Tài khoản Người bán là tài khoản riêng để đăng &amp; bán E-book. Sau khi xác thực OTP, bạn vào thẳng khu vực quản lý người bán. Không dùng để mua/tải E-book.
          </div>
        </>
      )}

      {/* Password with strength meter */}
      <div>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[1.5px] text-ink-2">Mật khẩu</span>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Tối thiểu 9 ký tự"
              autoComplete="new-password"
              className={`w-full rounded border bg-surface px-3 py-2.5 pr-10 text-sm text-ink outline-none transition-colors focus:border-ink ${errors.password ? 'border-danger-fg' : 'border-line'}`}
              {...rhfRegister('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
              aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              {showPassword ? (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              )}
            </button>
          </div>
          {errors.password && <span className="mt-1 block text-xs text-danger-fg">{errors.password.message}</span>}
        </label>
        {/* Strength bar */}
        {passwordValue && strength && (
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
            <span className={`mt-1 block text-xs font-medium`} style={{ color: strength === 'weak' ? '#B43A3A' : strength === 'medium' ? '#9A6B16' : '#2E7D4F' }}>
              {strengthLabel[strength]}
            </span>
          </div>
        )}
      </div>

      {/* Confirm password */}
      <label className="block">
        <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[1.5px] text-ink-2">Xác nhận mật khẩu</span>
        <div className="relative">
          <input
            type={showConfirm ? 'text' : 'password'}
            placeholder="Nhập lại mật khẩu"
            autoComplete="new-password"
            className={`w-full rounded border bg-surface px-3 py-2.5 pr-10 text-sm text-ink outline-none transition-colors focus:border-ink ${errors.confirmPassword ? 'border-danger-fg' : 'border-line'}`}
            {...rhfRegister('confirmPassword')}
          />
          <button
            type="button"
            onClick={() => setShowConfirm((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
            aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
          >
            {showConfirm ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            )}
          </button>
        </div>
        {errors.confirmPassword && (
          <span className="mt-1 block text-xs text-danger-fg">{errors.confirmPassword.message}</span>
        )}
      </label>

      {/* Terms */}
      <label className="flex cursor-pointer items-start gap-2 text-sm text-ink-2">
        <input
          type="checkbox"
          className="mt-0.5 accent-ink"
          {...rhfRegister('agreeTerms')}
        />
        <span>
          Tôi đồng ý với{' '}
          <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-ink underline">
            Điều khoản sử dụng
          </a>{' '}
          và{' '}
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-ink underline">
            Chính sách bảo mật
          </a>
        </span>
      </label>

      <Button
        type="submit"
        loading={isLoading}
        disabled={!agreeTerms || (strength !== null && strengthBars[strength ?? 'weak'] < 2)}
        className="h-12 w-full"
      >
        {isVendor ? 'ĐĂNG KÝ NGƯỜI BÁN' : 'ĐĂNG KÝ'}
      </Button>

      <p className="text-center text-sm text-ink-2">
        Đã có tài khoản?{' '}
        <Link to="/login" className="font-medium text-ink hover:underline">
          Đăng nhập
        </Link>
      </p>
    </form>
  );
};
