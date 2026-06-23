import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Input, Alert } from '../../../shared/ui';
import { useForgotPasswordMutation } from '../authApi';
import { OtpForm } from './OtpForm';

const emailSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

type EmailValues = z.infer<typeof emailSchema>;

export const ForgotForm = () => {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const [forgotPassword, { isLoading }] = useForgotPasswordMutation();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
  });

  const onSubmit = async (values: EmailValues) => {
    setApiError(null);
    setSuccessMsg(null);
    try {
      const data = await forgotPassword({ email: values.email }).unwrap();
      setEmail(values.email);
      setSuccessMsg(data.message);
      setStep(2);
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      setApiError(e?.message ?? 'Đã có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Stepper */}
      <div className="flex items-center gap-0">
        {/* Step 1 */}
        <div className="flex flex-1 flex-col items-center gap-1">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
              step === 1
                ? 'bg-ink text-paper'
                : 'bg-success-fg text-paper'
            }`}
          >
            {step > 1 ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              '1'
            )}
          </div>
          <span className={`text-[11px] font-medium ${step === 1 ? 'text-ink' : 'text-ink-2'}`}>
            Nhập email
          </span>
        </div>

        {/* Connector */}
        <div
          className={`mb-5 h-px flex-1 transition-colors ${step === 2 ? 'bg-ink' : 'bg-line'}`}
        />

        {/* Step 2 */}
        <div className="flex flex-1 flex-col items-center gap-1">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
              step === 2 ? 'bg-ink text-paper' : 'bg-line text-ink-2'
            }`}
          >
            2
          </div>
          <span className={`text-[11px] font-medium ${step === 2 ? 'text-ink' : 'text-ink-2'}`}>
            Mã OTP
          </span>
        </div>
      </div>

      {/* Step 1: email */}
      {step === 1 && (
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          {apiError && <Alert kind="danger">{apiError}</Alert>}

          <Input
            label="Email"
            type="email"
            placeholder="email@example.com"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />

          <Button type="submit" loading={isLoading} className="h-12 w-full">
            GỬI MÃ XÁC NHẬN
          </Button>
        </form>
      )}

      {/* Step 2: OTP */}
      {step === 2 && (
        <div className="flex flex-col gap-4">
          {successMsg && <Alert kind="info">{successMsg}</Alert>}

          <p className="text-center text-[13px] text-ink-2">
            Nhập mã 6 chữ số đã gửi đến{' '}
            <span className="font-semibold text-ink">{email}</span>
          </p>

          <OtpForm email={email} purpose="reset_password" />

          <button
            type="button"
            onClick={() => {
              setStep(1);
              setSuccessMsg(null);
              setApiError(null);
            }}
            className="mt-1 text-center text-sm text-ink-2 hover:text-ink hover:underline"
          >
            ← Nhập lại email
          </button>
        </div>
      )}
    </div>
  );
};
