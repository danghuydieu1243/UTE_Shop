import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVerifyOtpMutation, useResendOtpMutation } from '../authApi';

interface Props {
  email: string;
  purpose: 'register' | 'reset_password';
}

export const OtpForm = ({ email, purpose }: Props) => {
  const navigate = useNavigate();
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
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
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
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] ?? '';
    }
    setDigits(next);
    setInputState('idle');
    setApiError(null);
    const lastFilled = Math.min(pasted.length - 1, 5);
    inputRefs.current[lastFilled]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete || isVerifying) return;
    setApiError(null);
    try {
      const data = await verifyOtp({ email, purpose, code }).unwrap();
      // Flash success state on inputs before redirecting
      setInputState('success');
      setTimeout(() => {
        if (purpose === 'reset_password' && 'resetToken' in data) {
          navigate(`/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(data.resetToken)}`);
        } else if ('redirect' in data) {
          navigate((data as { redirect: string }).redirect);
        }
      }, 600);
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      setApiError(e?.data?.message ?? 'Mã không đúng, vui lòng thử lại.');
      setInputState('error');
      // Trigger shake animation
      setShake(true);
      // Reset OTP inputs on error
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleShakeEnd = () => setShake(false);

  const handleResend = async () => {
    setApiError(null);
    setInputState('idle');
    setDigits(['', '', '', '', '', '']);
    try {
      const result = await resendOtp({ email, purpose }).unwrap();
      const availableAt = new Date(result.resendAvailableAt).getTime();
      const now = Date.now();
      const secs = Math.max(1, Math.ceil((availableAt - now) / 1000));
      startCooldown(secs);
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      setApiError(e?.data?.message ?? 'Không thể gửi lại mã, vui lòng thử lại sau.');
      startCooldown(60);
    }
  };

  // Per-input border class based on state
  const inputBorderClass = (digit: string) => {
    if (inputState === 'error') return 'border-danger-fg';
    if (inputState === 'success') return 'border-success-fg bg-success-bg';
    if (digit) return 'border-ink-2';
    return 'border-line';
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* OTP inputs row */}
      <div
        className={shake ? 'otp-inputs-shake' : ''}
        style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '8px' }}
        onPaste={handlePaste}
        onAnimationEnd={handleShakeEnd}
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

      {/* Error message — below inputs, hidden by default */}
      {apiError && (
        <p
          className="text-danger-fg"
          style={{ fontSize: '12px', marginTop: '8px', marginBottom: '4px' }}
        >
          {apiError}
        </p>
      )}

      {/* Resend countdown */}
      <div
        className="text-center text-ink-3"
        style={{ fontSize: '13px', margin: '16px 0 20px' }}
      >
        {cooldown > 0 ? (
          <span>
            Gửi lại mã sau{' '}
            <span className="tabular-nums font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {cooldown}s
            </span>
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="font-medium text-accent transition-opacity duration-[180ms] hover:opacity-75 disabled:opacity-50"
          >
            {isResending ? 'Đang gửi...' : 'Gửi lại mã'}
          </button>
        )}
      </div>

      {/* Submit button — full-width, 48px, disabled until 6 digits */}
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
            <span>XÁC NHẬN</span>
          </>
        ) : (
          'XÁC NHẬN'
        )}
      </button>

      {/* Shake + input focus animations */}
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
    </form>
  );
};
