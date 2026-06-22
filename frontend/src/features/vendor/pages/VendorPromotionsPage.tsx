import { useState } from 'react';
import { Link } from 'react-router-dom';
import { VendorShell } from '../components/VendorShell';
import {
  useGetVendorCouponsQuery,
  useDeleteCouponMutation,
} from '../vendorCouponsApi';
import type { Coupon, CouponStatus } from '../couponTypes';

// ── Design tokens ─────────────────────────────────────────────────────────────
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

// ── Status pill ───────────────────────────────────────────────────────────────
const StatusPill = ({ status }: { status: CouponStatus }) => {
  const styles: Record<CouponStatus, React.CSSProperties> = {
    running:   { color: '#2E7D4F', background: '#ECF6EE' },
    scheduled: { color: '#3A5680', background: '#EDF1F6' },
    ended:     { color: '#A8A8AE', background: '#F4F3F0' },
    disabled:  { color: '#B43A3A', background: '#FBECEC' },
  };
  const labels: Record<CouponStatus, string> = {
    running:   'Đang chạy',
    scheduled: 'Lên lịch',
    ended:     'Đã kết thúc',
    disabled:  'Đã tắt',
  };
  return (
    <span
      style={{
        fontSize: '9px',
        fontWeight: 600,
        letterSpacing: '.8px',
        textTransform: 'uppercase',
        padding: '2px 7px',
        borderRadius: '2px',
        ...styles[status],
      }}
    >
      {labels[status]}
    </span>
  );
};

// ── Confirm dialog ────────────────────────────────────────────────────────────
interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}
const ConfirmDialog = ({ title, message, onConfirm, onCancel }: ConfirmDialogProps) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-label={title}
    style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(22,22,26,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
  >
    <div
      style={{
        background: '#FFFFFF', borderRadius: '4px', padding: '28px 28px 24px',
        maxWidth: '420px', width: '90%', border: '1px solid #ECEAE5',
      }}
    >
      <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '10px' }}>{title}</h2>
      <p style={{ fontSize: '13px', color: '#6B6B73', marginBottom: '22px', lineHeight: 1.6 }}>{message}</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button
          onClick={onCancel}
          style={{
            height: '32px', padding: '0 14px', background: 'none', color: '#16161A',
            fontSize: '11px', fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase',
            border: '1px solid #ECEAE5', borderRadius: '2px', cursor: 'pointer',
          }}
        >
          Hủy
        </button>
        <button
          onClick={onConfirm}
          style={{
            height: '32px', padding: '0 14px', background: '#B43A3A', color: '#FFFFFF',
            fontSize: '11px', fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase',
            border: 'none', borderRadius: '2px', cursor: 'pointer',
          }}
        >
          Xóa
        </button>
      </div>
    </div>
  </div>
);

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatDateRange(starts_at: string | null, ends_at: string | null): string {
  const fmt = (s: string) => {
    const d = new Date(s);
    return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
  };
  if (!starts_at && !ends_at) return '—';
  if (starts_at && ends_at) return `${fmt(starts_at)} – ${fmt(ends_at)}`;
  if (starts_at) return `Từ ${fmt(starts_at)}`;
  if (ends_at) return `Đến ${fmt(ends_at)}`;
  return '—';
}

// ── Main page ─────────────────────────────────────────────────────────────────
export const VendorPromotionsPage = () => {
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState<Coupon | null>(null);

  const { data, isFetching } = useGetVendorCouponsQuery({ page, limit });
  const [deleteCoupon] = useDeleteCouponMutation();

  const coupons    = data?.coupons ?? [];
  const pagination = data?.pagination ?? { page: 1, limit, total: 0, totalPages: 1 };
  const total      = pagination.total;
  const totalPages = pagination.totalPages;

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try { await deleteCoupon({ id: deleteTarget.id }).unwrap(); } catch { /* ignore */ }
    setDeleteTarget(null);
  };

  // ── Topbar ──
  const topbarTitle = (
    <>
      <span style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-.2px' }}>Khuyến mãi</span>
      <span style={{ fontSize: '13px', color: T.ink3, fontVariantNumeric: 'tabular-nums' }}>
        {total} mã
      </span>
    </>
  );

  const topbarActions = (
    <Link
      to="/vendor/promotions/new"
      style={{
        height: '32px', padding: '0 14px', background: T.ink, color: '#FBFAF8',
        fontSize: '11px', fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase',
        border: 'none', borderRadius: '2px', cursor: 'pointer',
        textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
      }}
    >
      + Tạo mã giảm giá
    </Link>
  );

  return (
    <VendorShell title={topbarTitle} actions={topbarActions}>
      <div
        style={{
          background: T.surface, border: `1px solid ${T.line}`, borderRadius: '2px', overflow: 'hidden',
        }}
      >
        {!isFetching && coupons.length === 0 ? (
          <div
            data-testid="empty-state"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '60px 24px', gap: '16px',
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#A8A8AE" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            <p style={{ fontSize: '14px', color: T.ink2, margin: 0 }}>Bạn chưa có mã giảm giá nào</p>
            <Link
              to="/vendor/promotions/new"
              style={{
                height: '32px', padding: '0 14px', background: T.ink, color: '#FBFAF8',
                fontSize: '11px', fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase',
                border: 'none', borderRadius: '2px', cursor: 'pointer',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
              }}
            >
              Tạo mã đầu tiên →
            </Link>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Mã', 'Giảm', 'Lượt dùng', 'Thời gian', 'Trạng thái', 'Thao tác'].map((h) => (
                      <th
                        key={h}
                        style={{
                          fontSize: '9px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase',
                          color: T.ink3, padding: '10px 16px', textAlign: 'left',
                          borderBottom: `1px solid ${T.line}`, whiteSpace: 'nowrap', background: T.surface,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {coupons.map((coupon, idx) => (
                    <tr
                      key={coupon.id}
                      style={{ borderBottom: idx < coupons.length - 1 ? `1px solid ${T.line}` : 'none' }}
                    >
                      {/* Mã */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'monospace', letterSpacing: '.5px' }}>
                          {coupon.code}
                        </span>
                      </td>
                      {/* Giảm */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <span style={{ fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
                          {coupon.type === 'percent'
                            ? `${coupon.value}%`
                            : `${coupon.value.toLocaleString('vi-VN')}đ`}
                        </span>
                      </td>
                      {/* Lượt dùng */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <span style={{ fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>
                          {coupon.used_count}
                          {coupon.max_uses ? ` / ${coupon.max_uses}` : ''}
                        </span>
                      </td>
                      {/* Thời gian */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <span style={{ fontSize: '12px', color: T.ink2, whiteSpace: 'nowrap' }}>
                          {formatDateRange(coupon.starts_at, coupon.ends_at)}
                        </span>
                      </td>
                      {/* Trạng thái */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <StatusPill status={coupon.status} />
                      </td>
                      {/* Thao tác */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Link
                            to={`/vendor/promotions/${coupon.id}/edit`}
                            state={{ coupon }}
                            style={{
                              height: '28px', padding: '0 10px', background: 'none', color: T.ink2,
                              fontSize: '11px', fontWeight: 500, border: `1px solid ${T.line}`,
                              borderRadius: '2px', cursor: 'pointer',
                              textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
                            }}
                          >
                            Sửa
                          </Link>
                          <button
                            onClick={() => setDeleteTarget(coupon)}
                            style={{
                              height: '28px', padding: '0 10px', background: 'none', color: T.danger,
                              fontSize: '11px', fontWeight: 500, border: `1px solid ${T.line}`,
                              borderRadius: '2px', cursor: 'pointer',
                            }}
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '14px 16px', borderTop: `1px solid ${T.line}`,
                  gap: '4px',
                }}
              >
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    height: '28px', minWidth: '28px', padding: '0 8px',
                    border: `1px solid ${T.line}`, borderRadius: '2px', background: T.surface,
                    fontSize: '12px', color: page === 1 ? T.ink3 : T.ink2,
                    cursor: page === 1 ? 'default' : 'pointer',
                  }}
                >
                  ←
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    style={{
                      height: '28px', minWidth: '28px', padding: '0 8px',
                      border: `1px solid ${T.line}`, borderRadius: '2px',
                      background: n === page ? T.ink : T.surface,
                      color: n === page ? '#FBFAF8' : T.ink2,
                      fontSize: '12px', cursor: 'pointer',
                    }}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={{
                    height: '28px', minWidth: '28px', padding: '0 8px',
                    border: `1px solid ${T.line}`, borderRadius: '2px', background: T.surface,
                    fontSize: '12px', color: page >= totalPages ? T.ink3 : T.ink2,
                    cursor: page >= totalPages ? 'default' : 'pointer',
                  }}
                >
                  →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Delete confirm dialog ── */}
      {deleteTarget && (
        <ConfirmDialog
          title="Xóa mã giảm giá"
          message={`Bạn có chắc muốn xóa mã "${deleteTarget.code}"? Thao tác này không thể hoàn tác.`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </VendorShell>
  );
};
