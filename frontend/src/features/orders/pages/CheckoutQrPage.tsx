import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useGetOrderQuery, useSimulatePaymentMutation, useCancelOrderMutation, useRecreatePaymentMutation } from '../ordersApi';
import { useToast } from '../../../shared/hooks/useToast';
import { formatVND } from '../../../shared/format';
import { COVER_PLACEHOLDER } from '../../../shared/ui/BookCard';

/* ── Countdown helper ── */
function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSec = Math.floor(ms / 1000);
  const mm = Math.floor(totalSec / 60).toString().padStart(2, '0');
  const ss = (totalSec % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

/* ── Lock icon SVG ── */
/* Intentionally duplicated from CheckoutPage — both pages are standalone checkout
   shells with their own reduced navbar; extracting to a shared file is deferred
   until a shared checkout-shell layout component is needed. */
const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.4" fill="none" aria-hidden="true">
    <rect x="2" y="5" width="8" height="6" rx="1" />
    <path d="M4,5V3.5a2,2,0,0,1,4,0V5" />
  </svg>
);

/* ── Copy icon SVG ── */
const CopyIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
    <rect x="4" y="4" width="7" height="7" rx="0.5" />
    <path d="M2,8H1.5a1,1,0,0,1-1-1V1.5a1,1,0,0,1,1-1H7a1,1,0,0,1,1,1V2" />
  </svg>
);

/* ── QR SVG placeholder ── */
const QrPlaceholder = () => (
  <svg width="180" height="180" viewBox="0 0 180 180" fill="var(--ink)" xmlns="http://www.w3.org/2000/svg" aria-label="QR code placeholder">
    <rect x="8" y="8" width="48" height="48"/>
    <rect x="16" y="16" width="32" height="32" fill="var(--paper)"/>
    <rect x="22" y="22" width="20" height="20"/>
    <rect x="124" y="8" width="48" height="48"/>
    <rect x="132" y="16" width="32" height="32" fill="var(--paper)"/>
    <rect x="138" y="22" width="20" height="20"/>
    <rect x="8" y="124" width="48" height="48"/>
    <rect x="16" y="132" width="32" height="32" fill="var(--paper)"/>
    <rect x="22" y="138" width="20" height="20"/>
    <rect x="70" y="12" width="8" height="8"/><rect x="82" y="12" width="8" height="8"/><rect x="94" y="12" width="8" height="8"/>
    <rect x="70" y="26" width="8" height="8"/><rect x="94" y="26" width="8" height="8"/>
    <rect x="70" y="40" width="20" height="8"/><rect x="98" y="40" width="8" height="8"/>
    <rect x="10" y="70" width="12" height="8"/><rect x="28" y="70" width="8" height="8"/><rect x="42" y="70" width="8" height="8"/>
    <rect x="58" y="70" width="8" height="8"/><rect x="70" y="70" width="8" height="8"/><rect x="84" y="70" width="8" height="8"/><rect x="98" y="70" width="8" height="8"/>
    <rect x="114" y="70" width="8" height="8"/><rect x="128" y="70" width="8" height="8"/><rect x="142" y="70" width="8" height="8"/>
    <rect x="10" y="84" width="18" height="8"/><rect x="36" y="84" width="8" height="8"/><rect x="50" y="84" width="8" height="8"/><rect x="64" y="84" width="8" height="8"/>
    <rect x="110" y="84" width="18" height="8"/><rect x="136" y="84" width="8" height="8"/><rect x="150" y="84" width="18" height="8"/>
    <rect x="10" y="98" width="8" height="8"/><rect x="24" y="98" width="18" height="8"/><rect x="50" y="98" width="8" height="8"/><rect x="110" y="98" width="8" height="8"/><rect x="124" y="98" width="18" height="8"/>
    <rect x="10" y="112" width="22" height="8"/><rect x="40" y="112" width="8" height="8"/><rect x="54" y="112" width="8" height="8"/><rect x="110" y="112" width="8" height="8"/><rect x="124" y="112" width="8" height="8"/><rect x="138" y="112" width="22" height="8"/>
    <rect x="68" y="128" width="8" height="8"/><rect x="82" y="128" width="18" height="8"/>
    <rect x="68" y="142" width="8" height="8"/><rect x="82" y="142" width="8" height="8"/><rect x="96" y="142" width="8" height="8"/>
    <rect x="68" y="156" width="18" height="8"/><rect x="94" y="156" width="8" height="8"/>
  </svg>
);

/* ─────────────────────────────────────────── */
/*  CheckoutQrPage                             */
/*  Route: /checkout/:code                     */
/* ─────────────────────────────────────────── */
export const CheckoutQrPage = () => {
  const navigate = useNavigate();
  const { code } = useParams<{ code: string }>();
  const { show, ToastLayer } = useToast();

  const { data: order, isLoading } = useGetOrderQuery(code!);
  const [simulatePayment, { isLoading: isSimulating }] = useSimulatePaymentMutation();
  const [cancelOrder, { isLoading: isCancelling }] = useCancelOrderMutation();
  const [recreatePayment, { isLoading: isRecreating }] = useRecreatePaymentMutation();

  /* ── Countdown state (null = chưa tính, tránh flash "Hết hạn" ở frame đầu) ── */
  const [countdown, setCountdown] = useState<number | null>(null);

  /* ── Tính countdown từ payment.expiresAt ── */
  useEffect(() => {
    const payment = order?.payment;
    if (!payment) {
      setCountdown(null);
      return;
    }
    const updateCountdown = () => {
      const remaining = new Date(payment.expiresAt).getTime() - Date.now();
      setCountdown(remaining);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [order?.payment]);

  /* ── Tham chiếu payment ── */
  const payment = order?.payment ?? null;

  /* ── isExpired: phát hiện hết hạn dựa expiresAt (không dùng status 'EXPIRED' vì không tồn tại)
     - countdown đã được tính (không null) VÀ <= 0
     - HOẶC payment.status === 'FAILED' (thanh toán thất bại — cũng cần tạo lại)
  ── */
  const isExpired =
    payment !== null &&
    countdown !== null &&
    countdown <= 0;

  /* ── showRecreate: hiện nút "Tạo lại QR" khi:
     - payment chưa tồn tại (null)
     - payment.status === 'FAILED' (thất bại)
     - payment PENDING đã quá expiresAt (isExpired)
  ── */
  const showRecreate =
    payment === null ||
    payment.status === 'FAILED' ||
    isExpired;

  /* ── canCancel: chỉ cho phép hủy khi đơn hàng ở trạng thái NEW ── */
  const canCancel = order?.status === 'NEW';

  /* ── Giả lập thanh toán thành công ── */
  const handleSimulate = useCallback(async () => {
    if (!payment) return;
    try {
      await simulatePayment(payment.id).unwrap();
      navigate('/orders/' + code);
    } catch (err) {
      const e = err as { message?: string };
      show(e?.message || 'Không thể xác nhận thanh toán');
    }
  }, [payment, simulatePayment, navigate, code, show]);

  /* ── Hủy đơn hàng ── */
  const handleCancel = useCallback(async () => {
    try {
      await cancelOrder(code!).unwrap();
      navigate('/cart');
    } catch (err) {
      const e = err as { message?: string };
      show(e?.message || 'Không thể hủy đơn hàng');
    }
  }, [cancelOrder, code, navigate, show]);

  /* ── Tạo lại QR ── */
  const handleRecreate = useCallback(async () => {
    try {
      await recreatePayment(code!).unwrap();
      show('Đã tạo lại mã QR');
    } catch (err) {
      const e = err as { message?: string };
      show(e?.message || 'Không thể tạo lại mã QR');
    }
  }, [recreatePayment, code, show]);

  /* ── Copy nội dung chuyển khoản ── */
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => show('Đã sao chép')).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-paper">
      <ToastLayer />

      {/* ── Navbar rút gọn ── */}
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-line bg-paper">
        <div className="mx-auto flex max-w-container items-center justify-between px-10 h-[64px]">
          {/* FIX 6: logo uppercase */}
          <Link to="/" className="text-[18px] font-semibold uppercase tracking-[1px] text-ink">
            Athena
          </Link>
          {/* FIX 6: secure text dùng text-ink-3 theo static */}
          <div className="flex items-center gap-1.5 text-[12px] text-ink-3">
            <LockIcon />
            Thanh toán an toàn
          </div>
        </div>
      </header>

      <div className="pt-[64px]">
        {/* ── Stepper (FIX 2) — canh giữa, max-w ~480px, nhãn UPPERCASE, bước done dùng success token ── */}
        <div className="border-b border-line py-5">
          <div className="mx-auto flex max-w-[480px] items-center">
            {/* Step 1 — done (success color) */}
            <div className="flex flex-1 flex-col items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold"
                style={{ background: 'var(--success-bg)', border: '1.5px solid var(--success)', color: 'var(--success)' }}
              >
                1
              </div>
              <span
                className="text-[11px] font-medium uppercase tracking-[0.5px]"
                style={{ color: 'var(--success)' }}
              >
                Xác nhận
              </span>
            </div>
            {/* Line 1-2 done (success) */}
            <div className="h-px flex-1" style={{ background: 'var(--success)', marginTop: '-20px' }} />
            {/* Step 2 — done (success color) */}
            <div className="flex flex-1 flex-col items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold"
                style={{ background: 'var(--success-bg)', border: '1.5px solid var(--success)', color: 'var(--success)' }}
              >
                2
              </div>
              <span
                className="text-[11px] font-medium uppercase tracking-[0.5px]"
                style={{ color: 'var(--success)' }}
              >
                Thanh toán
              </span>
            </div>
            {/* Line 2-3 inactive */}
            <div className="h-px flex-1 bg-line" style={{ marginTop: '-20px' }} />
            {/* Step 3 — active */}
            <div className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[12px] font-semibold text-paper">
                3
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-ink">
                Hoàn tất
              </span>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="mx-auto max-w-container px-10 py-10 pb-20">
          {isLoading ? (
            <div className="animate-pulse">
              <div className="grid grid-cols-[1fr_380px] gap-8">
                <div className="h-[480px] rounded bg-line" />
                <div className="h-60 rounded bg-line" />
              </div>
            </div>
          ) : !order ? (
            <div className="flex flex-col items-center py-24 text-center">
              <p className="mb-3 text-[22px] font-semibold text-ink">Không tìm thấy đơn hàng</p>
              <Link to="/cart" className="text-[13px] text-ink-2 hover:text-ink">← Quay lại giỏ hàng</Link>
            </div>
          ) : (
            /* ── Layout 2 cột ── */
            <div className="grid grid-cols-[1fr_380px] items-start gap-8">

              {/* ── LEFT: Status card ── */}
              <div className="rounded-[2px] border border-line bg-surface">

                {/* Status header */}
                <div className="border-b border-line px-6 py-5">
                  <h1 className="text-[20px] font-semibold tracking-[-0.4px] text-ink">Hoàn tất thanh toán</h1>
                  <p className="mt-1 text-[13px] text-ink-2">Quét mã QR bên dưới để chuyển khoản</p>
                </div>

                {/* Status body */}
                <div className="p-6 flex flex-col gap-5">

                  {/* Status row */}
                  <div className="flex flex-wrap items-center gap-3">
                    <span
                      className="inline-flex items-center rounded-[2px] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.5px]"
                      style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}
                    >
                      Đang chờ xác nhận
                    </span>
                    <span className="text-[13px] text-ink-2">
                      Mã đơn hàng: <span className="font-semibold text-ink">#{order.code}</span>
                    </span>
                  </div>

                  {/* QR panel */}
                  <div
                    className="grid gap-6"
                    style={{ gridTemplateColumns: '280px 1fr' }}
                  >
                    {/* QR frame */}
                    <div
                      className="relative flex h-[240px] w-[240px] items-center justify-center rounded-[4px] border border-line bg-paper"
                      data-testid="qr-frame"
                    >
                      <QrPlaceholder />
                      {/* ATH logo absolute */}
                      <div
                        className="absolute flex h-[42px] w-[42px] items-center justify-center rounded-full border border-line bg-paper text-[11px] font-bold text-ink"
                        style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                      >
                        ATH
                      </div>
                    </div>

                    {/* Right side */}
                    <div className="flex flex-col justify-center">
                      <p className="mb-1 text-[14px] font-semibold text-ink">SEPay QR</p>
                      <p className="mb-4 text-[13px] text-ink-2">Dùng app ngân hàng để quét mã</p>

                      {/* FIX 4: Countdown bọc trong countdown-wrap nền warning-bg + viền ── */}
                      {payment && !isExpired ? (
                        <div
                          className="mb-3 rounded-[2px] px-4 py-3"
                          style={{ background: 'var(--warning-bg)', border: '1px solid #ECD8B2' }}
                        >
                          <p
                            className="mb-1 text-[11px] uppercase tracking-[0.5px]"
                            style={{ color: 'var(--warning)' }}
                          >
                            Hết hạn sau
                          </p>
                          <p className="text-[28px] font-bold tabular-nums text-ink leading-none">
                            {countdown !== null ? formatCountdown(countdown) : '--:--'}
                          </p>
                        </div>
                      ) : (
                        <div className="mb-3">
                          <span
                            className="inline-flex items-center rounded-[2px] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.5px]"
                            style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}
                          >
                            Hết hạn
                          </span>
                        </div>
                      )}

                      {/* FIX 4: dòng polling-note theo static ── */}
                      <p className="text-[12px] text-ink-2">
                        Đang chờ xác nhận thanh toán từ cổng SEPay. Vui lòng không đóng trang này.
                      </p>
                    </div>
                  </div>

                  {/* Info list */}
                  {payment && (
                    <div className="flex flex-col gap-3 rounded-[2px] border border-line p-4">
                      {/* Nội dung chuyển khoản */}
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-ink-2">Nội dung chuyển khoản</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-semibold tabular-nums text-ink">
                            {payment.referenceCode}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopy(payment.referenceCode)}
                            className="flex h-6 w-6 items-center justify-center rounded border border-line text-ink-2 transition-colors hover:text-ink"
                            aria-label="Sao chép nội dung chuyển khoản"
                          >
                            <CopyIcon />
                          </button>
                        </div>
                      </div>
                      {/* Số tiền */}
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] text-ink-2">Số tiền</span>
                        <span className="text-[18px] font-bold tabular-nums text-ink">
                          {formatVND(payment.amount)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Action row */}
                  <div className="flex flex-wrap gap-3">
                    {/* Nút giả lập thanh toán */}
                    {payment && !isExpired && (
                      <button
                        type="button"
                        onClick={handleSimulate}
                        disabled={isSimulating}
                        className="flex h-11 items-center rounded-[2px] bg-ink px-5 text-[11px] font-semibold uppercase tracking-[1.5px] text-paper transition-opacity hover:opacity-[0.85] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {isSimulating ? 'Đang xử lý...' : 'Tôi đã chuyển khoản (giả lập)'}
                      </button>
                    )}

                    {/* Nút tạo lại QR */}
                    {showRecreate && (
                      <button
                        type="button"
                        onClick={handleRecreate}
                        disabled={isRecreating}
                        className="flex h-11 items-center rounded-[2px] border border-line px-5 text-[11px] font-semibold uppercase tracking-[1.5px] text-ink transition-[border-color] hover:border-ink disabled:cursor-not-allowed disabled:opacity-50"
                        data-testid="btn-recreate-qr"
                      >
                        {isRecreating ? 'Đang tạo...' : 'Tạo lại QR'}
                      </button>
                    )}
                  </div>

                  {/* FIX 5: Nút hủy đơn hàng — danger color theo static btn-ghost ── */}
                  {canCancel && (
                    <button
                      type="button"
                      onClick={handleCancel}
                      disabled={isCancelling}
                      className="flex w-full h-11 items-center justify-center rounded-[2px] text-[11px] font-semibold uppercase tracking-[1.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                      style={{
                        background: 'none',
                        color: 'var(--danger)',
                        border: '1px solid var(--danger-bg)',
                      }}
                    >
                      {isCancelling ? 'Đang hủy...' : 'Hủy đơn hàng'}
                    </button>
                  )}

                  {/* Helper panel */}
                  <div
                    className="rounded-[2px] p-4 text-[12px] leading-[1.7]"
                    style={{ background: 'var(--info-bg)', color: 'var(--info)' }}
                  >
                    <strong>Lưu ý:</strong> Đây là thanh toán giả lập cho Phase 3. Bấm "Tôi đã chuyển khoản
                    (giả lập)" để xác nhận thanh toán và hoàn tất đơn hàng. SEPay thật sẽ được tích hợp ở Phase 5.
                  </div>

                </div>
              </div>

              {/* ── RIGHT: Summary card (sticky) ── */}
              <div className="sticky top-[100px] rounded-[2px] border border-line bg-surface">
                <div className="px-6 py-5 border-b border-line">
                  <div className="text-[11px] font-semibold uppercase tracking-[2px] text-ink">
                    Đơn hàng #{order.code}
                  </div>
                </div>

                <div className="p-6">
                  {/* FIX 3: Danh sách items — layout 3 cột (cover | khối title+loại | giá căn phải) ── */}
                  <div className="mb-4 flex flex-col gap-3">
                    {order.items.map((item) => (
                      <div key={item.bookId} className="flex items-start gap-3">
                        {/* Cover với cover-rule + cover-title nhỏ (như static summary-cover) */}
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
                          /* Placeholder cover với cover-rule + cover-title nhỏ */
                          <div className="flex h-14 w-10 flex-shrink-0 flex-col items-center justify-center gap-0.5 rounded-[2px] border border-line bg-cover-bg p-1">
                            <div className="h-px w-3.5 bg-ink-3" />
                            <div
                              className="text-center font-semibold leading-[1.2] text-ink"
                              style={{ fontSize: '6px' }}
                            >
                              {item.title.slice(0, 12)}
                            </div>
                          </div>
                        )}
                        {/* Title + loại */}
                        <div className="flex-1 min-w-0">
                          <div className="line-clamp-2 text-[13px] font-medium leading-[1.4] text-ink">
                            {item.title}
                          </div>
                          {/* Nhãn loại E-book màu accent */}
                          <div className="mt-0.5 text-[11px]" style={{ color: 'var(--accent)' }}>
                            E-book · PDF/EPUB
                          </div>
                        </div>
                        {/* Giá căn phải */}
                        <div className="flex-shrink-0 text-[13px] font-semibold tabular-nums text-ink">
                          {formatVND(item.unitPrice)}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* FIX 7: hr không mâu thuẫn — h-px bg-line */}
                  <div className="my-4 h-px bg-line" />

                  {/* Summary meta */}
                  <div className="flex flex-col gap-2 text-[12px] text-ink-2">
                    <div className="flex justify-between">
                      <span>Phương thức</span>
                      <span className="font-medium text-ink">SEPay QR</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Nhận hàng</span>
                      <span className="font-medium text-ink">E-book (tức thì)</span>
                    </div>
                  </div>

                  <div className="my-3 h-px bg-line" />

                  {/* Tổng cộng */}
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] font-semibold text-ink">Tổng cộng</span>
                    <span className="text-[18px] font-bold tabular-nums text-ink">{formatVND(order.total)}</span>
                  </div>
                </div>

                {/* Back link */}
                <Link
                  to="/checkout"
                  className="flex items-center gap-1.5 px-6 py-4 text-[12px] text-ink-2 transition-colors hover:text-ink border-t border-line"
                >
                  ← Quay lại thanh toán
                </Link>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};
