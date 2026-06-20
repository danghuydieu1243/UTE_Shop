import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Alert } from '../../../shared/ui';
import { useUpdateProfileMutation } from '../profileApi';
import type { User } from '../../../shared/types/auth';

interface Props {
  user: User;
}

const profileSchema = z.object({
  fullName: z.string().min(2, 'Tối thiểu 2 ký tự'),
  phone: z.string().optional(),
});

type FormValues = z.infer<typeof profileSchema>;

const roleLabel: Record<string, string> = {
  user: 'Người mua',
  vendor: 'Người bán',
  manager: 'Quản lý',
  admin: 'Quản trị viên',
};

function getInitials(fullName: string, maxLen = 2): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, maxLen).toUpperCase();
  return parts
    .slice(0, maxLen)
    .map((p) => p.charAt(0))
    .join('')
    .toUpperCase();
}

export const ProfileEditForm = ({ user }: Props) => {
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: user.fullName,
      phone: user.phone ?? '',
    },
  });

  // Sync form when user prop changes
  useEffect(() => {
    reset({
      fullName: user.fullName,
      phone: user.phone ?? '',
    });
  }, [user, reset]);

  const onSubmit = async (values: FormValues) => {
    setApiError(null);
    setSuccessMsg(null);
    try {
      await updateProfile({
        fullName: values.fullName,
        phone: values.phone || undefined,
      }).unwrap();
      setSuccessMsg('Cập nhật thành công!');
    } catch (err: unknown) {
      const e = err as { data?: { code?: string; message?: string } };
      setApiError(e?.data?.message ?? 'Đã có lỗi xảy ra, vui lòng thử lại.');
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {successMsg && <div className="mb-5"><Alert kind="success">{successMsg}</Alert></div>}
      {apiError && <div className="mb-5"><Alert kind="danger">{apiError}</Alert></div>}

      {/* Avatar row */}
      <div className="flex items-center gap-5 mb-7 pb-7 border-b border-line">
        <div className="w-[96px] h-[96px] rounded-full bg-ink text-paper text-[28px] font-semibold flex items-center justify-center flex-shrink-0">
          {getInitials(user.fullName)}
        </div>
        <div className="flex-1">
          <p className="text-[16px] font-semibold text-ink mb-1">{user.fullName}</p>
          <p className="text-[12px] text-ink-3 leading-[1.6] mb-3">
            Ảnh đại diện giúp mọi người nhận ra bạn dễ dàng hơn.
            <br />
            Chấp nhận JPG, PNG. Tối đa 2MB.
          </p>
          <button
            type="button"
            className="h-[34px] px-4 border border-line rounded bg-surface text-ink text-[11px] font-semibold tracking-[1px] uppercase inline-flex items-center gap-1.5 cursor-pointer"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
            Thay đổi ảnh
          </button>
        </div>
        {/* Role badge */}
        <span className="inline-flex items-center rounded border border-line bg-cover-bg px-3 py-1.5 text-xs font-medium text-ink-2 self-start">
          {roleLabel[user.role] ?? user.role}
        </span>
      </div>

      {/* Form grid */}
      <div className="grid grid-cols-2 gap-5">
        {/* Full name - full width */}
        <div className="col-span-2">
          <label className="block">
            <span className="block text-[11px] font-medium uppercase tracking-[0.5px] text-ink-3 mb-1.5">
              Họ và tên
            </span>
            <input
              type="text"
              placeholder="Nguyễn Văn A"
              autoComplete="name"
              className={`h-[42px] px-[14px] border rounded bg-surface text-[14px] text-ink outline-none w-full focus:border-ink transition-colors ${
                errors.fullName ? 'border-danger-fg' : 'border-line'
              }`}
              {...register('fullName')}
            />
          </label>
          {errors.fullName && (
            <p className="text-[11px] text-danger-fg mt-0.5">{errors.fullName.message}</p>
          )}
        </div>

        {/* Email - left col */}
        <div>
          <label className="block">
            <span className="block text-[11px] font-medium uppercase tracking-[0.5px] text-ink-3 mb-1.5">
              Email
            </span>
            <div className="relative">
              <input
                type="email"
                value={user.email}
                disabled
                className="h-[42px] px-[14px] pr-[44px] border border-line rounded bg-cover-bg text-[14px] text-ink-3 cursor-not-allowed outline-none w-full"
              />
              <span className="absolute right-[14px] top-1/2 -translate-y-1/2 text-ink-3">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
              </span>
            </div>
          </label>
          <p className="text-[11px] text-ink-3 mt-0.5">Không thể thay đổi email</p>
        </div>

        {/* Phone - right col */}
        <div>
          <label className="block">
            <span className="block text-[11px] font-medium uppercase tracking-[0.5px] text-ink-3 mb-1.5">
              Số điện thoại
            </span>
            <input
              type="tel"
              placeholder="0901234567"
              autoComplete="tel"
              className={`h-[42px] px-[14px] border rounded bg-surface text-[14px] text-ink outline-none w-full focus:border-ink transition-colors ${
                errors.phone ? 'border-danger-fg' : 'border-line'
              }`}
              {...register('phone')}
            />
          </label>
          {errors.phone && (
            <p className="text-[11px] text-danger-fg mt-0.5">{errors.phone.message}</p>
          )}
        </div>

        {/* Gender - left col (display only, not submitted) */}
        <div>
          <label className="block">
            <span className="block text-[11px] font-medium uppercase tracking-[0.5px] text-ink-3 mb-1.5">
              Giới tính
            </span>
            <div className="relative">
              <select
                className="h-[42px] px-[14px] pr-[36px] border border-line rounded bg-surface text-[14px] text-ink outline-none w-full appearance-none focus:border-ink transition-colors cursor-pointer"
                defaultValue=""
              >
                <option value="" disabled>Chọn giới tính</option>
                <option value="male">Nam</option>
                <option value="female">Nữ</option>
                <option value="other">Khác</option>
              </select>
              <span className="absolute right-[14px] top-1/2 -translate-y-1/2 pointer-events-none text-ink-3">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </span>
            </div>
          </label>
        </div>

        {/* Birthday - right col (display only, not submitted) */}
        <div>
          <label className="block">
            <span className="block text-[11px] font-medium uppercase tracking-[0.5px] text-ink-3 mb-1.5">
              Ngày sinh
            </span>
            <input
              type="text"
              placeholder="dd/mm/yyyy"
              className="h-[42px] px-[14px] border border-line rounded bg-surface text-[14px] text-ink outline-none w-full focus:border-ink transition-colors"
            />
          </label>
        </div>
      </div>

      {/* Form actions */}
      <div className="flex items-center gap-3 mt-7 pt-6 border-t border-line">
        <button
          type="submit"
          disabled={isLoading}
          className="h-[42px] px-7 bg-ink text-paper border-none rounded text-[11px] font-semibold tracking-[1.5px] uppercase cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
        </button>
        <button
          type="button"
          className="h-[42px] px-6 border border-line rounded bg-transparent text-ink-2 text-[11px] font-semibold tracking-[1.5px] uppercase cursor-pointer hover:text-ink hover:border-ink transition-colors"
          onClick={() => reset({ fullName: user.fullName, phone: user.phone ?? '' })}
        >
          Hủy
        </button>
      </div>
    </form>
  );
};
