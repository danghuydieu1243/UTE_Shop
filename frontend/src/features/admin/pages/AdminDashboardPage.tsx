/** AdminDashboardPage — /admin/dashboard (Screen 22, Phase 6b, Task 5).
 *  Rendered as Outlet child of AdminShell — do NOT import or wrap AdminShell here.
 *  Role-based revenue hiding: admin sees revenue KPI, chart, and table column; manager does not.
 *  Hard rules: NO var(--…) — hex DS values only.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppSelector } from '../../../app/hooks';
import { useGetAdminDashboardQuery } from '../../analytics/analyticsApi';
import { LineAreaChart } from '../../analytics/components/LineAreaChart';
import { BarChart } from '../../analytics/components/BarChart';
import { formatVND, formatDateTime } from '../../../shared/format';

// ── Period options ─────────────────────────────────────────────────────────────
const PERIOD_OPTIONS: { value: string; label: string }[] = [
  { value: '30d',   label: '30 ngày gần nhất' },
  { value: 'month', label: 'Tháng này' },
  { value: '7d',    label: '7 ngày' },
  { value: 'today', label: 'Hôm nay' },
  { value: 'year',  label: 'Năm nay' },
];

// ── DS colours (hex only) ──────────────────────────────────────────────────────
const DS = {
  ink:       '#16161A',
  ink2:      '#6B6B73',
  ink3:      '#A8A8AE',
  line:      '#ECEAE5',
  surface:   '#FFFFFF',
  pageBg:    '#F4F3F0',
  success:   '#2E7D4F',
  successBg: '#ECF6EE',
  danger:    '#B43A3A',
  dangerBg:  '#FBECEC',
  warning:   '#9A6B16',
  warningBg: '#FBF3E4',
  accent:    '#B8893B',
  coverBg:   '#F4F2ED',
  info:      '#3A5680',
  infoBg:    '#EDF1F6',
};

// ── KPI Card ──────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string;
  accentColor: string;
}

const KpiCard = ({ label, value, accentColor }: KpiCardProps) => (
  <div
    style={{
      flex: '1 1 0',
      minWidth: '160px',
      background: DS.surface,
      border: `1px solid ${DS.line}`,
      borderLeft: `3px solid ${accentColor}`,
      borderRadius: '2px',
      padding: '20px 20px 16px',
    }}
  >
    <div
      style={{
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '1px',
        textTransform: 'uppercase',
        color: DS.ink3,
        marginBottom: '10px',
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: '24px',
        fontWeight: 700,
        color: DS.ink,
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-.5px',
      }}
    >
      {value}
    </div>
  </div>
);

// ── Section card header ────────────────────────────────────────────────────────
const CardHeader = ({ children, link }: { children: React.ReactNode; link?: { to: string; label: string } }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '14px 20px 12px',
      borderBottom: `1px solid ${DS.line}`,
    }}
  >
    <span
      style={{
        fontSize: '11px',
        fontWeight: 600,
        letterSpacing: '.8px',
        textTransform: 'uppercase',
        color: DS.ink2,
      }}
    >
      {children}
    </span>
    {link && (
      <Link
        to={link.to}
        style={{ fontSize: '12px', color: DS.ink3, textDecoration: 'none' }}
      >
        {link.label}
      </Link>
    )}
  </div>
);

// ── Status badge ──────────────────────────────────────────────────────────────
// Order.status từ BE là UPPERCASE: NEW | COMPLETED | CANCELLED (khớp AdminOrdersPage).
const STATUS_MAP: Record<string, { bg: string; color: string; label: string }> = {
  NEW:       { bg: DS.infoBg,    color: DS.info,    label: 'Mới' },
  COMPLETED: { bg: DS.successBg, color: DS.success, label: 'Hoàn thành' },
  CANCELLED: { bg: DS.dangerBg,  color: DS.danger,  label: 'Đã hủy' },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_MAP[status] ?? { bg: DS.coverBg, color: DS.ink3, label: status };
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '10px',
        fontSize: '10px',
        fontWeight: 600,
        background: cfg.bg,
        color: cfg.color,
        whiteSpace: 'nowrap',
      }}
    >
      {cfg.label}
    </span>
  );
};

// ── Format pill for fileFormat ─────────────────────────────────────────────────
const FormatPill = ({ format }: { format: string }) => (
  <span
    style={{
      display: 'inline-block',
      padding: '1px 6px',
      borderRadius: '2px',
      fontSize: '10px',
      fontWeight: 600,
      background: DS.infoBg,
      color: DS.info,
      letterSpacing: '.3px',
    }}
  >
    {format.toUpperCase()}
  </span>
);

// ── th/td shared styles ────────────────────────────────────────────────────────
const TH_STYLE: React.CSSProperties = {
  fontSize: '9px',
  fontWeight: 600,
  letterSpacing: '1px',
  textTransform: 'uppercase',
  color: DS.ink3,
  padding: '0 12px 10px 0',
  textAlign: 'left',
  borderBottom: `1px solid ${DS.line}`,
  whiteSpace: 'nowrap',
};
const TH_RIGHT: React.CSSProperties = { ...TH_STYLE, textAlign: 'right' };

// ── Main page ─────────────────────────────────────────────────────────────────
export const AdminDashboardPage = () => {
  const [period, setPeriod] = useState('30d');
  const { data, isLoading, isError, refetch } = useGetAdminDashboardQuery(period);

  const role = useAppSelector((s) => s.auth.user?.role);
  const isAdmin = role === 'admin';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
      {/* ── Page heading + period select ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <h1
          style={{
            fontSize: '20px',
            fontWeight: 600,
            color: DS.ink,
            letterSpacing: '-.2px',
            margin: 0,
          }}
        >
          Tổng quan hệ thống
        </h1>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          aria-label="Chọn khoảng thời gian"
          style={{
            height: '30px',
            padding: '0 10px',
            border: `1px solid ${DS.line}`,
            borderRadius: '2px',
            background: DS.surface,
            fontSize: '12px',
            fontFamily: "'Inter', sans-serif",
            color: DS.ink,
            cursor: 'pointer',
          }}
        >
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* ── Loading state (skeleton trắng + viền để nổi trên bg #F4F3F0) ── */}
      {isLoading && (
        <div data-testid="loading" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: '72px',
                background: DS.surface,
                border: `1px solid ${DS.line}`,
                borderRadius: '2px',
              }}
            />
          ))}
        </div>
      )}

      {/* ── Error state ── */}
      {!isLoading && isError && (
        <div
          data-testid="error"
          style={{
            background: DS.surface,
            border: `1px solid ${DS.line}`,
            borderRadius: '2px',
            padding: '40px 24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 600, color: DS.ink, marginBottom: '6px' }}>
            Không tải được dữ liệu tổng quan
          </div>
          <div style={{ fontSize: '13px', color: DS.ink2, marginBottom: '16px' }}>
            Vui lòng thử lại. Nếu vẫn lỗi, hãy đăng nhập lại.
          </div>
          <button
            onClick={() => refetch()}
            style={{
              height: '34px', padding: '0 16px', background: DS.ink, color: '#FBFAF8',
              fontSize: '12px', fontWeight: 600, border: 'none', borderRadius: '2px', cursor: 'pointer',
            }}
          >
            Thử lại
          </button>
        </div>
      )}

      {/* ── Dashboard content ── */}
      {!isLoading && !isError && data && (
        <>
          {/* ── Row 1: KPI cards ── */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <KpiCard
              label="Tổng người dùng"
              value={String(data.kpis.totalUsers)}
              accentColor={DS.ink}
            />
            <KpiCard
              label="Tổng Vendor"
              value={String(data.kpis.totalVendors)}
              accentColor={DS.warning}
            />
            <KpiCard
              label="Đơn hàng (kỳ)"
              value={String(data.kpis.orders)}
              accentColor={DS.success}
            />
            {isAdmin && (
              <KpiCard
                label="Doanh thu (kỳ)"
                value={formatVND(data.kpis.revenue ?? 0)}
                accentColor={DS.accent}
              />
            )}
          </div>

          {/* ── Row 2: Charts ── */}
          <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? '3fr 2fr' : '1fr', gap: '12px', alignItems: 'start' }}>
            {isAdmin && (
              <div
                style={{
                  background: DS.surface,
                  border: `1px solid ${DS.line}`,
                  borderRadius: '2px',
                }}
              >
                <CardHeader>Doanh thu</CardHeader>
                <div style={{ padding: '16px 20px 12px' }}>
                  <LineAreaChart data={data.revenueSeries ?? []} />
                </div>
              </div>
            )}
            <div
              style={{
                background: DS.surface,
                border: `1px solid ${DS.line}`,
                borderRadius: '2px',
              }}
            >
              <CardHeader>Người dùng mới</CardHeader>
              <div style={{ padding: '16px 20px 12px' }}>
                <BarChart data={data.newUsersSeries} />
              </div>
            </div>
          </div>

          {/* ── Row 3: Top sách + Đơn hàng gần đây ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '55fr 45fr', gap: '12px', alignItems: 'start' }}>
            {/* Top sách */}
            <div
              style={{
                background: DS.surface,
                border: `1px solid ${DS.line}`,
                borderRadius: '2px',
              }}
            >
              <CardHeader>Top Sách</CardHeader>
              <div style={{ padding: '16px 20px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={TH_STYLE}>#</th>
                      <th style={TH_STYLE}>Sách</th>
                      <th style={TH_STYLE}>Vendor</th>
                      <th style={TH_STYLE}>Định dạng</th>
                      <th style={{ ...TH_STYLE, textAlign: 'right' }}>Đã bán</th>
                      {isAdmin && <th style={TH_RIGHT}>Doanh thu</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {data.topBooks.slice(0, 5).map((book, idx) => {
                      const isLast = idx === Math.min(data.topBooks.length, 5) - 1;
                      const cellBorder = isLast ? 'none' : `1px solid ${DS.line}`;
                      const cellStyle: React.CSSProperties = {
                        padding: '10px 12px 10px 0',
                        borderBottom: cellBorder,
                        verticalAlign: 'middle',
                        fontSize: '13px',
                        color: DS.ink,
                        fontVariantNumeric: 'tabular-nums',
                      };
                      return (
                        <tr key={book.bookId}>
                          <td style={{ ...cellStyle, fontSize: '11px', color: DS.ink3 }}>
                            {String(idx + 1).padStart(2, '0')}
                          </td>
                          <td style={{ ...cellStyle, maxWidth: '200px' }}>
                            <div
                              style={{
                                fontSize: '13px',
                                fontWeight: 500,
                                color: DS.ink,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {book.title}
                            </div>
                          </td>
                          <td style={{ ...cellStyle, fontSize: '12px', color: DS.ink2 }}>
                            {book.vendorShop}
                          </td>
                          <td style={{ ...cellStyle }}>
                            <FormatPill format={book.fileFormat} />
                          </td>
                          <td style={{ ...cellStyle, textAlign: 'right' }}>
                            {book.sold}
                          </td>
                          {isAdmin && (
                            <td style={{ ...cellStyle, textAlign: 'right', padding: '10px 0' }}>
                              {formatVND(book.revenue ?? 0)}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                    {data.topBooks.length === 0 && (
                      <tr>
                        <td
                          colSpan={isAdmin ? 6 : 5}
                          style={{
                            padding: '24px 0',
                            fontSize: '13px',
                            color: DS.ink3,
                            textAlign: 'center',
                          }}
                        >
                          Chưa có dữ liệu
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Đơn hàng gần đây */}
            <div
              style={{
                background: DS.surface,
                border: `1px solid ${DS.line}`,
                borderRadius: '2px',
              }}
            >
              <CardHeader link={{ to: '/admin/orders', label: 'Xem tất cả →' }}>
                Đơn hàng gần đây
              </CardHeader>
              <div style={{ padding: '12px 20px 16px' }}>
                {data.recentOrders.length === 0 ? (
                  <p style={{ fontSize: '13px', color: DS.ink3, margin: 0 }}>
                    Chưa có đơn hàng
                  </p>
                ) : (
                  <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0' }}>
                    {data.recentOrders.map((order, idx) => {
                      const isLast = idx === data.recentOrders.length - 1;
                      return (
                        <li
                          key={order.code}
                          style={{
                            display: 'grid',
                            gridTemplateColumns: '1fr auto',
                            gap: '8px',
                            padding: '10px 0',
                            borderBottom: isLast ? 'none' : `1px solid ${DS.line}`,
                            alignItems: 'center',
                          }}
                        >
                          <div>
                            <div
                              style={{
                                fontSize: '12px',
                                fontWeight: 600,
                                color: DS.ink,
                                fontVariantNumeric: 'tabular-nums',
                              }}
                            >
                              {order.code}
                            </div>
                            <div style={{ fontSize: '11px', color: DS.ink2, marginTop: '2px' }}>
                              {order.buyer}
                            </div>
                            <div style={{ fontSize: '10px', color: DS.ink3, marginTop: '2px' }}>
                              {formatDateTime(order.createdAt)}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                            <span
                              style={{
                                fontSize: '12px',
                                fontWeight: 500,
                                color: DS.success,
                                fontVariantNumeric: 'tabular-nums',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {formatVND(order.total)}
                            </span>
                            <StatusBadge status={order.status} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
