import { useState } from 'react';
import { Link } from 'react-router-dom';
import { SiteHeader, SiteFooter } from '../../../shared/ui';
import { formatVND } from '../../../shared/format';
import { useGetOrdersQuery, useCancelOrderMutation } from '../ordersApi';
import { useToast } from '../../../shared/hooks/useToast';
import type { OrderSummary } from '../types';

/* ── Kiểu status filter ── */
type StatusFilter = 'NEW' | 'COMPLETED' | 'CANCELLED' | undefined;

/* ── Nhãn trạng thái ── */
const STATUS_LABEL: Record<string, string> = {
  NEW: 'Chờ thanh toán',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
};

/* ── Empty box icon SVG ── */
const EmptyBoxIcon = () => (
  <svg
    className="mb-6 text-ink-3"
    width="56"
    height="56"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </svg>
);

/* ── Badge trạng thái ── */
const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'NEW') {
    return (
      <span
        className="rounded-[2px] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[1px]"
        style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}
      >
        {STATUS_LABEL[status]}
      </span>
    );
  }
  if (status === 'COMPLETED') {
    return (
      <span
        className="rounded-[2px] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[1px]"
        style={{ background: 'var(--success-bg)', color: 'var(--success)' }}
      >
        {STATUS_LABEL[status]}
      </span>
    );
  }
  // CANCELLED — muted
  return (
    <span
      className="rounded-[2px] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[1px] text-ink-3"
      style={{ background: 'var(--line)' }}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
};

/* ── Định dạng datetime VN ── */
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  const dd = d.getDate().toString().padStart(2, '0');
  const mo = (d.getMonth() + 1).toString().padStart(2, '0');
  const yy = d.getFullYear();
  return `${hh}:${mm}, ${dd}/${mo}/${yy}`;
}

/* ── Order Card ── */
const OrderCard = ({
  order,
  onCancel,
  isCancelling,
}: {
  order: OrderSummary;
  onCancel: (code: string) => void;
  isCancelling: boolean;
}) => {
  return (
    <div className="rounded-[2px] border border-line transition-[border-color] duration-200 hover:border-ink-2">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-line px-5 py-3">
        <span className="text-[13px] font-semibold text-ink">{order.code}</span>
        <span className="text-ink-3">|</span>
        <span className="text-[12px] text-ink-3">{formatDateTime(order.createdAt)}</span>
        <div className="ml-auto">
          <StatusBadge status={order.status} />
        </div>
      </div>

      {/* Body — click navigates to detail */}
      <Link
        to={`/orders/${order.code}`}
        className="block px-5 py-4 transition-[background] duration-150 hover:bg-surface"
      >
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-ink-2">{order.itemCount} sản phẩm</span>
          <span className="text-[15px] font-semibold tabular-nums text-ink">
            {formatVND(order.total)}
          </span>
        </div>
      </Link>

      {/* Footer actions */}
      <div className="flex items-center gap-3 border-t border-line px-5 py-3">
        {order.status === 'NEW' && (
          <>
            <Link
              to={`/checkout/${order.code}`}
              className="inline-flex h-8 items-center rounded-[2px] bg-ink px-4 text-[11px] font-semibold uppercase tracking-[1px] text-paper transition-opacity duration-200 hover:opacity-[0.85]"
            >
              Tiếp tục thanh toán
            </Link>
            <button
              type="button"
              disabled={isCancelling}
              onClick={() => onCancel(order.code)}
              className="inline-flex h-8 items-center rounded-[2px] border border-line px-4 text-[11px] font-semibold uppercase tracking-[1px] text-ink-2 transition-[border-color,color] duration-200 hover:border-danger hover:text-danger disabled:cursor-not-allowed disabled:opacity-50"
              style={{ '--danger': 'var(--danger)' } as React.CSSProperties}
            >
              Hủy đơn
            </button>
          </>
        )}
        {order.status === 'COMPLETED' && (
          <>
            <Link
              to={`/orders/${order.code}`}
              className="inline-flex h-8 items-center rounded-[2px] border border-line px-4 text-[11px] font-semibold uppercase tracking-[1px] text-ink transition-[border-color] duration-200 hover:border-ink"
            >
              Xem chi tiết
            </Link>
            <Link
              to="/me/ebooks"
              className="inline-flex h-8 items-center rounded-[2px] bg-ink px-4 text-[11px] font-semibold uppercase tracking-[1px] text-paper transition-opacity duration-200 hover:opacity-[0.85]"
            >
              Tải E-book
            </Link>
          </>
        )}
        {order.status === 'CANCELLED' && (
          <Link
            to={`/orders/${order.code}`}
            className="inline-flex h-8 items-center rounded-[2px] border border-line px-4 text-[11px] font-semibold uppercase tracking-[1px] text-ink transition-[border-color] duration-200 hover:border-ink"
          >
            Xem chi tiết
          </Link>
        )}
      </div>
    </div>
  );
};

/* ── Skeleton card ── */
const SkeletonCard = () => (
  <div className="animate-pulse rounded-[2px] border border-line">
    <div className="flex items-center gap-3 border-b border-line px-5 py-3">
      <div className="h-4 w-32 rounded bg-line" />
      <div className="ml-auto h-5 w-20 rounded bg-line" />
    </div>
    <div className="px-5 py-4">
      <div className="flex items-center justify-between">
        <div className="h-4 w-24 rounded bg-line" />
        <div className="h-5 w-20 rounded bg-line" />
      </div>
    </div>
    <div className="flex items-center gap-3 border-t border-line px-5 py-3">
      <div className="h-8 w-36 rounded bg-line" />
    </div>
  </div>
);

/* ─────────────────────────────────────────── */
/*  OrderHistoryPage                           */
/*  Route: /orders (role 'user')               */
/* ─────────────────────────────────────────── */
export const OrderHistoryPage = () => {
  const { show, ToastLayer } = useToast();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(undefined);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useGetOrdersQuery({
    status: statusFilter,
    page,
    limit: 10,
  });

  const [cancelOrder, { isLoading: isCancelling }] = useCancelOrderMutation();

  const orders = data?.orders ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 1 };

  const handleTabChange = (status: StatusFilter) => {
    setStatusFilter(status);
    setPage(1);
  };

  const handleCancel = async (code: string) => {
    try {
      await cancelOrder(code).unwrap();
    } catch (err) {
      const e = err as { message?: string };
      show(e?.message || 'Không thể hủy đơn hàng');
    }
  };

  const tabs: { label: string; status: StatusFilter }[] = [
    { label: 'Tất cả', status: undefined },
    { label: 'Chờ thanh toán', status: 'NEW' },
    { label: 'Hoàn tất', status: 'COMPLETED' },
    { label: 'Đã hủy', status: 'CANCELLED' },
  ];

  return (
    <div className="min-h-screen bg-paper">
      <ToastLayer />
      <SiteHeader />

      {/* ── Breadcrumb ── */}
      <div className="border-b border-line pt-[72px]">
        <div className="mx-auto max-w-container px-10 py-[14px]">
          <nav className="flex items-center gap-2 text-[12px] text-ink-2" aria-label="Breadcrumb">
            <Link to="/" className="text-ink-2 transition-colors hover:text-ink">
              Trang chủ
            </Link>
            <span className="text-ink-3">/</span>
            <span className="font-medium text-ink">Đơn hàng</span>
          </nav>
        </div>
      </div>

      {/* ── Page body ── */}
      <div className="mx-auto max-w-container px-10 py-10 pb-20">
        <h1 className="mb-6 text-[28px] font-semibold leading-tight tracking-[-0.5px] text-ink">
          Đơn hàng của bạn
        </h1>

        {/* ── Filter tabs ── */}
        <div className="mb-6 flex items-center gap-0 border-b border-line">
          {tabs.map((tab) => {
            const isActive = statusFilter === tab.status;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => handleTabChange(tab.status)}
                className="relative px-4 py-3 text-[13px] font-medium transition-colors duration-150"
                style={{
                  color: isActive ? 'var(--ink)' : 'var(--ink-3)',
                  borderBottom: isActive ? '2px solid var(--ink)' : '2px solid transparent',
                  marginBottom: '-1px',
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ── Content ── */}
        {isLoading ? (
          <div className="flex flex-col gap-4">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : orders.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center py-24 text-center">
            <EmptyBoxIcon />
            <p className="mb-3 text-[22px] font-semibold leading-tight tracking-[-0.4px] text-ink">
              Chưa có đơn hàng nào
            </p>
            <p className="mb-8 max-w-[340px] text-[14px] leading-[1.7] text-ink-2">
              Bạn chưa có đơn hàng nào. Hãy khám phá kho sách của Athena.
            </p>
            <Link
              to="/books"
              className="inline-flex h-11 items-center rounded-[2px] border border-ink px-6 text-[12px] font-semibold uppercase tracking-[1.5px] text-ink transition-[background,color] duration-200 hover:bg-ink hover:text-paper"
            >
              Khám phá sách →
            </Link>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {orders.map((order) => (
                <OrderCard
                  key={order.code}
                  order={order}
                  onCancel={handleCancel}
                  isCancelling={isCancelling}
                />
              ))}
            </div>

            {/* ── Phân trang ── */}
            {pagination.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="inline-flex h-9 items-center rounded-[2px] border border-line px-4 text-[12px] font-medium text-ink transition-[border-color] duration-150 hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Trang trước
                </button>
                <span className="text-[13px] text-ink-2">
                  Trang {pagination.page}/{pagination.totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= pagination.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="inline-flex h-9 items-center rounded-[2px] border border-line px-4 text-[12px] font-medium text-ink transition-[border-color] duration-150 hover:border-ink disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Trang sau →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <SiteFooter />
    </div>
  );
};
