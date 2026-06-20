import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { Button, Input, Alert } from '../../../shared/ui';
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
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {successMsg && <Alert kind="success">{successMsg}</Alert>}
      {apiError && <Alert kind="danger">{apiError}</Alert>}

      {/* Email — read-only */}
      <div>
        <label className="block">
          <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[1.5px] text-ink-2">
            Email
          </span>
          <input
            type="email"
            value={user.email}
            disabled
            className="w-full cursor-not-allowed rounded border border-line bg-cover-bg px-3 py-2.5 text-sm text-ink-2 outline-none"
          />
        </label>
        <p className="mt-1 text-[11px] text-ink-3">Không thể thay đổi email</p>
      </div>

      {/* Role display */}
      <div>
        <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-[1.5px] text-ink-2">
          Loại tài khoản
        </span>
        <span className="inline-flex items-center rounded border border-line bg-cover-bg px-3 py-1.5 text-xs font-medium text-ink-2">
          {roleLabel[user.role] ?? user.role}
        </span>
      </div>

      <Input
        label="Họ và tên"
        type="text"
        placeholder="Nguyễn Văn A"
        autoComplete="name"
        error={errors.fullName?.message}
        {...register('fullName')}
      />

      <Input
        label="Số điện thoại"
        type="tel"
        placeholder="0901234567"
        autoComplete="tel"
        error={errors.phone?.message}
        {...register('phone')}
      />

      <Button type="submit" loading={isLoading} className="h-12 w-full">
        LƯU THAY ĐỔI
      </Button>

      <div className="text-center text-sm text-ink-2">
        <Link to="/user/change-password" className="font-medium text-ink hover:underline">
          Đổi mật khẩu
        </Link>
      </div>
    </form>
  );
};
