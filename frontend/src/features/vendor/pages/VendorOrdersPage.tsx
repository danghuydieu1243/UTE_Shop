import { useState } from 'react';
import { VendorShell } from '../components/VendorShell';
import { useGetVendorOrdersQuery } from '../vendorOrdersApi';
import { formatVND, formatDateTime } from '../../../shared/format';
import type { VendorOrderStatus } from '../types';

// ── DS hex constants (M-1 pattern — no var(--xxx)) ────────────────────────────
const C = {
  ink:      '#16161A',
  ink2:     '#6B6B73',
  ink3:     '#A8A8AE',
  paper:    '#FBFAF8',
  surface:  '#F4F3F0',
  line:     '#ECEAE5',
  white:    '#FFFFFF',
  // Status badge pairs
  newBg:    '#EDF1F6',
  newFg:    '#3A5680',
  doneBg:   '#ECF6EE',
  doneFg:   '#2E7D4F',
  cancelBg: '#FBECEC',
  cancelFg: '#B43A3A',
} as const;

// ── Status badge ──────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<VendorOrderStatus, string> = {
  NEW:       'Mới',
  COMPLETED: 'Thành công',
  CANCELLED: 'Đã hủy',
};

const StatusBadge = ({ status }: { status: VendorOrderStatus }) => {
  const bgMap: Record<VendorOrderStatus, string> = {
    NEW:       C.newBg,
    COMPLETED: C.doneBg,
    CANCELLED: C.cancelBg,
  };
  const fgMap: Record<VendorOrderStatus, string> = {
    NEW:       C.newFg,
    COMPLETED: C.doneFg,
    CANCELLED: C.cancelFg,
  };
  return (
    <span
      data-testid="order-status-badge"
      style={{
        fontSize: '9px',
        fontWeight: 600,
        letterSpacing: '.8px',
        textTransform: 'uppercase',
        padding: '2px 7px',
        borderRadius: '2px',
        background: bgMap[status],
        color:      fgMap[status],
      }}
    >
      {STATUS_LABEL[status]}
    </span>
  );
};

// ── Tab definitions ───────────────────────────────────────────────────────────
type TabValue = VendorOrderStatus | '';

const TABS: { label: string; value: TabValue }[] = [
  { label: 'Tất cả',     value: '' },
  { label: 'Mới',        value: 'NEW' },
  { label: 'Thành công', value: 'COMPLETED' },
  { label: 'Đã hủy',    value: 'CANCELLED' },
];

// ── Main page ─────────────────────────────────────────────────────────────────
export const VendorOrdersPage = () => {
  const [statusFilter, setStatusFilter] = useState<TabValue>('');
  const [searchTerm, setSearchTerm]     = useState('');
  const [fromDate, setFromDate]         = useState('');
  const [toDate, setToDate]             = useState('');
  const [page, setPage]                 = useState(1);
  const limit                           = 10;

  const { data, isFetching } = useGetVendorOrdersQuery({
    q: searchTerm.trim() || undefined,
    status: statusFilter || undefined,
    fromDate: fromDate || undefined,
    toDate: toDate || undefined,
    page,
    limit,
  });

  const orders     = data?.orders ?? [];
  const pagination = data?.pagination ?? { page: 1, limit, total: 0, totalPages: 1 };
  const total      = pagination.total;
  const totalPages = pagination.totalPages;

  const handleTabChange = (value: TabValue) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1);
  };

  const handleFromDateChange = (value: string) => {
    setFromDate(value);
    setPage(1);
  };

  const handleToDateChange = (value: string) => {
    setToDate(value);
    setPage(1);
  };

  // ── Topbar title ──
  const topbarTitle = (
    <>
      <span style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-.2px' }}>Quản lý đơn hàng</span>
      <span style={{ fontSize: '13px', color: C.ink3, fontVariantNumeric: 'tabular-nums' }}>
        {total} đơn hàng
      </span>
    </>
  );

  return (
    <VendorShell title={topbarTitle}>
      <div
        style={{
          background: C.white,
          border: `1px solid ${C.line}`,
          borderRadius: '2px',
          padding: '16px',
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 1.4fr) repeat(2, minmax(160px, 0.7fr))',
          gap: '12px',
          alignItems: 'end',
        }}
      >
        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '.8px', textTransform: 'uppercase', color: C.ink3 }}>
            Tìm kiếm
          </span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Mã đơn hoặc tên sách"
            style={{
              height: '40px',
              border: `1px solid ${C.line}`,
              borderRadius: '2px',
              padding: '0 12px',
              fontSize: '13px',
              color: C.ink,
              outline: 'none',
              background: C.white,
            }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '.8px', textTransform: 'uppercase', color: C.ink3 }}>
            Từ ngày
          </span>
          <input
            aria-label="Từ ngày"
            type="date"
            value={fromDate}
            onChange={(e) => handleFromDateChange(e.target.value)}
            style={{
              height: '40px',
              border: `1px solid ${C.line}`,
              borderRadius: '2px',
              padding: '0 12px',
              fontSize: '13px',
              color: C.ink,
              outline: 'none',
              background: C.white,
            }}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '.8px', textTransform: 'uppercase', color: C.ink3 }}>
            Đến ngày
          </span>
          <input
            aria-label="Đến ngày"
            type="date"
            value={toDate}
            onChange={(e) => handleToDateChange(e.target.value)}
            style={{
              height: '40px',
              border: `1px solid ${C.line}`,
              borderRadius: '2px',
              padding: '0 12px',
              fontSize: '13px',
              color: C.ink,
              outline: 'none',
              background: C.white,
            }}
          />
        </label>
      </div>

      {/* ── Status filter tabs ── */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          borderBottom: `1px solid ${C.line}`,
          background: C.white,
          borderRadius: '2px 2px 0 0',
          padding: '0 16px',
        }}
      >
        {TABS.map((tab) => {
          const isActive = statusFilter === tab.value;
          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => handleTabChange(tab.value)}
              style={{
                padding: '10px 14px',
                fontSize: '13px',
                fontWeight: isActive ? 500 : 400,
                color: isActive ? C.ink : C.ink3,
                background: 'none',
                border: 'none',
                borderBottom: `2px solid ${isActive ? C.ink : 'transparent'}`,
                marginBottom: '-1px',
                cursor: 'pointer',
                fontFamily: "'Inter', sans-serif",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── Table ── */}
      <div
        style={{
          background: C.white,
          border: `1px solid ${C.line}`,
          borderTop: 'none',
          borderRadius: '0 0 2px 2px',
          overflow: 'hidden',
        }}
      >
        {!isFetching && orders.length === 0 ? (
          /* Empty state */
          <div
            data-testid="vendor-orders-empty"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', padding: '60px 24px', gap: '12px',
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={C.ink3} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <p style={{ fontSize: '14px', color: C.ink2, margin: 0 }}>Chưa có đơn hàng nào</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Mã đơn', 'Ngày đặt', 'E-book', 'Tổng tiền', 'Trạng thái'].map((h) => (
                      <th
                        key={h}
                        style={{
                          fontSize: '9px', fontWeight: 600, letterSpacing: '1px',
                          textTransform: 'uppercase', color: C.ink3,
                          padding: '10px 16px', textAlign: 'left',
                          borderBottom: `1px solid ${C.line}`, whiteSpace: 'nowrap',
                          background: C.white,
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order, idx) => (
                    <tr
                      key={order.code}
                      style={{ borderBottom: idx < orders.length - 1 ? `1px solid ${C.line}` : 'none' }}
                    >
                      {/* Mã đơn */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                          {order.code}
                        </span>
                      </td>
                      {/* Ngày đặt */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '12px', color: C.ink2 }}>
                          {formatDateTime(order.createdAt)}
                        </span>
                      </td>
                      {/* E-book titles */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {order.items.map((item, i) => (
                            <span key={i} style={{ fontSize: '12px', color: C.ink }}>
                              {item.titleSnapshot}
                            </span>
                          ))}
                        </div>
                      </td>
                      {/* Tổng tiền */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>
                          {formatVND(order.total)}
                        </span>
                      </td>
                      {/* Trạng thái */}
                      <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                        <StatusBadge status={order.status} />
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
                  padding: '14px 16px', borderTop: `1px solid ${C.line}`,
                  gap: '8px',
                }}
              >
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    height: '32px', padding: '0 14px', border: `1px solid ${C.line}`,
                    borderRadius: '2px', background: C.white,
                    fontSize: '12px', color: page === 1 ? C.ink3 : C.ink2,
                    cursor: page === 1 ? 'default' : 'pointer',
                  }}
                >
                  ← Trang trước
                </button>
                <span style={{ fontSize: '13px', color: C.ink2 }}>
                  Trang {page}/{totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={{
                    height: '32px', padding: '0 14px', border: `1px solid ${C.line}`,
                    borderRadius: '2px', background: C.white,
                    fontSize: '12px', color: page >= totalPages ? C.ink3 : C.ink2,
                    cursor: page >= totalPages ? 'default' : 'pointer',
                  }}
                >
                  Trang sau →
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </VendorShell>
  );
};
