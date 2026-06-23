import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
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
      const e = err as { code?: string; message?: string };
      setApiError({
        message: e?.message ?? 'Đã có lỗi xảy ra, vui lòng thử lại.',
        code: e?.code,
      });
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {/* Error box — matches static .auth-error */}
      {apiError && (
        <div
          className="flex items-center gap-2 rounded border text-[13px]"
          style={{
            background: '#FBECEC',
            color: '#B43A3A',
            border: '1px solid rgba(180,58,58,.18)',
            borderRadius: '2px',
            padding: '10px 14px',
            animation: 'errorIn 220ms ease both',
          }}
        >
          {/* Warning circle icon from static */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4"/>
            <path d="M8 5v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <circle cx="8" cy="11" r=".8" fill="currentColor"/>
          </svg>
          <span>
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
          </span>
        </div>
      )}

      {/* Email field */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-email" className="text-[13px] font-medium text-ink">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          placeholder="email@example.com"
          autoComplete="email"
          className={`h-10 w-full border bg-surface px-3 text-[14px] text-ink outline-none transition-[border-color] duration-[180ms] placeholder:text-ink-3 focus:border-ink ${
            errors.email ? 'border-danger-fg' : 'border-line'
          }`}
          style={{ borderRadius: '2px' }}
          {...register('email')}
        />
        {errors.email && (
          <span className="text-[12px]" style={{ color: '#B43A3A' }}>
            {errors.email.message}
          </span>
        )}
      </div>

      {/* Password field with eye toggle */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-password" className="text-[13px] font-medium text-ink">
          Mật khẩu
        </label>
        <div className="relative">
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Nhập mật khẩu"
            autoComplete="current-password"
            className={`h-10 w-full border bg-surface py-0 pl-3 pr-11 text-[14px] text-ink outline-none transition-[border-color] duration-[180ms] placeholder:text-ink-3 focus:border-ink ${
              errors.password ? 'border-danger-fg' : 'border-line'
            }`}
            style={{ borderRadius: '2px' }}
            {...register('password')}
          />
          {/* Single custom eye toggle — matches static .input-toggle */}
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-[11px] top-1/2 flex -translate-y-1/2 cursor-pointer items-center border-none bg-transparent p-1 text-ink-3 transition-colors duration-[180ms] hover:text-ink-2"
            aria-label="Hiện/ẩn mật khẩu"
          >
            {/* Eye icon from static — opacity dims when password is shown */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              style={{ opacity: showPassword ? 0.5 : 1 }}
            >
              <path
                d="M1.5 9C1.5 9 4.5 3.5 9 3.5S16.5 9 16.5 9 13.5 14.5 9 14.5 1.5 9 1.5 9z"
                stroke="currentColor"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
              <circle cx="9" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.4"/>
            </svg>
          </button>
        </div>
        {errors.password && (
          <span className="text-[12px]" style={{ color: '#B43A3A' }}>
            {errors.password.message}
          </span>
        )}
      </div>

      {/* Remember + Forgot password row */}
      <div className="flex items-center justify-between">
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-2">
          <input
            type="checkbox"
            className="h-[14px] w-[14px] flex-shrink-0 cursor-pointer"
            style={{ accentColor: '#16161A' }}
          />
          Ghi nhớ đăng nhập
        </label>
        <Link
          to="/forgot-password"
          className="text-[13px] font-medium text-accent transition-opacity duration-[180ms] hover:opacity-75"
        >
          Quên mật khẩu?
        </Link>
      </div>

      {/* Submit button — matches static .btn-primary-lg */}
      <button
        type="submit"
        disabled={isLoading}
        className="mt-1 flex h-12 w-full cursor-pointer items-center justify-center border-none text-[11px] font-semibold uppercase tracking-[2px] transition-opacity duration-200 hover:opacity-85 disabled:cursor-not-allowed"
        style={{
          background: isLoading ? '#ECEAE5' : '#16161A',
          color: isLoading ? '#A8A8AE' : '#FBFAF8',
          borderRadius: '2px',
        }}
      >
        {isLoading ? (
          <>
            <span className="mr-2">ĐANG XỬ LÝ…</span>
            {/* Spinner */}
            <span
              className="inline-block h-4 w-4 rounded-full border-2 border-t-transparent"
              style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: 'white', animation: 'spin .7s linear infinite' }}
            />
          </>
        ) : (
          'Đăng nhập'
        )}
      </button>

      {/* Divider — matches static .auth-divider */}
      <div
        className="my-5 flex items-center gap-3.5 text-[12px] tracking-[.5px] text-ink-3"
        style={{ margin: '0' }}
      >
        <span className="h-px flex-1 bg-line" />
        hoặc
        <span className="h-px flex-1 bg-line" />
      </div>

      {/* Google button — matches static .btn-google */}
      <button
        type="button"
        className="flex h-11 w-full items-center justify-center gap-2.5 border border-line bg-surface text-[13px] font-medium text-ink transition-[border-color,background] duration-[180ms] hover:border-ink-2 hover:bg-paper"
        style={{ borderRadius: '2px' }}
      >
        {/* Google color logo from static */}
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M17.64 9.2a9.8 9.8 0 00-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.717v2.258h2.908C16.658 14.252 17.64 11.945 17.64 9.2z" fill="#4285F4"/>
          <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A9 9 0 009 18z" fill="#34A853"/>
          <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A9 9 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
          <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58A9 9 0 00.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
        </svg>
        Đăng nhập bằng Google
      </button>

      {/* Switch to register — matches static .auth-switch */}
      <p className="mt-5 text-center text-[13px] text-ink-2">
        Chưa có tài khoản?{' '}
        <Link
          to="/register"
          className="border-b border-transparent font-semibold text-ink transition-[border-color] duration-[180ms] hover:border-ink"
        >
          Đăng ký ngay
        </Link>
      </p>

      {/* Keyframe animations */}
      <style>{`
        @keyframes errorIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </form>
  );
};
