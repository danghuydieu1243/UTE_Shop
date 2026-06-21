import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { formatVND, formatDateTime } from '../../../shared/format';
import { COVER_PLACEHOLDER } from '../../../shared/ui/BookCard';
import { useGetOrderQuery, useCancelOrderMutation } from '../ordersApi';
import { useToast } from '../../../shared/hooks/useToast';
import { useGetMeQuery } from '../../auth/authApi';
import { AccountShell } from '../../profile/components/AccountShell';

/* ── Check circle icon SVG ── */
const CheckCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="8" cy="8" r="7" />
    <polyline points="5,8 7,10 11,6" />
  </svg>
);

/* ── X circle icon SVG ── */
const XCircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <circle cx="8" cy="8" r="7" />
    <line x1="5" y1="5" x2="11" y2="11" />
    <line x1="11" y1="5" x2="5" y2="11" />
  </svg>
);

/* ── Circle icon (empty/pending) ── */
const CircleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <circle cx="8" cy="8" r="7" />
  </svg>
);

/* ── Badge trạng thái ── */
const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'NEW') {
    return (
      <span
        className="rounded-[2px] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[1px]"
        style={{ background: '#EDF1F6', color: '#3A5680' }}
      >
        Chờ thanh toán
      </span>
    );
  }
  if (status === 'COMPLETED') {
    return (
      <span
        className="rounded-[2px] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[1px]"
        style={{ background: '#ECF6EE', color: '#2E7D4F' }}
      >
        Hoàn thành
      </span>
    );
  }
  return (
    <span
      className="rounded-[2px] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[1px]"
      style={{ background: '#FBECEC', color: '#B43A3A' }}
    >
      Đã hủy
    </span>
  );
};

/* ─────────────────────────────────────────── */
/*  OrderDetailPage                            */
/*  Route: /user/orders/:code (role 'user')    */
/* ─────────────────────────────────────────── */
export const OrderDetailPage = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { show, ToastLayer } = useToast();
  const [showCancelModal, setShowCancelModal] = useState(false);

  const { data: order, isLoading, isError } = useGetOrderQuery(code ?? '');
  const [cancelOrder, { isLoading: isCancelling }] = useCancelOrderMutation();

  /* ── Lấy userData để truyền vào AccountShell ── */
  const { data: meData } = useGetMeQuery();
  const userData = meData ? { fullName: meData.fullName, email: meData.email } : null;

  const handleCancel = async () => {
    if (!code) return;
    try {
      await cancelOrder(code).unwrap();
      setShowCancelModal(false);
      navigate('/user/orders');
    } catch (err) {
      const e = err as { message?: string };
      show(e?.message || 'Không thể hủy đơn hàng');
      setShowCancelModal(false);
    }
  };

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <AccountShell
        breadcrumbLabel="Chi tiết đơn hàng"
        activeNav="/user/orders"
        userData={userData}
      >
        <div className="p-7">
          <div className="animate-pulse">
            <div className="mb-6 h-8 w-48 rounded bg-line" />
            <div className="grid grid-cols-[1fr_380px] gap-8">
              <div className="h-80 rounded bg-line" />
              <div className="h-60 rounded bg-line" />
            </div>
          </div>
        </div>
      </AccountShell>
    );
  }

  /* ── Error / not found ── */
  if (isError || !order) {
    return (
      <AccountShell
        breadcrumbLabel="Chi tiết đơn hàng"
        activeNav="/user/orders"
        userData={userData}
      >
        <div className="p-7 py-16 text-center">
          <p className="mb-3 text-[22px] font-semibold text-ink">Không tìm thấy đơn hàng</p>
          <p className="mb-8 text-[14px] text-ink-2">
            Đơn hàng không tồn tại hoặc bạn không có quyền xem.
          </p>
          <Link
            to="/user/orders"
            className="inline-flex h-11 items-center rounded-[2px] border border-ink px-6 text-[12px] font-semibold uppercase tracking-[1.5px] text-ink transition-[background,color] duration-200 hover:bg-ink hover:text-paper"
          >
            ← Quay lại đơn hàng
          </Link>
        </div>
      </AccountShell>
    );
  }

  const subtotal = order.subtotal;
  const total = order.total;

  return (
    <AccountShell
      breadcrumbLabel={`Đơn hàng #${order.code}`}
      activeNav="/user/orders"
      userData={userData}
    >
      <ToastLayer />

      {/* ── Page body ── */}
      <div className="p-7">

        {/* ── Page header ── */}
        <div className="mb-8 flex items-center gap-4">
          <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.4px] text-ink">
            #{order.code}
          </h1>
          <StatusBadge status={order.status} />
          <span className="ml-auto text-[13px] text-ink-3">
            Đặt lúc {formatDateTime(order.createdAt)}
          </span>
        </div>

        {/* ── Layout 2 cột ── */}
        <div className="grid grid-cols-[1fr_380px] items-start gap-8">

          {/* ── LEFT ── */}
          <div className="flex flex-col gap-5">

            {/* Timeline trạng thái */}
            <div className="rounded-[2px] border border-line p-5">
              <div className="mb-4 text-[13px] font-semibold text-ink">Trạng thái đơn hàng</div>
              <div className="flex flex-col gap-0">

                {/* Step 1: Đã đặt hàng — luôn done */}
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-6 w-6 items-center justify-center" style={{ color: '#2E7D4F' }}>
                      <CheckCircleIcon />
                    </div>
                    <div
                      className="mt-1 h-8 w-px"
                      style={{ background: order.status !== 'NEW' ? '#2E7D4F' : '#ECEAE5' }}
                    />
                  </div>
                  <div className="pb-4">
                    <div className="text-[13px] font-medium text-ink">Đã đặt hàng</div>
                    <div className="text-[12px] text-ink-3">{formatDateTime(order.createdAt)}</div>
                  </div>
                </div>

                {/* Step 2: Thanh toán / Hủy / Chờ */}
                {order.status === 'COMPLETED' && (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className="flex h-6 w-6 items-center justify-center" style={{ color: '#2E7D4F' }}>
                          <CheckCircleIcon />
                        </div>
                        <div className="mt-1 h-8 w-px" style={{ background: '#2E7D4F' }} />
                      </div>
                      <div className="pb-4">
                        <div className="text-[13px] font-medium text-ink">Đã thanh toán</div>
                        {order.completedAt && (
                          <div className="text-[12px] text-ink-3">{formatDateTime(order.completedAt)}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-6 w-6 items-center justify-center" style={{ color: '#2E7D4F' }}>
                        <CheckCircleIcon />
                      </div>
                      <div>
                        <div className="text-[13px] font-medium text-ink">E-book sẵn sàng</div>
                        <div className="text-[12px] text-ink-3">Bạn có thể tải xuống từ thư viện</div>
                      </div>
                    </div>
                  </>
                )}

                {order.status === 'CANCELLED' && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 items-center justify-center" style={{ color: '#B43A3A' }}>
                      <XCircleIcon />
                    </div>
                    <div>
                      <div className="text-[13px] font-medium" style={{ color: '#B43A3A' }}>Đã hủy</div>
                      {order.cancelledAt && (
                        <div className="text-[12px] text-ink-3">{formatDateTime(order.cancelledAt)}</div>
                      )}
                    </div>
                  </div>
                )}

                {order.status === 'NEW' && (
                  <div className="flex items-start gap-3">
                    <div className="flex h-6 w-6 items-center justify-center text-ink-3">
                      <CircleIcon />
                    </div>
                    <div>
                      <div className="text-[13px] font-medium text-ink-3">Chờ thanh toán</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Danh sách sản phẩm */}
            <div className="rounded-[2px] border border-line p-5">
              <div className="mb-4 text-[13px] font-semibold text-ink">Sản phẩm</div>
              <div className="flex flex-col gap-4">
                {order.items.map((item) => (
                  <div key={item.bookId} className="flex items-start gap-3">
                    {/* Cover */}
                    {item.coverImageUrl ? (
                      <img
                        src={item.coverImageUrl}
                        alt={item.title}
                        className="h-14 w-10 flex-shrink-0 rounded-[2px] border border-line bg-cover-bg object-cover"
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (img.src.endsWith(COVER_PLACEHOLDER)) return;
                          img.src = COVER_PLACEHOLDER;
                        }}
                      />
                    ) : (
                      <div
                        className="flex h-14 w-10 flex-shrink-0 flex-col items-center justify-center gap-0.5 rounded-[2px] border border-line bg-cover-bg p-1"
                        aria-hidden="true"
                        role="presentation"
                      >
                        <div className="h-px w-3.5 bg-ink-3" />
                        <div
                          className="text-center font-semibold leading-[1.2] text-ink line-clamp-3"
                          style={{ fontSize: '6px', wordBreak: 'break-all' }}
                        >
                          {item.title.slice(0, 6)}…
                        </div>
                      </div>
                    )}
                    {/* Title */}
                    <div className="flex-1 min-w-0">
                      <div className="line-clamp-2 text-[13px] font-medium leading-[1.4] text-ink">
                        {item.title}
                      </div>
                      <div className="mt-0.5 text-[11px]" style={{ color: '#B8893B' }}>
                        E-book · PDF/EPUB
                      </div>
                    </div>
                    {/* Price */}
                    <div className="flex-shrink-0 text-[13px] font-semibold tabular-nums text-ink">
                      {formatVND(item.unitPrice)}
                    </div>
                  </div>
                ))}
              </div>
              {/* Subtotal dòng cuối */}
              <div className="mt-4 border-t border-line pt-4 flex items-baseline justify-between">
                <span className="text-[13px] text-ink-2">Tổng tiền hàng</span>
                <span className="text-[14px] font-semibold tabular-nums text-ink">
                  {formatVND(subtotal)}
                </span>
              </div>
            </div>

            {/* Phương thức thanh toán */}
            <div className="rounded-[2px] border border-line p-5">
              <div className="mb-3 text-[13px] font-semibold text-ink">Phương thức thanh toán</div>
              {order.payment ? (
                <div className="text-[13px] text-ink-2">
                  Chuyển khoản QR (SEPay){' '}
                  <span className="font-mono text-ink">— {order.payment.referenceCode}</span>
                </div>
              ) : (
                <div className="text-[13px] text-ink-3">—</div>
              )}
            </div>
          </div>

          {/* ── RIGHT: sticky summary ── */}
          <div className="sticky top-[100px] rounded-[2px] border border-line bg-surface">
            {/* Tóm tắt giá */}
            <div className="px-6 py-5 border-b border-line">
              <div className="text-[11px] font-semibold uppercase tracking-[2px] text-ink">
                Tóm tắt đơn hàng
              </div>
            </div>
            <div className="px-6 py-5">
              <div className="flex items-baseline justify-between text-[13px] mb-3">
                <span className="text-ink-2">Tạm tính</span>
                <span className="font-medium tabular-nums text-ink">{formatVND(subtotal)}</span>
              </div>
              {order.couponDiscount > 0 && (
                <div className="flex items-baseline justify-between text-[13px] mb-3">
                  <span className="text-ink-2">Giảm giá mã</span>
                  <span className="font-medium tabular-nums" style={{ color: '#2E7D4F' }}>
                    -{formatVND(order.couponDiscount)}
                  </span>
                </div>
              )}
              {order.loyaltyDiscount > 0 && (
                <div className="flex items-baseline justify-between text-[13px] mb-3">
                  <span className="text-ink-2">Điểm tích lũy</span>
                  <span className="font-medium tabular-nums" style={{ color: '#2E7D4F' }}>
                    -{formatVND(order.loyaltyDiscount)}
                  </span>
                </div>
              )}
              <div className="my-3 h-px bg-line" />
              <div className="flex items-baseline justify-between">
                <span className="text-[14px] font-semibold text-ink">Tổng cộng</span>
                <span className="text-[20px] font-bold tabular-nums text-ink">{formatVND(total)}</span>
              </div>
            </div>

            {/* Nút hành động */}
            <div className="flex flex-col gap-2 px-6 pb-6">
              {order.status === 'NEW' && (
                <>
                  <Link
                    to={`/checkout/${order.code}`}
                    className="flex h-12 w-full items-center justify-center rounded-[2px] bg-ink text-[11px] font-semibold uppercase tracking-[1.5px] text-paper transition-opacity duration-200 hover:opacity-[0.85]"
                  >
                    Thanh toán QR
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(true)}
                    className="flex h-10 w-full items-center justify-center rounded-[2px] border border-line text-[11px] font-semibold uppercase tracking-[1px] text-ink-2 transition-[border-color,color] duration-200 hover:border-danger hover:text-danger"
                  >
                    Hủy đơn hàng
                  </button>
                </>
              )}
              {order.status === 'COMPLETED' && (
                <>
                  <Link
                    to="/user/ebooks"
                    className="flex h-12 w-full items-center justify-center rounded-[2px] bg-ink text-[11px] font-semibold uppercase tracking-[1.5px] text-paper transition-opacity duration-200 hover:opacity-[0.85]"
                  >
                    Tải E-book
                  </Link>
                  <Link
                    to="/books"
                    className="flex h-10 w-full items-center justify-center rounded-[2px] border border-line text-[11px] font-semibold uppercase tracking-[1px] text-ink transition-[border-color] duration-200 hover:border-ink"
                  >
                    Mua lại
                  </Link>
                </>
              )}
              {order.status === 'CANCELLED' && (
                <>
                  <div
                    className="flex h-10 w-full items-center justify-center rounded-[2px] text-[11px] font-semibold uppercase tracking-[1px] text-ink-3"
                    style={{ background: '#ECEAE5' }}
                  >
                    Đã hủy
                  </div>
                  <Link
                    to="/books"
                    className="flex h-10 w-full items-center justify-center rounded-[2px] border border-line text-[11px] font-semibold uppercase tracking-[1px] text-ink transition-[border-color] duration-200 hover:border-ink"
                  >
                    Mua lại
                  </Link>
                </>
              )}
            </div>

            <Link
              to="/user/orders"
              className="flex items-center gap-1.5 px-6 py-4 text-[12px] text-ink-2 transition-colors hover:text-ink border-t border-line"
            >
              ← Quay lại đơn hàng
            </Link>
          </div>
        </div>
      </div>

      {/* ── Modal xác nhận hủy ── */}
      {showCancelModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.4)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="mx-4 w-full max-w-[400px] rounded-[2px] border border-line bg-paper p-6">
            <h2
              id="modal-title"
              className="mb-3 text-[16px] font-semibold text-ink"
            >
              Xác nhận hủy đơn
            </h2>
            <p className="mb-6 text-[13px] leading-[1.7] text-ink-2">
              Bạn có chắc muốn hủy đơn này? Hành động này không thể khôi phục.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleCancel}
                className="flex h-10 flex-1 items-center justify-center rounded-[2px] text-[11px] font-semibold uppercase tracking-[1px] text-paper transition-opacity duration-200 hover:opacity-[0.85] disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: '#B43A3A' }}
              >
                {isCancelling ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setShowCancelModal(false)}
                className="flex h-10 flex-1 items-center justify-center rounded-[2px] border border-line text-[11px] font-semibold uppercase tracking-[1px] text-ink transition-[border-color] duration-200 hover:border-ink disabled:cursor-not-allowed disabled:opacity-50"
              >
                Không, giữ đơn
              </button>
            </div>
          </div>
        </div>
      )}
    </AccountShell>
  );
};
