import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input, Alert } from '../../../shared/ui';
import { useLoginMutation } from '../authApi';

const schema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

type FormValues = z.infer<typeof schema>;

export const LoginForm = () => {
  const navigate = useNavigate();
  const [login, { isLoading }] = useLoginMutation();
  const [apiError, setApiError] = useState<{ message: string; code?: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setApiError(null);
    try {
      const result = await login(values).unwrap();
      navigate(result.redirect);
    } catch (err: unknown) {
      const e = err as { data?: { code?: string; message?: string } };
      setApiError({
        message: e?.data?.message ?? 'Đã có lỗi xảy ra, vui lòng thử lại.',
        code: e?.data?.code,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {apiError && (
        <Alert kind="danger">
          {apiError.message}
          {apiError.code === 'ACCOUNT_PENDING' && (
            <>
              {' '}
              <Link
                to={`/verify-otp?email=${encodeURIComponent(getValues('email'))}&purpose=register`}
                className="underline font-medium"
              >
                Xác thực ngay
              </Link>
            </>
          )}
        </Alert>
      )}

      <Input
        label="Email"
        type="email"
        placeholder="email@example.com"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />

      <label className="block">
        <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[1.5px] text-ink-2">Mật khẩu</span>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
            className={`w-full rounded border bg-surface px-3 py-2.5 pr-10 text-sm text-ink outline-none transition-colors focus:border-ink ${errors.password ? 'border-danger-fg' : 'border-line'}`}
            {...register('password')}
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

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-ink-2 cursor-pointer">
          <input type="checkbox" className="accent-ink" />
          Ghi nhớ đăng nhập
        </label>
        <Link to="/forgot-password" className="text-sm text-accent hover:underline">
          Quên mật khẩu?
        </Link>
      </div>

      <Button type="submit" loading={isLoading} className="h-12 w-full">
        ĐĂNG NHẬP
      </Button>

      <div className="flex items-center gap-3 text-ink-3 text-xs">
        <span className="flex-1 border-t border-line" />
        hoặc
        <span className="flex-1 border-t border-line" />
      </div>

      <button
        type="button"
        className="flex h-11 w-full items-center justify-center gap-2 rounded border border-line bg-surface text-sm text-ink hover:border-ink transition-colors"
      >
        <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
          <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Đăng nhập bằng Google
      </button>

      <p className="text-center text-sm text-ink-2">
        Chưa có tài khoản?{' '}
        <Link to="/register" className="font-medium text-ink hover:underline">
          Đăng ký ngay
        </Link>
      </p>
    </form>
  );
};
