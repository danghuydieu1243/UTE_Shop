/** VendorWalletPage (21) — Ví & Doanh thu.
 *  Bám docs/UI_Design/vendor_wallet/. KHÔNG dùng var(--) — chỉ hex DS.
 */
import { useState } from 'react';
import { VendorShell, BtnPrimary } from '../../vendor/components/VendorShell';
import { useGetWalletQuery } from '../walletApi';
import { WithdrawModal } from '../components/WithdrawModal';
import { BarChart } from '../../analytics/components/BarChart';
import { formatVND, formatDateTime } from '../../../shared/format';
import type { WalletTx } from '../types';

type TxTab = 'all' | 'income' | 'withdrawal';

const TX_TYPE_LABEL: Record<string, string> = {
  sale: 'Doanh thu',
  withdrawal: 'Rút tiền',
  refund: 'Hoàn tiền',
  fee: 'Phí',
};

const TX_STATUS_COLOR: Record<string, string> = {
  completed: '#2D7D46',
  pending: '#B8893B',
  processing: '#B8893B',
  failed: '#B43A3A',
  cancelled: '#6B6B73',
};

function txSign(tx: WalletTx): string {
  const withdrawalTypes = ['withdrawal', 'fee'];
  return withdrawalTypes.includes(tx.type) ? '−' : '+';
}

function txAmountColor(tx: WalletTx): string {
  const withdrawalTypes = ['withdrawal', 'fee'];
  return withdrawalTypes.includes(tx.type) ? '#B43A3A' : '#2D7D46';
}

function filterTxByTab(txs: WalletTx[], tab: TxTab): WalletTx[] {
  if (tab === 'income') return txs.filter((t) => !['withdrawal', 'fee'].includes(t.type));
  if (tab === 'withdrawal') return txs.filter((t) => ['withdrawal', 'fee'].includes(t.type));
  return txs;
}

export function VendorWalletPage() {
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [tab, setTab] = useState<TxTab>('all');
  const { data, isLoading, isError } = useGetWalletQuery({ page: 1, limit: 20 });

  const monthlySeries = data?.monthlySeries ?? [];
  const transactions = data?.transactions ?? [];
  const filteredTxs = filterTxByTab(transactions, tab);

  // Map monthlySeries {month, value} → BarChart expects {date, count}
  const chartData = monthlySeries.map((p) => ({ date: p.month, count: p.value }));

  return (
    <VendorShell
      title={
        <span style={{ fontSize: '15px', fontWeight: 600, color: '#16161A' }}>
          Ví &amp; Doanh thu
        </span>
      }
      actions={
        <BtnPrimary onClick={() => setShowWithdraw(true)}>Rút tiền</BtnPrimary>
      }
    >
      {isLoading && (
        <div
          data-testid="loading"
          style={{ padding: '60px 0', textAlign: 'center', color: '#AAAAAE', fontSize: '13px' }}
        >
          Đang tải...
        </div>
      )}

      {isError && !isLoading && (
        <div
          style={{ padding: '60px 0', textAlign: 'center', color: '#B43A3A', fontSize: '13px' }}
        >
          Không thể tải dữ liệu ví. Vui lòng thử lại.
        </div>
      )}

      {!isLoading && !isError && data && (
        <>
          {/* ── Balance cards ───────────────────────────────────────── */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '16px',
            }}
          >
            {/* Khả dụng (prominent) */}
            <div
              style={{
                background: '#16161A',
                color: '#FBFAF8',
                borderRadius: '4px',
                padding: '24px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  opacity: 0.6,
                }}
              >
                Số dư khả dụng
              </span>
              <span
                data-testid="available-balance"
                style={{ fontSize: '28px', fontWeight: 700, letterSpacing: '-0.5px' }}
              >
                {formatVND(data.availableBalance)}
              </span>
            </div>

            {/* Đang chờ */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #ECEAE5',
                borderRadius: '4px',
                padding: '24px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  color: '#B8893B',
                }}
              >
                Đang chờ
              </span>
              <span
                data-testid="pending-balance"
                style={{ fontSize: '22px', fontWeight: 600, color: '#16161A' }}
              >
                {formatVND(data.pendingBalance)}
              </span>
              <span style={{ fontSize: '11px', color: '#AAAAAE' }}>
                Đang chờ xác nhận từ hệ thống
              </span>
            </div>

            {/* Tổng đã rút */}
            <div
              style={{
                background: '#FFFFFF',
                border: '1px solid #ECEAE5',
                borderRadius: '4px',
                padding: '24px 28px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  color: '#6B6B73',
                }}
              >
                Tổng đã rút
              </span>
              <span
                data-testid="total-withdrawn"
                style={{ fontSize: '22px', fontWeight: 600, color: '#16161A' }}
              >
                {formatVND(data.totalWithdrawn)}
              </span>
            </div>
          </div>

          {/* ── Monthly revenue chart ─────────────────────────────── */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #ECEAE5',
              borderRadius: '4px',
              padding: '24px 28px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '1.5px',
                textTransform: 'uppercase',
                color: '#6B6B73',
                marginBottom: '16px',
              }}
            >
              Doanh thu theo tháng
            </div>
            <BarChart data={chartData} height={180} />
          </div>

          {/* ── Transaction history ───────────────────────────────── */}
          <div
            style={{
              background: '#FFFFFF',
              border: '1px solid #ECEAE5',
              borderRadius: '4px',
              padding: '24px 28px',
            }}
          >
            {/* Section header + tabs */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '1.5px',
                  textTransform: 'uppercase',
                  color: '#6B6B73',
                }}
              >
                Lịch sử giao dịch
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['all', 'income', 'withdrawal'] as TxTab[]).map((t) => {
                  const labels: Record<TxTab, string> = {
                    all: 'Tất cả',
                    income: 'Doanh thu',
                    withdrawal: 'Rút tiền',
                  };
                  const isActive = tab === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      style={{
                        height: '26px',
                        padding: '0 10px',
                        fontSize: '11px',
                        fontWeight: isActive ? 600 : 400,
                        background: isActive ? '#16161A' : 'none',
                        color: isActive ? '#FBFAF8' : '#6B6B73',
                        border: isActive ? 'none' : '1px solid #ECEAE5',
                        borderRadius: '2px',
                        cursor: 'pointer',
                      }}
                    >
                      {labels[t]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Table */}
            {filteredTxs.length === 0 ? (
              <div
                style={{
                  padding: '32px 0',
                  textAlign: 'center',
                  fontSize: '13px',
                  color: '#AAAAAE',
                }}
              >
                Chưa có giao dịch nào.
              </div>
            ) : (
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '13px',
                }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: '1px solid #ECEAE5',
                      color: '#6B6B73',
                      fontSize: '11px',
                      letterSpacing: '0.5px',
                      textTransform: 'uppercase',
                    }}
                  >
                    <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600 }}>
                      Ngày
                    </th>
                    <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600 }}>
                      Loại
                    </th>
                    <th style={{ textAlign: 'left', padding: '8px 0', fontWeight: 600 }}>
                      Mô tả
                    </th>
                    <th style={{ textAlign: 'right', padding: '8px 0', fontWeight: 600 }}>
                      Số tiền
                    </th>
                    <th style={{ textAlign: 'center', padding: '8px 0', fontWeight: 600 }}>
                      Trạng thái
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTxs.map((tx) => (
                    <tr
                      key={tx.id}
                      style={{ borderBottom: '1px solid #F4F2ED' }}
                    >
                      <td style={{ padding: '10px 0', color: '#6B6B73', whiteSpace: 'nowrap' }}>
                        {formatDateTime(tx.createdAt)}
                      </td>
                      <td style={{ padding: '10px 0' }}>
                        {TX_TYPE_LABEL[tx.type] ?? tx.type}
                      </td>
                      <td
                        style={{
                          padding: '10px 0',
                          color: '#6B6B73',
                          maxWidth: '240px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {tx.description}
                      </td>
                      <td
                        style={{
                          padding: '10px 0',
                          textAlign: 'right',
                          fontWeight: 600,
                          color: txAmountColor(tx),
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {txSign(tx)}{formatVND(tx.amount)}
                      </td>
                      <td style={{ padding: '10px 0', textAlign: 'center' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '2px',
                            fontSize: '10px',
                            fontWeight: 600,
                            letterSpacing: '0.5px',
                            textTransform: 'uppercase',
                            color: TX_STATUS_COLOR[tx.status] ?? '#6B6B73',
                            background:
                              tx.status === 'completed'
                                ? '#E8F5EC'
                                : tx.status === 'failed' || tx.status === 'cancelled'
                                ? '#FDEAEA'
                                : '#FDF5E6',
                          }}
                        >
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* ── WithdrawModal ─────────────────────────────────────────── */}
      {showWithdraw && (
        <WithdrawModal
          availableBalance={data?.availableBalance ?? 0}
          onClose={() => setShowWithdraw(false)}
          onSuccess={() => setShowWithdraw(false)}
        />
      )}
    </VendorShell>
  );
}
