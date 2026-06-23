/**
 * AdminProductsPage — /admin/products (admin + manager)
 * Screen 27: Quản lý Sản phẩm toàn sàn — giám sát sau đăng (gỡ/khôi phục).
 * Ref spec: docs/UI_Design/27_Admin_Products.md
 *
 * Phạm vi Phase 4b (theo design spec §2): list toàn sàn + tab trạng thái + search
 * + gỡ ('hidden') / khôi phục ('published') qua PATCH status. KHÔNG có: lý do gỡ
 * (BE không có field), audit log, bulk action, cột "Đã bán"/ảnh bìa (không có trong DTO).
 */

import { useState, useEffect, useRef } from 'react';
import { useGetAdminProductsQuery, useUpdateProductStatusMutation } from '../adminApi';
import type { AdminProductRow, AdminProductStatus } from '../types';
import { formatVND } from '../../../shared/format';

// ── Debounce ──────────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ── Status badge ────────────────────────────────────────────────────────────────
const PRODUCT_STATUS_STYLES: Record<AdminProductStatus, { color: string; background: string; label: string }> = {
  published: { color: '#2E7D4F', background: '#ECF6EE', label: 'Công khai' },
  draft:     { color: '#6B6B73', background: '#F4F3F0', label: 'Nháp' },
  hidden:    { color: '#B43A3A', background: '#FAEAEA', label: 'Bị gỡ' },
};

const ProductStatusBadge = ({ status }: { status: string }) => {
  const s = PRODUCT_STATUS_STYLES[status as AdminProductStatus] ?? PRODUCT_STATUS_STYLES.draft;
  return (
    <span
      style={{
        fontSize: '9px', fontWeight: 600, letterSpacing: '.8px', textTransform: 'uppercase',
        padding: '2px 7px', borderRadius: '2px', color: s.color, background: s.background,
      }}
    >
      {s.label}
    </span>
  );
};

// ── Confirm dialog ────────────────────────────────────────────────────────────
interface ConfirmDialogProps {
  title: string;
  message: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}
const ConfirmDialog = ({ title, message, danger, onConfirm, onCancel }: ConfirmDialogProps) => (
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
      <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '10px', color: '#16161A' }}>
        {title}
      </h2>
      <p style={{ fontSize: '13px', color: '#6B6B73', marginBottom: '22px', lineHeight: 1.6 }}>
        {message}
      </p>
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
            height: '32px', padding: '0 14px',
            background: danger ? '#B43A3A' : '#16161A', color: '#FBFAF8',
            fontSize: '11px', fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase',
            border: 'none', borderRadius: '2px', cursor: 'pointer',
          }}
        >
          Xác nhận
        </button>
      </div>
    </div>
  </div>
);

// ── Toast ─────────────────────────────────────────────────────────────────────
interface ToastProps {
  message: string;
  type: 'error' | 'success';
  onClose: () => void;
}
const Toast = ({ message, type, onClose }: ToastProps) => (
  <div
    role="alert"
    style={{
      position: 'fixed', bottom: '24px', right: '24px', zIndex: 2000,
      background: type === 'error' ? '#FAEAEA' : '#ECF6EE',
      border: `1px solid ${type === 'error' ? '#E8B4B4' : '#A8D5B5'}`,
      borderRadius: '4px', padding: '12px 16px',
      display: 'flex', alignItems: 'center', gap: '10px',
      maxWidth: '380px', fontSize: '13px',
      color: type === 'error' ? '#B43A3A' : '#2E7D4F',
      boxShadow: '0 4px 16px rgba(22,22,26,0.12)',
    }}
  >
    <span style={{ flex: 1 }}>{message}</span>
    <button
      onClick={onClose}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color: 'inherit', fontSize: '16px', lineHeight: 1,
      }}
    >
      ×
    </button>
  </div>
);

// ── Pagination helpers ────────────────────────────────────────────────────────
const pageNumbers = (page: number, totalPages: number): (number | '…')[] => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const delta = 2;
  const lo = Math.max(2, page - delta);
  const hi = Math.min(totalPages - 1, page + delta);
  const items: (number | '…')[] = [1];
  if (lo > 2) items.push('…');
  for (let i = lo; i <= hi; i++) items.push(i);
  if (hi < totalPages - 1) items.push('…');
  items.push(totalPages);
  return items;
};

// ── Status tabs ───────────────────────────────────────────────────────────────
type StatusTab = '' | AdminProductStatus;

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: '',          label: 'Tất cả' },
  { value: 'published', label: 'Công khai' },
  { value: 'draft',     label: 'Nháp' },
  { value: 'hidden',    label: 'Bị gỡ' },
];

// ── Main page ─────────────────────────────────────────────────────────────────
export const AdminProductsPage = () => {
  const [page, setPage]               = useState(1);
  const [limit, setLimit]             = useState(20);
  const [searchInput, setSearchInput] = useState('');
  const [statusTab, setStatusTab]     = useState<StatusTab>('');
  const [actionTarget, setActionTarget] = useState<AdminProductRow | null>(null);
  const [toast, setToast]             = useState<{ message: string; type: 'error' | 'success' } | null>(null);

  const debouncedSearch = useDebounce(searchInput, 400);

  // Reset page when filters change
  const prevFilters = useRef({ debouncedSearch, statusTab });
  useEffect(() => {
    const prev = prevFilters.current;
    if (prev.debouncedSearch !== debouncedSearch || prev.statusTab !== statusTab) {
      setPage(1);
      prevFilters.current = { debouncedSearch, statusTab };
    }
  }, [debouncedSearch, statusTab]);

  const queryParams = {
    search: debouncedSearch || undefined,
    status: statusTab || undefined,
    page,
    limit,
  };

  const { data, isFetching } = useGetAdminProductsQuery(queryParams);
  const [updateProductStatus] = useUpdateProductStatusMutation();

  const products   = data?.products ?? [];
  const pagination = data?.pagination ?? { page: 1, limit, total: 0, totalPages: 1 };
  const total      = pagination.total;
  const totalPages = pagination.totalPages;

  // ── Gỡ / Khôi phục ──
  const handleConfirmAction = async () => {
    if (!actionTarget) return;
    const target = actionTarget;
    const newStatus: 'published' | 'hidden' = target.status === 'hidden' ? 'published' : 'hidden';
    setActionTarget(null);
    try {
      await updateProductStatus({ id: target.id, status: newStatus }).unwrap();
      setToast({
        message: newStatus === 'hidden'
          ? `Đã gỡ "${target.title}" khỏi catalog công khai.`
          : `Đã khôi phục "${target.title}".`,
        type: 'success',
      });
    } catch (err: unknown) {
      const apiErr = err as { message?: string };
      setToast({ message: apiErr.message ?? 'Có lỗi xảy ra. Vui lòng thử lại.', type: 'error' });
    }
  };

  const startItem = total > 0 ? (page - 1) * limit + 1 : 0;
  const endItem   = Math.min(page * limit, total);

  return (
    <div>
      {/* ── Page heading ── */}
      <div style={{ marginBottom: '8px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#16161A', margin: 0 }}>
          Quản lý Sản phẩm
        </h2>
      </div>

      {/* ── Status tabs ── */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '1px solid #ECEAE5' }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusTab(tab.value)}
            style={{
              height: '36px', padding: '0 16px',
              background: 'none', border: 'none',
              borderBottom: `2px solid ${statusTab === tab.value ? '#16161A' : 'transparent'}`,
              fontSize: '13px', fontWeight: statusTab === tab.value ? 600 : 400,
              color: statusTab === tab.value ? '#16161A' : '#6B6B73',
              cursor: 'pointer', transition: 'color 0.12s', marginBottom: '-1px',
            }}
          >
            {tab.label}
            {/* Chỉ hiện tổng trên "Tất cả" khi tab đó đang active (tránh hiện total đã lọc gây nhầm) */}
            {tab.value === '' && statusTab === '' && total > 0 && (
              <span
                style={{
                  marginLeft: '6px', fontSize: '10px', fontWeight: 500,
                  color: '#A8A8AE', fontVariantNumeric: 'tabular-nums',
                }}
              >
                {total}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '320px' }}>
          <span
            style={{
              position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
              color: '#A8A8AE', fontSize: '12px', pointerEvents: 'none',
            }}
          >
            ⌕
          </span>
          <input
            type="text"
            placeholder="Tên sách, tác giả..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Tìm kiếm sản phẩm"
            style={{
              width: '100%', height: '32px', padding: '0 10px 0 32px',
              border: '1px solid #ECEAE5', borderRadius: '2px', background: '#FFFFFF',
              fontSize: '12px', fontFamily: "'Inter', sans-serif", color: '#16161A', outline: 'none',
            }}
          />
        </div>
      </div>

      {/* ── Table ── */}
      <div style={{ background: '#FFFFFF', border: '1px solid #ECEAE5', borderRadius: '2px', overflow: 'hidden' }}>
        {!isFetching && products.length === 0 ? (
          <div
            data-testid="empty-state"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '60px 24px', gap: '12px',
            }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#A8A8AE" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18M9 21V9" />
            </svg>
            <p style={{ fontSize: '14px', color: '#6B6B73', margin: 0 }}>Không có sản phẩm nào</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FAFAF8' }}>
                    {['Sản phẩm', 'Vendor', 'Định dạng', 'Giá', 'Trạng thái', 'Thao tác'].map((h) => (
                      <th
                        key={h}
                        style={{
                          fontSize: '9px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase',
                          color: '#A8A8AE', padding: '10px 16px', textAlign: 'left',
                          borderBottom: '1px solid #ECEAE5', whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {isFetching
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #ECEAE5' }}>
                          {Array.from({ length: 6 }).map((__, j) => (
                            <td key={j} style={{ padding: '12px 16px' }}>
                              <div
                                style={{
                                  height: '14px', background: '#F4F3F0',
                                  borderRadius: '2px', width: j === 0 ? '180px' : '60px',
                                }}
                              />
                            </td>
                          ))}
                        </tr>
                      ))
                    : products.map((product, idx) => {
                        const isHidden = product.status === 'hidden';
                        return (
                          <tr
                            key={product.id}
                            style={{
                              borderBottom: idx < products.length - 1 ? '1px solid #ECEAE5' : 'none',
                              background: isHidden ? '#FBECEC' : 'transparent',
                            }}
                          >
                            {/* Product: title + author */}
                            <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                              <div
                                style={{
                                  fontSize: '13px', fontWeight: 500, color: '#16161A',
                                  textDecoration: isHidden ? 'line-through' : 'none',
                                }}
                              >
                                {product.title}
                              </div>
                              {product.authorName && (
                                <div style={{ fontSize: '11px', color: '#A8A8AE', marginTop: '2px' }}>
                                  {product.authorName}
                                </div>
                              )}
                            </td>
                            {/* Vendor shop */}
                            <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                              <span style={{ fontSize: '12px', color: '#6B6B73' }}>{product.vendorShop}</span>
                            </td>
                            {/* File format */}
                            <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                              <span
                                style={{
                                  fontSize: '9px', fontWeight: 600, letterSpacing: '.8px', textTransform: 'uppercase',
                                  padding: '2px 7px', borderRadius: '2px',
                                  color: '#3A5680', background: '#EDF1F6',
                                }}
                              >
                                {product.fileFormat}
                              </span>
                            </td>
                            {/* Price */}
                            <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                              <span style={{ fontSize: '13px', color: '#16161A', fontVariantNumeric: 'tabular-nums' }}>
                                {formatVND(product.price)}
                              </span>
                            </td>
                            {/* Status */}
                            <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                              <ProductStatusBadge status={product.status} />
                            </td>
                            {/* Action: draft → no action; published → Gỡ; hidden → Khôi phục */}
                            <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                              {product.status === 'draft' ? (
                                <span style={{ fontSize: '12px', color: '#A8A8AE' }}>—</span>
                              ) : (
                                <button
                                  onClick={() => setActionTarget(product)}
                                  style={{
                                    height: '28px', padding: '0 10px', background: 'none',
                                    color: isHidden ? '#2E7D4F' : '#B43A3A',
                                    fontSize: '11px', fontWeight: 500, border: '1px solid #ECEAE5',
                                    borderRadius: '2px', cursor: 'pointer',
                                  }}
                                >
                                  {isHidden ? 'Khôi phục' : 'Gỡ'}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                  }
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderTop: '1px solid #ECEAE5', background: '#FFFFFF',
                flexWrap: 'wrap', gap: '8px',
              }}
            >
              <div style={{ fontSize: '12px', color: '#A8A8AE', fontVariantNumeric: 'tabular-nums' }}>
                {total > 0 ? `Hiển thị ${startItem}–${endItem} / ${total} sản phẩm` : ''}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    height: '28px', minWidth: '28px', padding: '0 8px',
                    border: '1px solid #ECEAE5', borderRadius: '2px', background: '#FFFFFF',
                    fontSize: '12px', color: page === 1 ? '#A8A8AE' : '#6B6B73',
                    cursor: page === 1 ? 'default' : 'pointer',
                  }}
                >
                  ←
                </button>
                {pageNumbers(page, totalPages).map((n, i) =>
                  n === '…' ? (
                    <span
                      key={`ellipsis-${i}`}
                      style={{
                        height: '28px', minWidth: '28px', padding: '0 4px',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '12px', color: '#A8A8AE',
                      }}
                    >
                      …
                    </span>
                  ) : (
                    <button
                      key={n}
                      onClick={() => setPage(n as number)}
                      style={{
                        height: '28px', minWidth: '28px', padding: '0 8px',
                        border: '1px solid #ECEAE5', borderRadius: '2px',
                        background: n === page ? '#16161A' : '#FFFFFF',
                        color: n === page ? '#FBFAF8' : '#6B6B73',
                        fontSize: '12px', cursor: 'pointer',
                      }}
                    >
                      {n}
                    </button>
                  )
                )}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={{
                    height: '28px', minWidth: '28px', padding: '0 8px',
                    border: '1px solid #ECEAE5', borderRadius: '2px', background: '#FFFFFF',
                    fontSize: '12px', color: page >= totalPages ? '#A8A8AE' : '#6B6B73',
                    cursor: page >= totalPages ? 'default' : 'pointer',
                  }}
                >
                  →
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#A8A8AE' }}>
                Hiển thị
                <select
                  value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  aria-label="Số mục mỗi trang"
                  style={{
                    height: '28px', padding: '0 6px', border: '1px solid #ECEAE5',
                    borderRadius: '2px', fontSize: '12px', fontFamily: "'Inter', sans-serif",
                    background: '#FFFFFF',
                  }}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                mục / trang
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Confirm dialog ── */}
      {actionTarget && (
        <ConfirmDialog
          title={actionTarget.status === 'hidden' ? 'Khôi phục sản phẩm' : 'Gỡ sản phẩm'}
          message={
            actionTarget.status === 'hidden'
              ? `Khôi phục "${actionTarget.title}"? Sản phẩm sẽ hiển thị lại trên catalog công khai.`
              : `Gỡ "${actionTarget.title}"? Sản phẩm sẽ biến mất khỏi catalog công khai.`
          }
          danger={actionTarget.status !== 'hidden'}
          onConfirm={handleConfirmAction}
          onCancel={() => setActionTarget(null)}
        />
      )}

      {/* ── Toast ── */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
      )}
    </div>
  );
};
