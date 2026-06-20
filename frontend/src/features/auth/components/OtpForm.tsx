import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Alert } from '../../../shared/ui';
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
  const [cooldown, setCooldown] = useState(60);
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
    startCooldown(60);
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
    const next = [...digits];
    for (let i = 0; i < 6; i++) {
      next[i] = pasted[i] ?? '';
    }
    setDigits(next);
    const lastFilled = Math.min(pasted.length - 1, 5);
    inputRefs.current[lastFilled]?.focus();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete) return;
    setApiError(null);
    try {
      const data = await verifyOtp({ email, purpose, code }).unwrap();
      if (purpose === 'reset_password' && 'resetToken' in data) {
        navigate(`/reset-password?email=${encodeURIComponent(email)}&token=${encodeURIComponent(data.resetToken)}`);
      } else if ('redirect' in data) {
        navigate((data as { redirect: string }).redirect);
      }
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      setApiError(e?.data?.message ?? 'Mã không đúng, vui lòng thử lại.');
      // Reset OTP inputs on error
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    }
  };

  const handleResend = async () => {
    setApiError(null);
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

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col items-center gap-5">
      {apiError && <Alert kind="danger">{apiError}</Alert>}

      {/* OTP inputs */}
      <div className="flex gap-2" onPaste={handlePaste}>
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
            className={`h-14 w-12 rounded border bg-surface text-center text-[22px] font-bold tabular-nums outline-none transition-colors focus:border-ink ${
              digit ? 'border-ink' : 'border-line'
            }`}
            style={{ borderRadius: '2px' }}
          />
        ))}
      </div>

      {/* Resend */}
      <div className="text-center text-sm text-ink-2">
        {cooldown > 0 ? (
          <span>
            Gửi lại mã sau{' '}
            <span className="tabular-nums font-medium text-ink">{cooldown}s</span>
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending}
            className="text-accent hover:underline disabled:opacity-50"
          >
            {isResending ? 'Đang gửi...' : 'Gửi lại mã'}
          </button>
        )}
      </div>

      <Button
        type="submit"
        disabled={!isComplete}
        loading={isVerifying}
        className="h-12 w-full"
      >
        XÁC NHẬN
      </Button>
    </form>
  );
};
