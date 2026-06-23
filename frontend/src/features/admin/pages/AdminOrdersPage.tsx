/**
 * AdminOrdersPage — /admin/orders (admin + manager)
 * Screen 25: Quản lý Đơn hàng — READ-ONLY (no mutations)
 * Ref spec: docs/UI_Design/25_Admin_Orders.md
 */

import { useState, useEffect, useRef } from 'react';
import {
  useGetAdminOrdersQuery,
  useGetAdminOrderDetailQuery,
} from '../adminApi';
import type { AdminOrderSummary, AdminOrderStatus, AdminPaymentStatus } from '../adminApi';
import { formatVND, formatDateTime } from '../../../shared/format';

// ── Debounce ──────────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

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

// ── Format date ───────────────────────────────────────────────────────────────
const formatDate = (iso: string): string => {
  try {
    return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch {
    return iso;
  }
};

// ── Order status badge ────────────────────────────────────────────────────────
const ORDER_STATUS_STYLES: Record<AdminOrderStatus, { color: string; background: string; label: string }> = {
  NEW:       { color: '#3A5680', background: '#EDF1F6', label: 'Mới' },
  COMPLETED: { color: '#2E7D4F', background: '#ECF6EE', label: 'Hoàn thành' },
  CANCELLED: { color: '#B43A3A', background: '#FAEAEA', label: 'Đã hủy' },
};

const OrderStatusBadge = ({ status }: { status: AdminOrderStatus }) => {
  const s = ORDER_STATUS_STYLES[status] ?? ORDER_STATUS_STYLES.NEW;
  return (
    <span
      style={{
        fontSize: '9px',
        fontWeight: 600,
        letterSpacing: '.8px',
        textTransform: 'uppercase',
        padding: '2px 7px',
        borderRadius: '2px',
        color: s.color,
        background: s.background,
      }}
    >
      {s.label}
    </span>
  );
};

// ── Payment status badge ──────────────────────────────────────────────────────
const PAYMENT_STATUS_STYLES: Record<AdminPaymentStatus, { color: string; background: string; label: string }> = {
  PENDING: { color: '#7A5C1E', background: '#FFF6E0', label: 'Chờ TT' },
  PAID:    { color: '#2E7D4F', background: '#ECF6EE', label: 'Đã TT' },
  EXPIRED: { color: '#B43A3A', background: '#FAEAEA', label: 'Hết hạn' },
};

const PaymentStatusBadge = ({ status }: { status: string }) => {
  const s = PAYMENT_STATUS_STYLES[status as AdminPaymentStatus] ?? PAYMENT_STATUS_STYLES.PENDING;
  return (
    <span
      style={{
        fontSize: '9px',
        fontWeight: 600,
        letterSpacing: '.8px',
        textTransform: 'uppercase',
        padding: '2px 7px',
        borderRadius: '2px',
        color: s.color,
        background: s.background,
      }}
    >
      {s.label}
    </span>
  );
};

// ── Status tabs ───────────────────────────────────────────────────────────────
type StatusTabValue = '' | AdminOrderStatus;

const STATUS_TABS: { value: StatusTabValue; label: string }[] = [
  { value: '',          label: 'Tất cả' },
  { value: 'NEW',       label: 'Mới' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
];

// ── Detail Modal ──────────────────────────────────────────────────────────────
interface DetailModalProps {
  code: string;
  onClose: () => void;
}

const DetailModal = ({ code, onClose }: DetailModalProps) => {
  const { data: order, isLoading } = useGetAdminOrderDetailQuery(code);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Chi tiết đơn hàng ${code}`}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(22,22,26,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          background: '#FFFFFF', borderRadius: '4px',
          width: '100%', maxWidth: '580px', maxHeight: '90vh',
          overflow: 'auto', border: '1px solid #ECEAE5',
          boxShadow: '0 8px 32px rgba(22,22,26,0.16)',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '18px 22px 14px', borderBottom: '1px solid #ECEAE5',
          }}
        >
          <h2 style={{ fontSize: '15px', fontWeight: 600, color: '#16161A', margin: 0 }}>
            Chi tiết đơn hàng #{code}
          </h2>
          <button
            onClick={onClose}
            aria-label="Đóng"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '20px', lineHeight: 1, color: '#6B6B73', padding: '2px 6px',
            }}
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 22px 24px' }}>
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '32px', color: '#A8A8AE', fontSize: '13px' }}>
              Đang tải...
            </div>
          )}

          {!isLoading && !order && (
            <div style={{ textAlign: 'center', padding: '32px', color: '#B43A3A', fontSize: '13px' }}>
              Không tìm thấy đơn hàng.
            </div>
          )}

          {!isLoading && order && (
            <>
              {/* Order info */}
              <div style={{ marginBottom: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                  <span style={{ fontSize: '16px', fontWeight: 600, color: '#16161A' }}>
                    #{order.code}
                  </span>
                  <OrderStatusBadge status={order.status} />
                </div>
                <div style={{ fontSize: '12px', color: '#6B6B73' }}>
                  Đặt lúc {formatDateTime(order.createdAt)}
                </div>
              </div>

              {/* Items */}
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#A8A8AE', marginBottom: '10px' }}>
                  Sản phẩm
                </div>
                <div
                  style={{
                    border: '1px solid #ECEAE5', borderRadius: '2px', overflow: 'hidden',
                  }}
                >
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#FAFAF8' }}>
                        {['Tên sách', 'Đơn giá'].map((h) => (
                          <th
                            key={h}
                            style={{
                              fontSize: '9px', fontWeight: 600, letterSpacing: '1px',
                              textTransform: 'uppercase', color: '#A8A8AE',
                              padding: '8px 12px', textAlign: 'left',
                              borderBottom: '1px solid #ECEAE5',
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {order.items.map((item, idx) => (
                        <tr
                          key={item.bookId}
                          style={{ borderBottom: idx < order.items.length - 1 ? '1px solid #ECEAE5' : 'none' }}
                        >
                          <td style={{ padding: '10px 12px', fontSize: '13px', color: '#16161A' }}>
                            {item.titleSnapshot}
                          </td>
                          <td style={{ padding: '10px 12px', fontSize: '13px', fontWeight: 500, color: '#16161A', fontVariantNumeric: 'tabular-nums' }}>
                            {formatVND(item.unitPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Total */}
              <div
                style={{
                  display: 'flex', justifyContent: 'flex-end', gap: '24px',
                  padding: '10px 0', borderTop: '1px solid #ECEAE5', marginBottom: '16px',
                }}
              >
                <span style={{ fontSize: '13px', color: '#6B6B73' }}>Tổng cộng</span>
                <span style={{ fontSize: '15px', fontWeight: 600, color: '#16161A', fontVariantNumeric: 'tabular-nums' }}>
                  {formatVND(order.total)}
                </span>
              </div>

              {/* Payment (read-only; KHÔNG lộ provider_txn_id) */}
              {order.payment && (
                <div
                  style={{
                    background: '#FAFAF8', border: '1px solid #ECEAE5', borderRadius: '2px',
                    padding: '12px 14px',
                  }}
                >
                  <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: '#A8A8AE', marginBottom: '10px' }}>
                    Thanh toán
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#6B6B73' }}>Trạng thái</span>
                      <span
                        data-testid="payment-intent-status"
                        style={{ fontSize: '12px', fontWeight: 500, color: '#16161A' }}
                      >
                        {order.payment.status === 'PENDING' && 'Chờ thanh toán'}
                        {order.payment.status === 'PAID' && 'Đã thanh toán'}
                        {order.payment.status === 'EXPIRED' && 'QR hết hạn'}
                        {!['PENDING', 'PAID', 'EXPIRED'].includes(order.payment.status) && order.payment.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '12px', color: '#6B6B73' }}>Số tiền</span>
                      <span style={{ fontSize: '12px', fontWeight: 500, color: '#16161A', fontVariantNumeric: 'tabular-nums' }}>
                        {formatVND(order.payment.amount)}
                      </span>
                    </div>
                    {order.payment.expiresAt && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', color: '#6B6B73' }}>Hết hạn lúc</span>
                        <span style={{ fontSize: '12px', color: '#6B6B73', fontVariantNumeric: 'tabular-nums' }}>
                          {formatDateTime(order.payment.expiresAt)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
export const AdminOrdersPage = () => {
  const [page, setPage]                   = useState(1);
  const [limit, setLimit]                 = useState(20);
  const [searchInput, setSearchInput]     = useState('');
  const [statusTab, setStatusTab]         = useState<StatusTabValue>('');
  const [fromDate, setFromDate]           = useState('');
  const [toDate, setToDate]               = useState('');
  const [selectedCode, setSelectedCode]   = useState<string | null>(null);

  const debouncedSearch = useDebounce(searchInput, 400);

  // Reset page when filters change
  const prevFilters = useRef({ debouncedSearch, statusTab, fromDate, toDate });
  useEffect(() => {
    const prev = prevFilters.current;
    if (
      prev.debouncedSearch !== debouncedSearch ||
      prev.statusTab !== statusTab ||
      prev.fromDate !== fromDate ||
      prev.toDate !== toDate
    ) {
      setPage(1);
      prevFilters.current = { debouncedSearch, statusTab, fromDate, toDate };
    }
  }, [debouncedSearch, statusTab, fromDate, toDate]);

  const queryParams = {
    search:        debouncedSearch || undefined,
    status:        (statusTab || undefined) as AdminOrderStatus | undefined,
    from:          fromDate || undefined,
    to:            toDate || undefined,
    page,
    limit,
  };

  const { data, isFetching } = useGetAdminOrdersQuery(queryParams);

  const orders     = data?.orders ?? [];
  const pagination = data?.pagination ?? { page: 1, limit, total: 0, totalPages: 1 };
  const total      = pagination.total;
  const totalPages = pagination.totalPages;

  const startItem = total > 0 ? (page - 1) * limit + 1 : 0;
  const endItem   = Math.min(page * limit, total);

  return (
    <div>
      {/* ── Page heading ── */}
      <div style={{ marginBottom: '8px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 600, color: '#16161A', margin: 0 }}>
          Quản lý Đơn hàng
        </h2>
      </div>

      {/* ── Status tabs ── */}
      <div
        style={{
          display: 'flex', gap: '0', marginBottom: '20px',
          borderBottom: '1px solid #ECEAE5',
        }}
      >
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
              cursor: 'pointer', transition: 'color 0.12s',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
            {/* Show count only on "Tất cả" tab when it is active */}
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
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '300px' }}>
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
            placeholder="Mã đơn, email khách, tên sách..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Tìm kiếm đơn hàng"
            style={{
              width: '100%', height: '32px', padding: '0 10px 0 32px',
              border: '1px solid #ECEAE5', borderRadius: '2px', background: '#FFFFFF',
              fontSize: '12px', fontFamily: "'Inter', sans-serif", color: '#16161A', outline: 'none',
            }}
          />
        </div>

        {/* Date range */}
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          aria-label="Từ ngày"
          style={{
            height: '32px', padding: '0 10px', border: '1px solid #ECEAE5',
            borderRadius: '2px', background: '#FFFFFF', fontSize: '12px',
            fontFamily: "'Inter', sans-serif", color: '#16161A', cursor: 'pointer',
          }}
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          aria-label="Đến ngày"
          style={{
            height: '32px', padding: '0 10px', border: '1px solid #ECEAE5',
            borderRadius: '2px', background: '#FFFFFF', fontSize: '12px',
            fontFamily: "'Inter', sans-serif", color: '#16161A', cursor: 'pointer',
          }}
        />
      </div>

      {/* ── Table ── */}
      <div
        style={{
          background: '#FFFFFF', border: '1px solid #ECEAE5', borderRadius: '2px', overflow: 'hidden',
        }}
      >
        {!isFetching && orders.length === 0 ? (
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
            <p style={{ fontSize: '14px', color: '#6B6B73', margin: 0 }}>Không có đơn hàng nào</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#FAFAF8' }}>
                    {['Mã đơn / Ngày', 'Khách hàng', 'Vendor', 'Sản phẩm', 'Tổng', 'Thanh toán', 'Trạng thái'].map((h) => (
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
                          {Array.from({ length: 7 }).map((__, j) => (
                            <td key={j} style={{ padding: '12px 16px' }}>
                              <div
                                style={{
                                  height: '14px', background: '#F4F3F0',
                                  borderRadius: '2px', width: j === 0 ? '120px' : '80px',
                                }}
                              />
                            </td>
                          ))}
                        </tr>
                      ))
                    : orders.map((order: AdminOrderSummary, idx) => (
                        <tr
                          key={order.code}
                          style={{ borderBottom: idx < orders.length - 1 ? '1px solid #ECEAE5' : 'none' }}
                        >
                          {/* Code + date */}
                          <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                            <button
                              onClick={() => setSelectedCode(order.code)}
                              style={{
                                background: 'none', border: 'none', padding: 0,
                                fontSize: '13px', fontWeight: 600, color: '#2D6BE4',
                                cursor: 'pointer', fontFamily: "'Inter', monospace",
                                textDecoration: 'underline', textUnderlineOffset: '2px',
                              }}
                            >
                              {order.code}
                            </button>
                            <div style={{ fontSize: '11px', color: '#A8A8AE', marginTop: '2px', fontVariantNumeric: 'tabular-nums' }}>
                              {formatDate(order.createdAt)}
                            </div>
                          </td>
                          {/* Buyer */}
                          <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                            <div style={{ fontSize: '13px', color: '#16161A' }}>{order.buyerName}</div>
                            <div style={{ fontSize: '11px', color: '#A8A8AE', marginTop: '2px' }}>{order.buyerEmail}</div>
                          </td>
                          {/* Vendor (vendorShops là mảng tên shop) */}
                          <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                            <span style={{ fontSize: '12px', color: '#6B6B73' }}>
                              {order.vendorShops.length > 0 ? order.vendorShops.join(', ') : '—'}
                            </span>
                          </td>
                          {/* Items brief */}
                          <td style={{ padding: '12px 16px', verticalAlign: 'middle', maxWidth: '160px' }}>
                            <span
                              style={{
                                fontSize: '12px', color: '#6B6B73',
                                display: '-webkit-box', WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical', overflow: 'hidden',
                              }}
                            >
                              {order.itemsBrief}
                            </span>
                          </td>
                          {/* Total */}
                          <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                            <span style={{ fontSize: '13px', fontWeight: 500, color: '#16161A', fontVariantNumeric: 'tabular-nums' }}>
                              {formatVND(order.total)}
                            </span>
                          </td>
                          {/* Payment status (có thể null khi chưa có payment) */}
                          <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                            {order.paymentStatus ? (
                              <PaymentStatusBadge status={order.paymentStatus} />
                            ) : (
                              <span style={{ fontSize: '12px', color: '#A8A8AE' }}>—</span>
                            )}
                          </td>
                          {/* Order status */}
                          <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                            <OrderStatusBadge status={order.status} />
                          </td>
                        </tr>
                      ))
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
                {total > 0 ? `Hiển thị ${startItem}–${endItem} / ${total} đơn hàng` : ''}
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

      {/* ── Detail Modal ── */}
      {selectedCode && (
        <DetailModal
          code={selectedCode}
          onClose={() => setSelectedCode(null)}
        />
      )}
    </div>
  );
};
