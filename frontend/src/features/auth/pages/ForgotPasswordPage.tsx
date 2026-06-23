import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useForgotPasswordMutation,
  useVerifyOtpMutation,
  useResendOtpMutation,
  useResetPasswordMutation,
} from '../authApi';
import { passwordStrength, PASSWORD_4GROUPS } from '../../../shared/validation/password';

// ─── Schemas ────────────────────────────────────────────────────────────────

const emailSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});
type EmailValues = z.infer<typeof emailSchema>;

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
type ResetValues = z.infer<typeof resetSchema>;

// ─── Stepper ─────────────────────────────────────────────────────────────────

type StepState = 'active' | 'done' | 'inactive';

const CheckIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const Stepper = ({ step }: { step: 1 | 2 | 3 }) => {
  const states: [StepState, StepState, StepState] =
    step === 1
      ? ['active', 'inactive', 'inactive']
      : step === 2
      ? ['done', 'active', 'inactive']
      : ['done', 'done', 'active'];

  const circleClass = (s: StepState) =>
    s === 'active'
      ? 'bg-ink text-paper'
      : s === 'done'
      ? 'bg-success-bg text-success-fg border border-[rgba(46,125,79,.25)]'
      : 'border border-line text-ink-3 bg-transparent';

  const labelClass = (s: StepState) =>
    s === 'active' ? 'text-ink' : s === 'done' ? 'text-success-fg' : 'text-ink-3';

  const line1Done = step > 1;
  const line2Done = step > 2;

  return (
    <div className="mb-8 w-full">
      {/* Track */}
      <div className="flex items-center w-full">
        <div
          className={`flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${circleClass(states[0])}`}
        >
          {states[0] === 'done' ? <CheckIcon /> : '1'}
        </div>
        <div className={`flex-1 h-px ${line1Done ? 'bg-[rgba(46,125,79,.3)]' : 'bg-line'}`} />
        <div
          className={`flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${circleClass(states[1])}`}
        >
          {states[1] === 'done' ? <CheckIcon /> : '2'}
        </div>
        <div className={`flex-1 h-px ${line2Done ? 'bg-[rgba(46,125,79,.3)]' : 'bg-line'}`} />
        <div
          className={`flex h-[26px] w-[26px] flex-shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${circleClass(states[2])}`}
        >
          {states[2] === 'done' ? <CheckIcon /> : '3'}
        </div>
      </div>
      {/* Labels */}
      <div className="mt-[7px] grid grid-cols-3">
        <span className={`text-left text-[10px] font-medium uppercase tracking-[.8px] ${labelClass(states[0])}`}>
          Nhập email
        </span>
        <span className={`text-center text-[10px] font-medium uppercase tracking-[.8px] ${labelClass(states[1])}`}>
          Mã OTP
        </span>
        <span className={`text-right text-[10px] font-medium uppercase tracking-[.8px] ${labelClass(states[2])}`}>
          Mật khẩu mới
        </span>
      </div>
    </div>
  );
};

// ─── Auth error box ───────────────────────────────────────────────────────────

const ErrorBox = ({ message }: { message: string }) => (
  <div
    className="mb-4 flex items-center gap-2 rounded-sm border border-[rgba(180,58,58,.18)] bg-danger-bg px-3.5 py-2.5 text-left text-[13px] text-danger-fg"
  >
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 5v3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="11" r=".8" fill="currentColor" />
    </svg>
    {message}
  </div>
);

// ─── Step 1: Email ────────────────────────────────────────────────────────────

const Step1 = ({
  onNext,
}: {
  onNext: (email: string) => void;
}) => {
  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailValues>({ resolver: zodResolver(emailSchema) });

  const onSubmit = async (values: EmailValues) => {
    setApiError(null);
    try {
      await forgotPassword({ email: values.email }).unwrap();
      onNext(values.email);
    } catch (err: unknown) {
      const e = err as { message?: string };
      // Show neutral/rate-limit message only
      setApiError(e?.message ?? 'Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau ít phút.');
      // Always proceed (neutral — don't reveal whether email exists)
      onNext(values.email);
    }
  };

  return (
    <>
      {/* Icon */}
      <div className="mx-auto mb-[18px] flex h-[52px] w-[52px] items-center justify-center rounded-full bg-warning-bg">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M12 5.5V13.5" stroke="#9A6B16" strokeWidth="2" strokeLinecap="round" />
          <circle cx="12" cy="18" r="1.5" fill="#9A6B16" />
        </svg>
      </div>

      <h2 className="mb-2 text-[22px] font-semibold tracking-[-0.4px] text-ink">Quên mật khẩu?</h2>
      <p className="mb-6 text-[13px] leading-[1.6] text-ink-2">
        Nhập email đã đăng ký. Chúng tôi sẽ gửi mã xác thực để đặt lại mật khẩu.
      </p>

      {apiError && <ErrorBox message={apiError} />}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3.5 text-left">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-ink" htmlFor="fp-email">
            Email
          </label>
          <input
            id="fp-email"
            type="email"
            placeholder="email@example.com"
            autoComplete="email"
            className="h-10 w-full rounded-sm border border-line bg-surface px-3 text-[14px] text-ink outline-none placeholder:text-ink-3 focus:border-ink"
            {...register('email')}
          />
          {errors.email && (
            <span className="text-[12px] text-danger-fg">{errors.email.message}</span>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="mt-0.5 flex h-12 w-full items-center justify-center rounded-sm bg-ink text-[11px] font-semibold uppercase tracking-[2px] text-paper disabled:opacity-60"
        >
          {isLoading ? 'Đang gửi...' : 'Gửi mã xác thực'}
        </button>

        <Link
          to="/login"
          className="flex w-full items-center justify-center gap-1 py-2 text-[13px] text-ink-2 hover:text-ink"
        >
          ← Quay lại đăng nhập
        </Link>
      </form>
    </>
  );
};

// ─── Step 2: OTP ──────────────────────────────────────────────────────────────

const Step2 = ({
  email,
  onNext,
  onBack,
}: {
  email: string;
  onNext: (resetToken: string) => void;
  onBack: () => void;
}) => {
  const [verifyOtp, { isLoading: isVerifying }] = useVerifyOtpMutation();
  const [resendOtp, { isLoading: isResending }] = useResendOtpMutation();

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [apiError, setApiError] = useState<string | null>(null);
  const [inputState, setInputState] = useState<'idle' | 'error' | 'success'>('idle');
  const [shake, setShake] = useState(false);
  const [cooldown, setCooldown] = useState(59);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startCooldown = useCallback((seconds: number) => {
    setCooldown(seconds);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  useEffect(() => {
    startCooldown(59);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startCooldown]);

  const code = digits.join('');
  const isComplete = code.length === 6;

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const next = [...digits];
    next[index] = value.slice(-1);
    setDigits(next);
    setInputState('idle');
    setApiError(null);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasted) return;
    const next = ['', '', '', '', '', ''];
    for (let i = 0; i < 6; i++) next[i] = pasted[i] ?? '';
    setDigits(next);
    setInputState('idle');
    setApiError(null);
    inputRefs.current[Math.min(pasted.length - 1, 5)]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete || isVerifying) return;
    setApiError(null);
    try {
      const data = await verifyOtp({ email, purpose: 'reset_password', code }).unwrap();
      setInputState('success');
      setTimeout(() => {
        if ('resetToken' in data) onNext(data.resetToken);
      }, 500);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setApiError(e?.message ?? 'Mã không đúng, vui lòng thử lại.');
      setInputState('error');
      setShake(true);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    setApiError(null);
    setInputState('idle');
    setDigits(['', '', '', '', '', '']);
    try {
      const result = await resendOtp({ email, purpose: 'reset_password' }).unwrap();
      const availableAt = new Date(result.resendAvailableAt).getTime();
      const secs = Math.max(1, Math.ceil((availableAt - Date.now()) / 1000));
      startCooldown(secs);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setApiError(e?.message ?? 'Không thể gửi lại mã, vui lòng thử lại sau.');
      startCooldown(60);
    }
  };

  const inputBorderClass = (digit: string) => {
    if (inputState === 'error') return 'border-danger-fg';
    if (inputState === 'success') return 'border-success-fg bg-success-bg';
    if (digit) return 'border-ink-2';
    return 'border-line';
  };

  return (
    <>
      {/* Icon */}
      <div className="mx-auto mb-[18px] flex h-[52px] w-[52px] items-center justify-center rounded-full bg-info-bg">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="5" width="20" height="14" rx="2" stroke="#3A5680" strokeWidth="1.5" />
          <path d="M2 7l10 7 10-7" stroke="#3A5680" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      </div>

      <h2 className="mb-2.5 text-[22px] font-semibold tracking-[-0.4px] text-ink">Xác thực email</h2>
      <p className="text-[13px] leading-[1.6] text-ink-2">Chúng tôi đã gửi mã 6 chữ số đến</p>
      <p className="mb-1 break-all text-[13px] font-semibold text-ink">{email}</p>
      <p className="mb-6 text-[12px] text-ink-3">Kiểm tra hộp thư spam nếu không thấy email</p>

      <form onSubmit={handleSubmit} noValidate>
        <div
          className={shake ? 'otp-inputs-shake' : ''}
          style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '8px' }}
          onPaste={handlePaste}
          onAnimationEnd={() => setShake(false)}
        >
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              placeholder="·"
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              className={`border bg-surface text-center font-bold tabular-nums outline-none transition-colors duration-[180ms] focus:border-ink ${inputBorderClass(digit)}`}
              style={{
                width: '48px',
                height: '56px',
                borderRadius: '2px',
                fontSize: '22px',
                fontVariantNumeric: 'tabular-nums',
              }}
            />
          ))}
        </div>

        {apiError && (
          <p className="mt-1.5 mb-1 text-[12px] text-danger-fg">{apiError}</p>
        )}

        <div className="my-3.5 text-center text-[13px] text-ink-3">
          {cooldown > 0 ? (
            <span>
              Gửi lại mã sau{' '}
              <span className="font-semibold tabular-nums">{cooldown}s</span>
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="font-medium text-accent hover:opacity-75 disabled:opacity-50"
            >
              {isResending ? 'Đang gửi...' : 'Gửi lại mã'}
            </button>
          )}
        </div>

        <button
          type="submit"
          disabled={!isComplete || isVerifying}
          className="flex w-full items-center justify-center gap-2 transition-opacity duration-200 hover:enabled:opacity-85 disabled:cursor-not-allowed"
          style={{
            height: '48px',
            background: isComplete && !isVerifying ? '#16161A' : '#ECEAE5',
            color: isComplete && !isVerifying ? '#FBFAF8' : '#A8A8AE',
            borderRadius: '2px',
            border: 'none',
            fontSize: '11px',
            fontWeight: 600,
            letterSpacing: '2px',
            textTransform: 'uppercase',
          }}
        >
          {isVerifying ? (
            <>
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full"
                style={{ border: '2px solid rgba(255,255,255,.3)', borderTopColor: 'white' }}
              />
              <span>Xác nhận</span>
            </>
          ) : (
            'Xác nhận'
          )}
        </button>
      </form>

      <p className="mt-3.5 text-[13px] text-ink-2">
        Sai email?{' '}
        <button
          type="button"
          onClick={onBack}
          className="font-medium text-ink hover:underline"
        >
          Nhập lại email
        </button>
      </p>

      <style>{`
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%      { transform: translateX(-5px); }
          40%      { transform: translateX(5px); }
          60%      { transform: translateX(-4px); }
          80%      { transform: translateX(4px); }
        }
        .otp-inputs-shake { animation: shake 380ms ease; }
      `}</style>
    </>
  );
};

// ─── Strength bar helpers ─────────────────────────────────────────────────────

const strengthLabel: Record<string, string> = { weak: 'Yếu', medium: 'Trung bình', strong: 'Mạnh' };
const strengthColor: Record<string, string> = {
  weak: '#B43A3A',
  medium: '#9A6B16',
  strong: '#2E7D4F',
};
const strengthBg: Record<string, string> = {
  weak: '#FBECEC',
  medium: '#FBF3E4',
  strong: '#ECF6EE',
};
const strengthBars: Record<string, number> = { weak: 1, medium: 2, strong: 3 };

// ─── Eye toggle icon ──────────────────────────────────────────────────────────

const EyeIcon = ({ open }: { open: boolean }) =>
  open ? (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M1 2L17 16M7.52 7.52A2.2 2.2 0 0 0 11.53 11M4.95 4.95C3.17 6.14 1.76 7.9 1.5 9c.74 2.77 3.9 5 7.5 5 1.38 0 2.67-.36 3.79-.98M7.5 4.08C8 4.03 8.5 4 9 4c3.6 0 6.76 2.23 7.5 5-.26 1-.88 2.01-1.75 2.89"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path
        d="M1.5 9C1.5 9 4.5 3.5 9 3.5S16.5 9 16.5 9 13.5 14.5 9 14.5 1.5 9 1.5 9z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  );

// ─── Step 3: New password ─────────────────────────────────────────────────────

const Step3 = ({ email, resetToken }: { email: string; resetToken: string }) => {
  const navigate = useNavigate();
  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const [apiError, setApiError] = useState<string | null>(null);
  const [succeeded, setSucceeded] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetValues>({ resolver: zodResolver(resetSchema) });

  const newPasswordValue = watch('newPassword') ?? '';
  const strength = newPasswordValue ? passwordStrength(newPasswordValue) : null;

  // Countdown after success
  useEffect(() => {
    if (!succeeded) return;
    if (countdown <= 0) {
      navigate('/login');
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [succeeded, countdown, navigate]);

  const onSubmit = async (values: ResetValues) => {
    setApiError(null);
    if (strength && strengthBars[strength] < 2) return;
    try {
      await resetPassword({ email, resetToken, newPassword: values.newPassword }).unwrap();
      setSucceeded(true);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setApiError(e?.message ?? 'Đã có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  if (succeeded) {
    return (
      <div className="flex flex-col items-center gap-3.5 py-2">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-bg">
          <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
            <path d="M7 15l6 6 10-10" stroke="#2E7D4F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <p className="text-[16px] font-semibold text-success-fg">Mật khẩu đã được đặt lại thành công!</p>
        <p className="text-center text-[13px] leading-[1.5] text-ink-2">
          Mật khẩu của bạn đã được cập nhật. Bạn sẽ được tự động chuyển đến trang đăng nhập.
        </p>
        <p className="text-[12px] tabular-nums text-ink-3">Chuyển hướng sau {countdown}s...</p>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="inline-flex h-11 items-center justify-center rounded-sm bg-ink px-7 text-[11px] font-semibold uppercase tracking-[2px] text-paper"
        >
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Icon */}
      <div className="mx-auto mb-[18px] flex h-[52px] w-[52px] items-center justify-center rounded-full bg-success-bg">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <rect x="6" y="11" width="12" height="9" rx="2" stroke="#2E7D4F" strokeWidth="1.5" />
          <path d="M9 11V8a3 3 0 016 0v3" stroke="#2E7D4F" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>

      <h2 className="mb-2 text-[22px] font-semibold tracking-[-0.4px] text-ink">Đặt mật khẩu mới</h2>
      <p className="mb-6 text-[13px] leading-[1.6] text-ink-2">
        Mật khẩu mới phải khác mật khẩu cũ, tối thiểu 9 ký tự gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
      </p>

      {apiError && <ErrorBox message={apiError} />}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3.5 text-left">
        {/* New password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-ink" htmlFor="fp-new-pwd">
            Mật khẩu mới
          </label>
          <div className="relative">
            <input
              id="fp-new-pwd"
              type={showNew ? 'text' : 'password'}
              placeholder="Tối thiểu 9 ký tự"
              autoComplete="new-password"
              className={`h-10 w-full rounded-sm border bg-surface py-0 pl-3 pr-11 text-[14px] text-ink outline-none placeholder:text-ink-3 focus:border-ink ${errors.newPassword ? 'border-danger-fg' : 'border-line'}`}
              {...register('newPassword')}
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
              aria-label={showNew ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              <EyeIcon open={showNew} />
            </button>
          </div>
          {/* Strength bar */}
          {newPasswordValue && strength && (
            <>
              <div className="flex gap-1">
                {[1, 2, 3].map((bar) => (
                  <div
                    key={bar}
                    className="flex-1 h-[3px] rounded-full transition-colors"
                    style={{
                      background: bar <= strengthBars[strength] ? strengthBg[strength] : '#ECEAE5',
                      ...(bar <= strengthBars[strength] ? { background: strengthColor[strength] + '33' } : {}),
                    }}
                  />
                ))}
              </div>
              <span className="text-[11px] tracking-[.2px]" style={{ color: strengthColor[strength] }}>
                {strengthLabel[strength]}
              </span>
            </>
          )}
          {!newPasswordValue && (
            <span className="text-[11px] tracking-[.2px] text-ink-3">Nhập mật khẩu để kiểm tra độ mạnh</span>
          )}
          {errors.newPassword && (
            <span className="text-[12px] text-danger-fg">{errors.newPassword.message}</span>
          )}
        </div>

        {/* Confirm password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-medium text-ink" htmlFor="fp-confirm-pwd">
            Xác nhận mật khẩu mới
          </label>
          <div className="relative">
            <input
              id="fp-confirm-pwd"
              type={showConfirm ? 'text' : 'password'}
              placeholder="Nhập lại mật khẩu"
              autoComplete="new-password"
              className={`h-10 w-full rounded-sm border bg-surface py-0 pl-3 pr-11 text-[14px] text-ink outline-none placeholder:text-ink-3 focus:border-ink ${errors.confirm ? 'border-danger-fg' : 'border-line'}`}
              {...register('confirm')}
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink"
              aria-label={showConfirm ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
            >
              <EyeIcon open={showConfirm} />
            </button>
          </div>
          {errors.confirm && (
            <span className="text-[12px] text-danger-fg">{errors.confirm.message}</span>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading || (strength !== null && strengthBars[strength ?? 'weak'] < 2)}
          className="mt-0.5 flex h-12 w-full items-center justify-center rounded-sm bg-ink text-[11px] font-semibold uppercase tracking-[2px] text-paper disabled:opacity-60"
        >
          {isLoading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
        </button>
      </form>
    </>
  );
};

// ─── Main page ────────────────────────────────────────────────────────────────

export const ForgotPasswordPage = () => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');

  const handleStep1Next = (e: string) => {
    setEmail(e);
    setStep(2);
  };

  const handleStep2Next = (token: string) => {
    setResetToken(token);
    setStep(3);
  };

  const handleBackToStep1 = () => {
    setStep(1);
  };

  // Topbar right link changes per step
  const topbarRight =
    step === 2 ? (
      <button
        type="button"
        onClick={handleBackToStep1}
        className="flex items-center gap-1.5 text-[13px] transition-colors hover:text-paper"
        style={{ color: 'rgba(251,250,248,.5)' }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Quay lại bước trước
      </button>
    ) : (
      <Link
        to="/login"
        className="flex items-center gap-1.5 text-[13px] transition-colors hover:text-paper"
        style={{ color: 'rgba(251,250,248,.5)' }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Quay lại đăng nhập
      </Link>
    );

  return (
    <div className="flex min-h-screen flex-col" style={{ backgroundColor: '#1A1A28' }}>
      {/* Topbar */}
      <header
        className="flex h-16 flex-shrink-0 items-center justify-between px-10"
        style={{ borderBottom: '1px solid rgba(255,255,255,.06)' }}
      >
        <Link
          to="/"
          className="text-[16px] font-semibold uppercase tracking-[2px] text-paper transition-opacity duration-200 hover:opacity-70"
        >
          Athena
        </Link>
        {topbarRight}
      </header>

      {/* Main */}
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div
          className="w-full max-w-[420px] rounded-modal bg-surface text-center"
          style={{
            padding: '36px 40px 40px',
            boxShadow: '0 8px 40px rgba(0,0,0,.28)',
            animation: 'cardIn 320ms cubic-bezier(.22,.61,.36,1) both',
          }}
        >
          <Stepper step={step} />

          {step === 1 && <Step1 onNext={handleStep1Next} />}
          {step === 2 && <Step2 email={email} onNext={handleStep2Next} onBack={handleBackToStep1} />}
          {step === 3 && <Step3 email={email} resetToken={resetToken} />}
        </div>
      </main>

      <style>{`
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
