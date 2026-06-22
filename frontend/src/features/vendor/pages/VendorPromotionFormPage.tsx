import { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { VendorShell } from '../components/VendorShell';
import {
  useCreateCouponMutation,
  useUpdateCouponMutation,
} from '../vendorCouponsApi';
import type { Coupon } from '../couponTypes';

// ── Zod schema ─────────────────────────────────────────────────────────────────
const couponFormSchema = z.object({
  code: z
    .string()
    .min(1, 'Mã giảm giá không được để trống')
    .max(50, 'Mã quá dài')
    .regex(/^[A-Z0-9_-]+$/, 'Mã chỉ dùng chữ HOA, số, gạch ngang'),
  type: z.enum(['percent', 'fixed']),
  value: z.number({ invalid_type_error: 'Giá trị phải là số' }),
  minOrder: z.preprocess(
    (v) => (v === '' || v == null || (typeof v === 'number' && isNaN(v)) ? undefined : v),
    z.number().min(0).optional(),
  ),
  maxUses: z.preprocess(
    (v) => (v === '' || v == null || (typeof v === 'number' && isNaN(v)) ? undefined : v),
    z.number().int().min(1).optional(),
  ),
  maxUsesPerUser: z.preprocess(
    (v) => (v === '' || v == null || (typeof v === 'number' && isNaN(v)) ? undefined : v),
    z.number().int().min(1).optional(),
  ),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  status: z.enum(['scheduled', 'running', 'ended', 'disabled']).optional(),
}).superRefine((data, ctx) => {
  if (data.type === 'percent' && (data.value < 1 || data.value > 100)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Phần trăm phải từ 1 đến 100',
      path: ['value'],
    });
  }
  if (data.type === 'fixed' && data.value < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Số tiền giảm phải ít nhất 1đ',
      path: ['value'],
    });
  }
});

type FormValues = z.infer<typeof couponFormSchema>;

// ── Design tokens ──────────────────────────────────────────────────────────────
const T = {
  ink: '#16161A',
  ink2: '#6B6B73',
  ink3: '#A8A8AE',
  paper: '#FBFAF8',
  surface: '#FFFFFF',
  line: '#ECEAE5',
  danger: '#B43A3A',
  dangerBg: '#FBECEC',
  coverBg: '#F4F2ED',
};

// ── Friendly API error messages ────────────────────────────────────────────────
function friendlyError(code?: string, fallback?: string): string {
  const map: Record<string, string> = {
    COUPON_DUPLICATE: 'Mã giảm giá này đã tồn tại. Vui lòng dùng mã khác.',
    VALIDATION_ERROR: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
  };
  if (code && map[code]) return map[code];
  return fallback ?? 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

// ── Card ───────────────────────────────────────────────────────────────────────
const Card = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div style={{ background: T.surface, border: `1px solid ${T.line}`, borderRadius: '2px', marginBottom: '16px' }}>
    <div style={{ padding: '16px 20px 14px', borderBottom: `1px solid ${T.line}` }}>
      <span style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' as const, color: T.ink3 }}>
        {label}
      </span>
    </div>
    <div style={{ padding: '20px' }}>{children}</div>
  </div>
);

// ── Field ──────────────────────────────────────────────────────────────────────
const Field = ({ label, req, error, children }: { label: string; req?: boolean; error?: string; children: React.ReactNode }) => (
  <div style={{ marginBottom: '18px' }}>
    <div style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase' as const, color: T.ink2, marginBottom: '6px' }}>
      {label}{req && <span style={{ color: T.danger, marginLeft: '4px' }}>*</span>}
    </div>
    {children}
    {error && <div style={{ fontSize: '11px', color: T.danger, marginTop: '4px' }}>{error}</div>}
  </div>
);

// ── Input style ────────────────────────────────────────────────────────────────
const inputStyle = (hasError?: boolean): React.CSSProperties => ({
  width: '100%', height: '36px', padding: '0 12px',
  border: `1px solid ${hasError ? T.danger : T.line}`, borderRadius: '2px',
  background: T.surface, fontSize: '13px', fontFamily: "'Inter', sans-serif",
  color: T.ink, outline: 'none',
});

// ── Main component ─────────────────────────────────────────────────────────────
export const VendorPromotionFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const isEdit = Boolean(id);

  const existingCoupon = (location.state as { coupon?: Coupon } | null)?.coupon ?? null;

  const [createCoupon, { isLoading: isCreating }] = useCreateCouponMutation();
  const [updateCoupon, { isLoading: isUpdating }] = useUpdateCouponMutation();
  const isSubmitting = isCreating || isUpdating;

  const [apiError, setApiError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: { type: 'percent', value: undefined as unknown as number },
  });

  const typeValue = watch('type');

  // ── Prefill edit mode ──
  useEffect(() => {
    if (isEdit && existingCoupon && !prefilled) {
      reset({
        code: existingCoupon.code,
        type: existingCoupon.type,
        value: existingCoupon.value,
        minOrder: existingCoupon.min_order ?? undefined,
        maxUses: existingCoupon.max_uses ?? undefined,
        maxUsesPerUser: existingCoupon.max_uses_per_user ?? undefined,
        startsAt: existingCoupon.starts_at
          ? existingCoupon.starts_at.slice(0, 10)
          : '',
        endsAt: existingCoupon.ends_at
          ? existingCoupon.ends_at.slice(0, 10)
          : '',
        status: existingCoupon.status,
      });
      setPrefilled(true);
    }
  }, [isEdit, existingCoupon, prefilled, reset]);

  const onSubmit = handleSubmit(async (values) => {
    setApiError(null);
    const payload = {
      code: values.code,
      type: values.type,
      value: values.value,
      minOrder: values.minOrder,
      maxUses: values.maxUses,
      maxUsesPerUser: values.maxUsesPerUser,
      startsAt: values.startsAt || undefined,
      endsAt: values.endsAt || undefined,
      status: values.status,
    };

    try {
      if (isEdit && id) {
        await updateCoupon({ id: Number(id), data: payload }).unwrap();
      } else {
        await createCoupon(payload).unwrap();
      }
      navigate('/vendor/promotions');
    } catch (err: unknown) {
      const e = err as { data?: { code?: string; message?: string } };
      setApiError(friendlyError(e?.data?.code, e?.data?.message));
    }
  });

  // ── Topbar breadcrumb ──
  const breadcrumb = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: T.ink2, flex: 1 }}>
      <Link to="/vendor/promotions" style={{ color: T.ink2, textDecoration: 'none' }}>
        Khuyến mãi
      </Link>
      <span style={{ color: T.ink3, fontSize: '12px' }}>/</span>
      <span style={{ color: T.ink, fontWeight: 500 }}>
        {isEdit && existingCoupon ? `Sửa: ${existingCoupon.code}` : 'Tạo mã giảm giá'}
      </span>
    </div>
  );

  const topbarActions = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <Link
        to="/vendor/promotions"
        style={{
          height: '32px', padding: '0 14px', background: 'none', color: T.ink,
          fontSize: '11px', fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase' as const,
          border: `1px solid ${T.line}`, borderRadius: '2px', cursor: 'pointer',
          textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
        }}
      >
        Hủy
      </Link>
      <button
        type="button"
        onClick={onSubmit}
        disabled={isSubmitting}
        style={{
          height: '32px', padding: '0 14px', background: T.ink, color: '#FBFAF8',
          fontSize: '11px', fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase' as const,
          border: 'none', borderRadius: '2px',
          cursor: isSubmitting ? 'not-allowed' : 'pointer',
          opacity: isSubmitting ? 0.4 : 1,
        }}
      >
        Lưu mã giảm giá
      </button>
    </div>
  );

  return (
    <VendorShell title={breadcrumb} actions={topbarActions}>
      <form onSubmit={onSubmit} noValidate style={{ padding: '0 0 40px' }}>
        {/* API error banner */}
        {apiError && (
          <div
            style={{
              background: T.dangerBg, color: T.danger, border: `1px solid rgba(180,58,58,.18)`,
              borderRadius: '2px', padding: '10px 14px', fontSize: '13px', marginBottom: '16px',
              display: 'flex', alignItems: 'center', gap: '8px',
            }}
          >
            {apiError}
          </div>
        )}

        {/* ── Card: Thông tin mã ── */}
        <Card label="Thông tin mã">
          <Field label="Mã giảm giá" req error={errors.code?.message}>
            <input
              type="text"
              placeholder="SUMMER20"
              style={inputStyle(!!errors.code)}
              {...register('code')}
            />
          </Field>

          <Field label="Loại giảm giá" req>
            <div style={{ display: 'flex', gap: '12px' }}>
              {(['percent', 'fixed'] as const).map((t) => (
                <label
                  key={t}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 16px', border: `1px solid ${typeValue === t ? T.ink : T.line}`,
                    borderRadius: '2px', cursor: 'pointer', flex: 1, fontSize: '13px',
                    background: typeValue === t ? T.ink : T.surface,
                    color: typeValue === t ? '#FBFAF8' : T.ink,
                  }}
                >
                  <input type="radio" value={t} style={{ display: 'none' }} {...register('type')} />
                  {t === 'percent' ? 'Phần trăm (%)' : 'Số tiền cố định (đ)'}
                </label>
              ))}
            </div>
          </Field>

          <Field label="Giá trị" req error={errors.value?.message}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="number"
                placeholder="0"
                min={1}
                style={{ ...inputStyle(!!errors.value), borderRadius: '2px 0 0 2px', flex: 1 }}
                {...register('value', { valueAsNumber: true })}
              />
              <span
                style={{
                  height: '36px', padding: '0 12px', background: T.coverBg,
                  border: `1px solid ${T.line}`, borderLeft: 'none', borderRadius: '0 2px 2px 0',
                  fontSize: '13px', color: T.ink3, display: 'flex', alignItems: 'center',
                }}
              >
                {typeValue === 'percent' ? '%' : 'đ'}
              </span>
            </div>
          </Field>

          <Field label="Đơn hàng tối thiểu">
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <input
                type="number"
                placeholder="0"
                min={0}
                style={{ ...inputStyle(), borderRadius: '2px 0 0 2px', flex: 1 }}
                {...register('minOrder', { valueAsNumber: true })}
              />
              <span
                style={{
                  height: '36px', padding: '0 12px', background: T.coverBg,
                  border: `1px solid ${T.line}`, borderLeft: 'none', borderRadius: '0 2px 2px 0',
                  fontSize: '13px', color: T.ink3, display: 'flex', alignItems: 'center',
                }}
              >
                đ
              </span>
            </div>
          </Field>
        </Card>

        {/* ── Card: Giới hạn & thời gian ── */}
        <Card label="Giới hạn & thời gian">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Field label="Số lần dùng tối đa">
              <input
                type="number"
                placeholder="Không giới hạn"
                min={1}
                style={inputStyle()}
                {...register('maxUses', { valueAsNumber: true })}
              />
            </Field>
            <Field label="Mỗi khách tối đa">
              <input
                type="number"
                placeholder="Không giới hạn"
                min={1}
                style={inputStyle()}
                {...register('maxUsesPerUser', { valueAsNumber: true })}
              />
            </Field>
            <Field label="Ngày bắt đầu">
              <input
                type="date"
                style={inputStyle()}
                {...register('startsAt')}
              />
            </Field>
            <Field label="Ngày kết thúc">
              <input
                type="date"
                style={inputStyle()}
                {...register('endsAt')}
              />
            </Field>
          </div>
        </Card>

        {/* ── Card: Trạng thái ── */}
        <Card label="Trạng thái">
          <select
            style={{ ...inputStyle(), cursor: 'pointer' }}
            {...register('status')}
          >
            <option value="scheduled">Lên lịch</option>
            <option value="running">Đang chạy</option>
            <option value="disabled">Đã tắt</option>
          </select>
        </Card>
      </form>
    </VendorShell>
  );
};
