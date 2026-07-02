/** VendorDashboardPage — Screen 17 (Phase 6b, Task 4).
 *  Wrap in VendorShell. Period selector. KPIs (4). Revenue chart. Recent orders. Top books.
 *  Hard rules: NO var(--…), inline styles only with hex DS values.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { VendorShell } from '../../vendor/components/VendorShell';
import { useGetVendorDashboardQuery } from '../analyticsApi';
import { LineAreaChart } from '../components/LineAreaChart';
import { formatVND } from '../../../shared/format';

// ── Period options ─────────────────────────────────────────────────────────────
const PERIOD_OPTIONS: { value: string; label: string }[] = [
  { value: '30d',   label: '30 ngày gần nhất' },
  { value: 'month', label: 'Tháng này' },
  { value: '7d',    label: '7 ngày' },
  { value: 'today', label: 'Hôm nay' },
];

// ── KPI Card ──────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: string;
}

const KpiCard = ({ label, value }: KpiCardProps) => (
  <div
    style={{
      flex: '1 1 0',
      minWidth: '160px',
      background: '#FFFFFF',
      border: '1px solid #ECEAE5',
      borderRadius: '2px',
      padding: '20px 24px',
    }}
  >
    <div
      style={{
        fontSize: '9px',
        fontWeight: 600,
        letterSpacing: '1.2px',
        textTransform: 'uppercase',
        color: '#A8A8AE',
        marginBottom: '10px',
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: '22px',
        fontWeight: 600,
        color: '#16161A',
        fontVariantNumeric: 'tabular-nums',
        letterSpacing: '-.4px',
      }}
    >
      {value}
    </div>
  </div>
);

// ── Section header ─────────────────────────────────────────────────────────────
const SectionHeader = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      fontSize: '11px',
      fontWeight: 600,
      letterSpacing: '.8px',
      textTransform: 'uppercase',
      color: '#A8A8AE',
      marginBottom: '12px',
    }}
  >
    {children}
  </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────
export const VendorDashboardPage = () => {
  const [period, setPeriod] = useState('30d');
  const { data, isLoading, isError, refetch } = useGetVendorDashboardQuery(period);

  // ── Period select (topbar actions) ──────────────────────────────────────────
  const periodSelect = (
    <select
      value={period}
      onChange={(e) => setPeriod(e.target.value)}
      aria-label="Chọn khoảng thời gian"
      style={{
        height: '32px',
        padding: '0 10px',
        border: '1px solid #ECEAE5',
        borderRadius: '2px',
        background: '#FFFFFF',
        fontSize: '12px',
        fontFamily: "'Inter', sans-serif",
        color: '#16161A',
        cursor: 'pointer',
      }}
    >
      {PERIOD_OPTIONS.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );

  return (
    <VendorShell title="Tổng quan" actions={periodSelect}>

      {/* ── Loading state (skeleton trên nền trắng để nổi trên bg #F4F3F0 của shell) ── */}
      {isLoading && (
        <div
          data-testid="loading"
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: '72px',
                background: '#FFFFFF',
                border: '1px solid #ECEAE5',
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
            background: '#FFFFFF',
            border: '1px solid #ECEAE5',
            borderRadius: '2px',
            padding: '40px 24px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#16161A', marginBottom: '6px' }}>
            Không tải được dữ liệu tổng quan
          </div>
          <div style={{ fontSize: '13px', color: '#6B6B73', marginBottom: '16px' }}>
            Vui lòng thử lại. Nếu vẫn lỗi, hãy đăng nhập lại.
          </div>
          <button
            onClick={() => refetch()}
            style={{
              height: '34px',
              padding: '0 16px',
              background: '#16161A',
              color: '#FBFAF8',
              fontSize: '12px',
              fontWeight: 600,
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
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
          <div
            style={{
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <KpiCard label="Doanh thu" value={formatVND(data.kpis.revenue)} />
            <KpiCard label="Đơn hàng" value={String(data.kpis.orders)} />
            <KpiCard label="Sản phẩm đang bán" value={String(data.kpis.productsOnSale)} />
            <KpiCard
              label="Đánh giá trung bình"
              value={`${data.kpis.avgRating.toFixed(1)} / 5`}
            />
          </div>

          {/* ── Breakdown: doanh thu (giá bán) → phí sàn → thực nhận ── */}
          <div
            style={{
              fontSize: '12px',
              color: '#6B6B73',
              fontVariantNumeric: 'tabular-nums',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'baseline',
              gap: '6px',
            }}
          >
            <span>Doanh thu (giá bán) <strong style={{ color: '#16161A' }}>{formatVND(data.kpis.grossRevenue)}</strong></span>
            <span>→ − Phí sàn <strong style={{ color: '#16161A' }}>{formatVND(data.kpis.totalFee)}</strong></span>
            <span>→ = Thực nhận <strong style={{ color: '#2E7D4F' }}>{formatVND(data.kpis.netRevenue)}</strong></span>
          </div>

          {/* ── Row 2: Revenue chart + Recent orders ── */}
          <div
            style={{
              display: 'flex',
              gap: '16px',
              alignItems: 'flex-start',
              flexWrap: 'wrap',
            }}
          >
            {/* Chart */}
            <div
              style={{
                flex: '2 1 360px',
                background: '#FFFFFF',
                border: '1px solid #ECEAE5',
                borderRadius: '2px',
                padding: '20px 24px',
              }}
            >
              <SectionHeader>Doanh thu</SectionHeader>
              <LineAreaChart data={data.revenueSeries} />
            </div>

            {/* Recent orders */}
            <div
              style={{
                flex: '1 1 220px',
                background: '#FFFFFF',
                border: '1px solid #ECEAE5',
                borderRadius: '2px',
                padding: '20px 24px',
              }}
            >
              <SectionHeader>Đơn mới gần đây</SectionHeader>
              {data.recentOrders.length === 0 ? (
                <p
                  style={{
                    fontSize: '13px',
                    color: '#A8A8AE',
                    margin: 0,
                  }}
                >
                  Chưa có đơn hàng
                </p>
              ) : (
                <ul
                  style={{
                    listStyle: 'none',
                    margin: 0,
                    padding: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  {data.recentOrders.map((order) => (
                    <li
                      key={order.code}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        gap: '8px',
                      }}
                    >
                      <div>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#16161A',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {order.code}
                        </span>
                        <div
                          style={{
                            fontSize: '11px',
                            color: '#6B6B73',
                            marginTop: '1px',
                            maxWidth: '140px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {order.title}
                        </div>
                      </div>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 500,
                          color: '#2E7D4F',
                          fontVariantNumeric: 'tabular-nums',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {formatVND(order.total)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <div style={{ marginTop: '16px', borderTop: '1px solid #ECEAE5', paddingTop: '12px' }}>
                <Link
                  to="/vendor/orders"
                  style={{
                    fontSize: '12px',
                    color: '#6B6B73',
                    textDecoration: 'none',
                  }}
                >
                  Xem tất cả →
                </Link>
              </div>
            </div>
          </div>

          {/* ── Row 3: Top E-books table ── */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #ECEAE5',
              borderRadius: '2px',
              padding: '20px 24px',
            }}
          >
            <SectionHeader>Top E-book</SectionHeader>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['#', 'E-book', 'Đã bán', 'Doanh thu'].map((h) => (
                      <th
                        key={h}
                        style={{
                          fontSize: '9px',
                          fontWeight: 600,
                          letterSpacing: '1px',
                          textTransform: 'uppercase',
                          color: '#A8A8AE',
                          padding: '0 12px 10px 0',
                          textAlign: h === 'Đã bán' || h === 'Doanh thu' ? 'right' : 'left',
                          borderBottom: '1px solid #ECEAE5',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.topBooks.slice(0, 5).map((book, idx) => (
                    <tr key={book.bookId}>
                      <td
                        style={{
                          padding: '10px 12px 10px 0',
                          fontSize: '11px',
                          color: '#A8A8AE',
                          fontVariantNumeric: 'tabular-nums',
                          borderBottom: idx < Math.min(data.topBooks.length, 5) - 1 ? '1px solid #ECEAE5' : 'none',
                          verticalAlign: 'middle',
                        }}
                      >
                        {String(idx + 1).padStart(2, '0')}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px 10px 0',
                          borderBottom: idx < Math.min(data.topBooks.length, 5) - 1 ? '1px solid #ECEAE5' : 'none',
                          verticalAlign: 'middle',
                        }}
                      >
                        <div
                          style={{
                            fontSize: '13px',
                            fontWeight: 500,
                            color: '#16161A',
                            maxWidth: '280px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {book.title}
                        </div>
                        {book.author && (
                          <div
                            style={{
                              fontSize: '11px',
                              color: '#A8A8AE',
                              marginTop: '1px',
                            }}
                          >
                            {book.author}
                          </div>
                        )}
                      </td>
                      <td
                        style={{
                          padding: '10px 12px 10px 0',
                          textAlign: 'right',
                          fontSize: '13px',
                          fontVariantNumeric: 'tabular-nums',
                          color: '#16161A',
                          borderBottom: idx < Math.min(data.topBooks.length, 5) - 1 ? '1px solid #ECEAE5' : 'none',
                          verticalAlign: 'middle',
                        }}
                      >
                        {book.sold}
                      </td>
                      <td
                        style={{
                          padding: '10px 0',
                          textAlign: 'right',
                          fontSize: '13px',
                          fontVariantNumeric: 'tabular-nums',
                          color: '#16161A',
                          borderBottom: idx < Math.min(data.topBooks.length, 5) - 1 ? '1px solid #ECEAE5' : 'none',
                          verticalAlign: 'middle',
                        }}
                      >
                        {formatVND(book.revenue)}
                      </td>
                    </tr>
                  ))}
                  {data.topBooks.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          padding: '24px 0',
                          fontSize: '13px',
                          color: '#A8A8AE',
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
        </>
      )}
    </VendorShell>
  );
};
