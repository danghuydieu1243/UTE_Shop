import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useRegisterMutation } from '../authApi';
import { passwordStrength, PASSWORD_4GROUPS } from '../../../shared/validation/password';

// ── Eye icon (same as Login — static .input-toggle SVG) ──────────────────────
const EyeIcon = ({ dimmed }: { dimmed?: boolean }) => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 18 18"
    fill="none"
    style={{ opacity: dimmed ? 0.5 : 1 }}
  >
    <path
      d="M1.5 9C1.5 9 4.5 3.5 9 3.5S16.5 9 16.5 9 13.5 14.5 9 14.5 1.5 9 1.5 9z"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
    />
    <circle cx="9" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.4" />
  </svg>
);

// ── Zod schema ────────────────────────────────────────────────────────────────
const baseSchema = z
  .object({
    accountType: z.enum(['user', 'vendor']),
    fullName: z.string().min(2, 'Vui lòng nhập họ tên (tối thiểu 2 ký tự)'),
    email: z.string().email('Email không hợp lệ'),
    shopName: z.string().optional(),
    password: z
      .string()
      .min(9, 'Mật khẩu phải ≥ 9 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt')
      .regex(
        PASSWORD_4GROUPS,
        'Mật khẩu phải ≥ 9 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt',
      ),
    confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
    agreeTerms: z.boolean(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  })
  .refine(
    (d) => {
      if (d.accountType === 'vendor') return (d.shopName?.trim().length ?? 0) >= 2;
      return true;
    },
    {
      message: 'Vui lòng nhập tên shop (tối thiểu 2 ký tự)',
      path: ['shopName'],
    },
  );

type FormValues = z.infer<typeof baseSchema>;

// ── Strength helpers ──────────────────────────────────────────────────────────
const STRENGTH_LABEL: Record<string, string> = {
  weak: 'Yếu',
  medium: 'Trung bình',
  strong: 'Mạnh',
};
const STRENGTH_COLOR: Record<string, string> = {
  weak: '#B43A3A',
  medium: '#9A6B16',
  strong: '#2E7D4F',
};
// Bars filled: weak=1, medium=2, strong=3
const STRENGTH_BARS: Record<string, number> = { weak: 1, medium: 2, strong: 3 };

// ── Component ─────────────────────────────────────────────────────────────────
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
  const isVendor = accountType === 'vendor';

  const onSubmit = async (values: FormValues) => {
    setApiError(null);
    // Block weak passwords (strength must be medium or strong)
    if (strength !== null && STRENGTH_BARS[strength] < 2) return;
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

  return (
    <>
      {/* Dynamic title + description — changes with accountType */}
      <h2
        className="mb-1.5 text-center text-2xl font-semibold text-ink"
        style={{ letterSpacing: '-.5px' }}
      >
        {isVendor ? 'Tạo tài khoản người bán' : 'Tạo tài khoản'}
      </h2>
      <p className="mb-6 text-center text-[13px] leading-[1.5] text-ink-2">
        {isVendor
          ? 'Đăng ký tài khoản người bán để đăng & bán E-book trên Athena.'
          : 'Tham gia Athena để mua và tải E-book.'}
      </p>

      {/* Error box — matches static .auth-error + preview animation */}
      {apiError && (
        <div
          className="mb-4 flex items-center gap-2 text-[13px]"
          style={{
            background: '#FBECEC',
            color: '#B43A3A',
            border: '1px solid rgba(180,58,58,.18)',
            borderRadius: '2px',
            padding: '10px 14px',
            animation: 'errorIn 220ms ease both',
          }}
        >
          {/* Warning circle icon — exact SVG from static */}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M8 5v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <circle cx="8" cy="11" r=".8" fill="currentColor" />
          </svg>
          <span>
            {apiError.message}
            {apiError.code === 'EMAIL_TAKEN' && (
              <>
                {' '}
                <Link
                  to="/login"
                  style={{ fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: '2px' }}
                >
                  Đăng nhập?
                </Link>
              </>
            )}
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-[14px]">

        {/* ── Loại tài khoản (account-type segmented) ── */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-ink">Loại tài khoản</label>
          <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Loại tài khoản">
            {(['user', 'vendor'] as const).map((type) => (
              <button
                key={type}
                type="button"
                role="tab"
                aria-selected={accountType === type}
                onClick={() => setValue('accountType', type, { shouldValidate: true })}
                className="flex flex-col gap-0.5 px-3 py-2.5 text-left transition-[border-color,color] duration-[160ms]"
                style={{
                  border: `1px solid ${accountType === type ? '#16161A' : '#ECEAE5'}`,
                  borderRadius: '2px',
                  background: '#FFFFFF',
                  color: accountType === type ? '#16161A' : '#6B6B73',
                }}
              >
                <span className="text-[13px] font-semibold">
                  {type === 'user' ? 'Người mua' : 'Người bán'}
                </span>
                <span className="text-[11px]" style={{ color: '#A8A8AE' }}>
                  {type === 'user' ? 'Mua & tải E-book' : 'Đăng & bán E-book'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Họ và tên ── */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reg-fullname" className="text-[13px] font-medium text-ink">
            Họ và tên
          </label>
          <input
            id="reg-fullname"
            type="text"
            placeholder="Nguyễn Văn A"
            autoComplete="name"
            className={`h-10 w-full bg-surface px-3 text-[14px] text-ink outline-none transition-[border-color] duration-[180ms] placeholder:text-ink-3 focus:border-ink ${
              errors.fullName ? 'border-danger-fg' : 'border-line'
            }`}
            style={{ border: `1px solid ${errors.fullName ? '#B43A3A' : '#ECEAE5'}`, borderRadius: '2px' }}
            {...rhfRegister('fullName')}
          />
          {errors.fullName && (
            <span className="text-[12px]" style={{ color: '#B43A3A' }}>
              {errors.fullName.message}
            </span>
          )}
        </div>

        {/* ── Email ── */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reg-email" className="text-[13px] font-medium text-ink">
            Email
          </label>
          <input
            id="reg-email"
            type="email"
            placeholder="email@example.com"
            autoComplete="email"
            className="h-10 w-full bg-surface px-3 text-[14px] text-ink outline-none transition-[border-color] duration-[180ms] placeholder:text-ink-3 focus:border-ink"
            style={{ border: `1px solid ${errors.email ? '#B43A3A' : '#ECEAE5'}`, borderRadius: '2px' }}
            {...rhfRegister('email')}
          />
          {errors.email && (
            <span className="text-[12px]" style={{ color: '#B43A3A' }}>
              {errors.email.message}
            </span>
          )}
        </div>

        {/* ── Vendor-only: Tên shop ── */}
        {isVendor && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="reg-shopname" className="text-[13px] font-medium text-ink">
              Tên shop / Nhà phát hành
            </label>
            <input
              id="reg-shopname"
              type="text"
              placeholder="VD: Nhà sách Athena"
              autoComplete="organization"
              className="h-10 w-full bg-surface px-3 text-[14px] text-ink outline-none transition-[border-color] duration-[180ms] placeholder:text-ink-3 focus:border-ink"
              style={{ border: `1px solid ${errors.shopName ? '#B43A3A' : '#ECEAE5'}`, borderRadius: '2px' }}
              {...rhfRegister('shopName')}
            />
            {errors.shopName && (
              <span className="text-[12px]" style={{ color: '#B43A3A' }}>
                {errors.shopName.message}
              </span>
            )}
          </div>
        )}

        {/* ── Vendor-only: ghi chú loại tài khoản ── */}
        {isVendor && (
          <div
            className="text-[12px] leading-[1.5] text-ink-2"
            style={{ background: '#F4F2ED', borderRadius: '2px', padding: '10px 12px' }}
          >
            Tài khoản <strong>Người bán</strong> là tài khoản riêng để đăng &amp; bán E-book. Sau
            khi xác thực OTP, bạn vào thẳng khu vực quản lý người bán.{' '}
            <strong>Không</strong> dùng để mua/tải E-book.
          </div>
        )}

        {/* ── Mật khẩu + strength meter ── */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reg-password" className="text-[13px] font-medium text-ink">
            Mật khẩu
          </label>
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Tối thiểu 9 ký tự"
              autoComplete="new-password"
              className="h-10 w-full bg-surface py-0 pl-3 pr-11 text-[14px] text-ink outline-none transition-[border-color] duration-[180ms] placeholder:text-ink-3 focus:border-ink"
              style={{
                border: `1px solid ${errors.password ? '#B43A3A' : '#ECEAE5'}`,
                borderRadius: '2px',
              }}
              {...rhfRegister('password')}
            />
            {/* Single eye toggle — same style as Login */}
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-[11px] top-1/2 flex -translate-y-1/2 cursor-pointer items-center border-none bg-transparent p-1 text-ink-3 transition-colors duration-[180ms] hover:text-ink-2"
              aria-label="Hiện/ẩn mật khẩu"
            >
              <EyeIcon dimmed={showPassword} />
            </button>
          </div>
          {/* Strength bars — 3 segments, matches static .pwd-strength */}
          <div className="mt-1.5 flex gap-1">
            {[1, 2, 3].map((bar) => {
              const filled = strength !== null && bar <= STRENGTH_BARS[strength];
              return (
                <div
                  key={bar}
                  className="h-[3px] flex-1 transition-[background] duration-[280ms]"
                  style={{
                    borderRadius: '2px',
                    background: filled ? STRENGTH_COLOR[strength!] : '#ECEAE5',
                  }}
                />
              );
            })}
          </div>
          <span
            className="text-[11px] tracking-[.2px] transition-colors duration-200"
            style={{ color: strength ? STRENGTH_COLOR[strength] : '#A8A8AE' }}
          >
            {passwordValue
              ? strength
                ? STRENGTH_LABEL[strength]
                : 'Nhập mật khẩu để kiểm tra độ mạnh'
              : 'Nhập mật khẩu để kiểm tra độ mạnh'}
          </span>
          {errors.password && (
            <span className="text-[12px]" style={{ color: '#B43A3A' }}>
              {errors.password.message}
            </span>
          )}
        </div>

        {/* ── Xác nhận mật khẩu ── */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="reg-confirm" className="text-[13px] font-medium text-ink">
            Xác nhận mật khẩu
          </label>
          <div className="relative">
            <input
              id="reg-confirm"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Nhập lại mật khẩu"
              autoComplete="new-password"
              className="h-10 w-full bg-surface py-0 pl-3 pr-11 text-[14px] text-ink outline-none transition-[border-color] duration-[180ms] placeholder:text-ink-3 focus:border-ink"
              style={{
                border: `1px solid ${errors.confirmPassword ? '#B43A3A' : '#ECEAE5'}`,
                borderRadius: '2px',
              }}
              {...rhfRegister('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-[11px] top-1/2 flex -translate-y-1/2 cursor-pointer items-center border-none bg-transparent p-1 text-ink-3 transition-colors duration-[180ms] hover:text-ink-2"
              aria-label="Hiện/ẩn mật khẩu"
            >
              <EyeIcon dimmed={showConfirm} />
            </button>
          </div>
          {errors.confirmPassword && (
            <span className="text-[12px]" style={{ color: '#B43A3A' }}>
              {errors.confirmPassword.message}
            </span>
          )}
        </div>

        {/* ── Terms checkbox — matches static .terms-row ── */}
        <div className="flex items-start gap-2.5 py-0.5">
          <input
            type="checkbox"
            id="reg-terms"
            className="mt-0.5 h-[14px] w-[14px] flex-shrink-0 cursor-pointer"
            style={{ accentColor: '#16161A' }}
            {...rhfRegister('agreeTerms')}
          />
          <label
            htmlFor="reg-terms"
            className="cursor-pointer text-[13px] leading-[1.5] text-ink-2"
          >
            Tôi đồng ý với{' '}
            <a
              href="/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-ink"
              style={{ textDecoration: 'underline', textUnderlineOffset: '2px' }}
            >
              Điều khoản sử dụng
            </a>{' '}
            và{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-ink"
              style={{ textDecoration: 'underline', textUnderlineOffset: '2px' }}
            >
              Chính sách bảo mật
            </a>
          </label>
        </div>

        {/* ── Submit button — matches static .btn-primary-lg ── */}
        <button
          type="submit"
          disabled={!agreeTerms || isLoading || (strength !== null && STRENGTH_BARS[strength] < 2)}
          className="mt-1 flex h-12 w-full cursor-pointer items-center justify-center gap-2 border-none text-[11px] font-semibold uppercase tracking-[2px] transition-opacity duration-200 hover:opacity-85 disabled:cursor-not-allowed"
          style={{
            background:
              !agreeTerms || (strength !== null && STRENGTH_BARS[strength] < 2)
                ? '#ECEAE5'
                : '#16161A',
            color:
              !agreeTerms || (strength !== null && STRENGTH_BARS[strength] < 2)
                ? '#A8A8AE'
                : '#FBFAF8',
            borderRadius: '2px',
          }}
        >
          {isLoading ? (
            <>
              <span>ĐANG XỬ LÝ…</span>
              {/* Spinner */}
              <span
                className="inline-block h-4 w-4 rounded-full border-2"
                style={{
                  borderColor: 'rgba(255,255,255,.3)',
                  borderTopColor: 'white',
                  animation: 'spin .7s linear infinite',
                }}
              />
            </>
          ) : isVendor ? (
            'Đăng ký người bán'
          ) : (
            'Đăng ký'
          )}
        </button>
      </form>

      {/* ── Link to login — matches static .auth-switch ── */}
      <p className="mt-5 text-center text-[13px] text-ink-2">
        Đã có tài khoản?{' '}
        <Link
          to="/login"
          className="border-b border-transparent font-semibold text-ink transition-[border-color] duration-[180ms] hover:border-ink"
        >
          Đăng nhập
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
    </>
  );
};
