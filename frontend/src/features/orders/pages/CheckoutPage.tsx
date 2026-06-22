import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useGetCartQuery } from '../../cart/cartApi';
import { useCreateOrderMutation } from '../ordersApi';
import { useValidateCouponMutation } from '../../coupons/couponsApi';
import { useGetLoyaltyQuery } from '../../loyalty/loyaltyApi';
import { useToast } from '../../../shared/hooks/useToast';
import { useAppSelector } from '../../../app/hooks';
import { formatVND } from '../../../shared/format';
import { COVER_PLACEHOLDER } from '../../../shared/ui/BookCard';

/* ── Lock icon SVG ── */
const LockIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" stroke="currentColor" strokeWidth="1.4" fill="none" aria-hidden="true">
    <rect x="2" y="5" width="8" height="6" rx="1" />
    <path d="M4,5V3.5a2,2,0,0,1,4,0V5" />
  </svg>
);

/* ── Check icon SVG ── */
const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <polyline points="2,7 5,10 12,3" />
  </svg>
);

/* ── SEPay QR icon SVG ── */
const QrIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <rect x="2" y="2" width="5" height="5" rx="0.5" />
    <rect x="11" y="2" width="5" height="5" rx="0.5" />
    <rect x="2" y="11" width="5" height="5" rx="0.5" />
    <rect x="11" y="11" width="3" height="3" rx="0.5" />
    <rect x="14" y="14" width="2" height="2" rx="0.5" />
  </svg>
);

/* ── X (remove) icon SVG ── */
const XIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
    <line x1="1" y1="1" x2="9" y2="9" />
    <line x1="9" y1="1" x2="1" y2="9" />
  </svg>
);

/* ─────────────────────────────────────────── */
/*  CheckoutPage                               */
/*  Route: /checkout                           */
/* ─────────────────────────────────────────── */
export const CheckoutPage = () => {
  const navigate = useNavigate();
  const { show, ToastLayer } = useToast();
  const user = useAppSelector((s) => s.auth.user);

  const { data: cart, isLoading } = useGetCartQuery();
  const [createOrder, { isLoading: isCreating }] = useCreateOrderMutation();
  const [validateCoupon, { isLoading: isValidating }] = useValidateCouponMutation();
  const { data: loyalty } = useGetLoyaltyQuery();

  /* ── Coupon state ── */
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponError, setCouponError] = useState('');

  /* ── Points state ── */
  const [usePoints, setUsePoints] = useState(false);

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const isEmpty = items.length === 0;

  /* ── Pricing (D9 formula) ── */
  const couponDiscount = appliedCoupon?.discount ?? 0;
  const afterCoupon = subtotal - couponDiscount;

  // Compute pointsToUse when toggle is on
  const loyaltyBalance = loyalty?.balance ?? 0;
  const pointsToUse = usePoints
    ? Math.min(loyaltyBalance, Math.ceil(afterCoupon / 100))
    : 0;
  const loyaltyDiscount = usePoints ? Math.min(pointsToUse * 100, afterCoupon) : 0;

  const total = Math.max(0, subtotal - couponDiscount - loyaltyDiscount);

  /* ── Apply coupon ── */
  const handleApplyCoupon = async () => {
    if (!couponInput.trim()) return;
    setCouponError('');
    try {
      const bookIds = items.map((i) => i.book.id);
      const result = await validateCoupon({ code: couponInput.trim(), bookIds }).unwrap();
      setAppliedCoupon({ code: couponInput.trim(), discount: result.discount });
      setCouponInput('');
    } catch (err) {
      const e = err as { message?: string };
      setCouponError(e?.message || 'Mã giảm giá không hợp lệ');
      setAppliedCoupon(null);
    }
  };

  /* ── Remove coupon ── */
  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponError('');
    setCouponInput('');
  };

  /* ── Handler tạo đơn hàng ── */
  const handleCreateOrder = async () => {
    try {
      const order = await createOrder({
        couponCode: appliedCoupon?.code,
        pointsToUse: usePoints ? pointsToUse : 0,
      }).unwrap();
      navigate('/checkout/' + order.code);
    } catch (err) {
      const e = err as { message?: string };
      show(e?.message || 'Không thể đặt đơn hàng');
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <ToastLayer />

      {/* ── Navbar rút gọn ── */}
      <header className="fixed top-0 left-0 right-0 z-40 border-b border-line bg-paper">
        <div className="mx-auto flex max-w-container items-center justify-between px-10 h-[64px]">
          <Link to="/" className="text-[18px] font-semibold uppercase tracking-[1px] text-ink">
            Athena
          </Link>
          <div className="flex items-center gap-1.5 text-[12px] text-ink-3">
            <LockIcon />
            Thanh toán an toàn
          </div>
        </div>
      </header>

      <div className="pt-[64px]">
        {/* ── Stepper — canh giữa, max-w ~480px, nhãn UPPERCASE ── */}
        <div className="border-b border-line py-5">
          <div className="mx-auto flex max-w-[480px] items-center">
            {/* Step 1 — active */}
            <div className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-[12px] font-semibold text-paper">
                1
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-[0.5px] text-ink">
                Xác nhận
              </span>
            </div>
            {/* Line 1-2 */}
            <div className="h-px flex-1 bg-line" style={{ marginTop: '-20px' }} />
            {/* Step 2 — inactive */}
            <div className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold border border-line bg-surface text-ink-3">
                2
              </div>
              <span className="text-[11px] font-medium uppercase tracking-[0.5px] text-ink-3">
                Thanh toán
              </span>
            </div>
            {/* Line 2-3 */}
            <div className="h-px flex-1 bg-line" style={{ marginTop: '-20px' }} />
            {/* Step 3 — inactive */}
            <div className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-semibold border border-line bg-surface text-ink-3">
                3
              </div>
              <span className="text-[11px] font-medium uppercase tracking-[0.5px] text-ink-3">
                Hoàn tất
              </span>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="mx-auto max-w-container px-10 py-10 pb-20">

          {/* Giỏ hàng trống */}
          {isLoading ? (
            <div className="animate-pulse">
              <div className="grid grid-cols-[1fr_380px] gap-8">
                <div className="h-80 rounded bg-line" />
                <div className="h-60 rounded bg-line" />
              </div>
            </div>
          ) : isEmpty ? (
            <div className="flex flex-col items-center py-24 text-center">
              <p className="mb-3 text-[22px] font-semibold text-ink">Giỏ hàng trống</p>
              <p className="mb-8 text-[14px] text-ink-2">Bạn chưa có sách nào trong giỏ hàng.</p>
              <Link
                to="/cart"
                className="inline-flex h-11 items-center rounded-[2px] border border-ink px-6 text-[12px] font-semibold uppercase tracking-[1.5px] text-ink transition-[background,color] duration-200 hover:bg-ink hover:text-paper"
              >
                ← Quay lại giỏ hàng
              </Link>
            </div>
          ) : (
            /* ── Layout 2 cột ── */
            <div className="grid grid-cols-[1fr_380px] items-start gap-8">

              {/* ── LEFT: Form sections ── */}
              <div className="flex flex-col gap-5">

                {/* Section: Nhận E-book */}
                <div className="rounded-[2px] border border-line p-5 bg-info-bg">
                  <div className="mb-1 text-[13px] font-semibold text-ink">Nhận E-book</div>
                  <div className="text-[13px] leading-[1.7] text-info-fg">
                    Sau khi thanh toán, E-book sẽ được giao vào tài khoản của bạn và có thể tải xuống
                    từ thư viện.{user?.email ? ` Địa chỉ email: ${user.email}` : ''}
                  </div>
                </div>

                {/* Section: Mã giảm giá & điểm thưởng */}
                <div className="rounded-[2px] border border-line p-5 bg-surface">
                  <div className="mb-4 text-[13px] font-semibold text-ink">
                    Mã giảm giá &amp; điểm thưởng
                  </div>

                  {/* Coupon input */}
                  <div className="mb-3">
                    <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.5px] text-ink-2">
                      Mã giảm giá
                    </label>
                    {appliedCoupon ? (
                      /* Applied chip */
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 rounded-[2px] bg-success-bg px-2.5 py-1 text-[12px] font-semibold text-success-fg">
                          {appliedCoupon.code}
                          <button
                            type="button"
                            onClick={handleRemoveCoupon}
                            aria-label="Gỡ mã giảm giá"
                            className="text-success-fg hover:opacity-70 transition-opacity"
                          >
                            <XIcon />
                          </button>
                        </span>
                        <span className="text-[12px] text-success-fg">
                          −{formatVND(appliedCoupon.discount)} đã được áp dụng
                        </span>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={couponInput}
                          onChange={(e) => {
                            setCouponInput(e.target.value);
                            setCouponError('');
                          }}
                          placeholder="Nhập mã giảm giá"
                          className="h-10 flex-1 rounded-[2px] border border-line bg-surface px-3 text-[13px] text-ink placeholder:text-ink-3 outline-none focus:border-ink"
                          onKeyDown={(e) => { if (e.key === 'Enter') handleApplyCoupon(); }}
                        />
                        <button
                          type="button"
                          onClick={handleApplyCoupon}
                          disabled={isValidating || !couponInput.trim()}
                          className="h-10 rounded-[2px] border border-line px-4 text-[12px] font-medium text-ink transition-[background,color] duration-150 hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isValidating ? '...' : 'Áp dụng'}
                        </button>
                      </div>
                    )}
                    {/* Inline error */}
                    {couponError && (
                      <p className="mt-1.5 text-[12px] text-danger-fg">{couponError}</p>
                    )}
                  </div>

                  {/* Points toggle */}
                  {loyaltyBalance > 0 && (
                    <label className="flex cursor-pointer items-center gap-2.5 mt-3">
                      <input
                        type="checkbox"
                        role="checkbox"
                        aria-label="Dùng điểm thưởng cho đơn này"
                        checked={usePoints}
                        onChange={(e) => setUsePoints(e.target.checked)}
                        className="sr-only"
                      />
                      {/* Custom checkbox */}
                      <span
                        className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-[2px] border transition-colors ${
                          usePoints
                            ? 'bg-ink border-ink text-paper'
                            : 'bg-surface border-ink-3'
                        }`}
                        aria-hidden="true"
                      >
                        {usePoints && (
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="1.5,5 4,7.5 8.5,2.5" />
                          </svg>
                        )}
                      </span>
                      <span className="text-[13px] text-ink-2">
                        Dùng <span className="font-semibold text-ink">{loyaltyBalance} điểm</span> thưởng
                        {' '}(≈ {formatVND(loyaltyBalance * 100)}) cho đơn này
                      </span>
                    </label>
                  )}

                  {/* Points used preview (when ON) */}
                  {usePoints && pointsToUse > 0 && (
                    <p className="mt-1.5 text-[12px] text-success-fg">
                      Sẽ dùng {pointsToUse} điểm (−{formatVND(loyaltyDiscount)})
                    </p>
                  )}
                </div>

                {/* Section: Phương thức thanh toán */}
                <div className="rounded-[2px] border border-line p-5 bg-surface">
                  <div className="mb-3 text-[13px] font-semibold text-ink">Phương thức thanh toán</div>
                  {/* SEPay QR — selected state */}
                  <div className="flex items-center gap-3 rounded-[2px] border-2 border-ink bg-surface p-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-[2px] border border-line text-ink">
                      <QrIcon />
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-semibold text-ink">SEPay QR</div>
                      <div className="text-[12px] text-ink-2">Quét mã QR để thanh toán nhanh</div>
                    </div>
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-paper">
                      <CheckIcon />
                    </div>
                  </div>
                </div>

                {/* Submit + terms note */}
                <div className="rounded-[2px] border border-line p-6 bg-surface">
                  <button
                    type="button"
                    onClick={handleCreateOrder}
                    disabled={isCreating}
                    className="flex h-[52px] w-full items-center justify-center rounded-[2px] bg-ink text-[11px] font-semibold uppercase tracking-[2px] text-paper transition-opacity duration-200 hover:opacity-[0.85] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isCreating ? 'Đang xử lý...' : 'Đặt đơn & thanh toán'}
                  </button>
                  <p className="mt-3 text-center text-[11px] leading-[1.5] text-ink-3">
                    Bằng cách đặt đơn, bạn đồng ý với{' '}
                    <Link to="/terms" className="text-ink underline">Điều khoản sử dụng</Link>{' '}
                    của Athena.
                  </p>
                </div>
              </div>

              {/* ── RIGHT: Summary card (sticky) ── */}
              <div className="sticky top-[100px] rounded-[2px] border border-line bg-surface">
                <div className="px-6 py-5 border-b border-line">
                  <div className="text-[11px] font-semibold uppercase tracking-[2px] text-ink">
                    Đơn hàng của bạn
                  </div>
                </div>

                <div className="p-6">
                  {/* Danh sách items */}
                  <div className="mb-4 flex flex-col gap-3">
                    {items.map((item) => {
                      const { book } = item;
                      return (
                        <div key={item.id} className="flex items-start gap-3">
                          {/* Cover */}
                          {book.coverImageUrl ? (
                            <img
                              src={book.coverImageUrl}
                              alt={book.title}
                              className="h-14 w-10 flex-shrink-0 rounded-[2px] border border-line bg-cover-bg object-cover"
                              onError={(e) => {
                                const img = e.currentTarget;
                                if (img.src.endsWith(COVER_PLACEHOLDER)) return;
                                img.src = COVER_PLACEHOLDER;
                              }}
                            />
                          ) : (
                            <div className="flex h-14 w-10 flex-shrink-0 flex-col items-center justify-center gap-0.5 rounded-[2px] border border-line bg-cover-bg p-1" aria-hidden="true" role="presentation">
                              <div className="h-px w-3.5 bg-ink-3" />
                              <div
                                className="text-center font-semibold leading-[1.2] text-ink line-clamp-3"
                                style={{ fontSize: '6px', wordBreak: 'break-all' }}
                              >
                                {book.title.slice(0, 6)}…
                              </div>
                            </div>
                          )}
                          {/* Title + loại */}
                          <div className="flex-1 min-w-0">
                            <div className="line-clamp-2 text-[13px] font-medium leading-[1.4] text-ink">
                              {book.title}
                            </div>
                            <div className="mt-0.5 text-[11px] text-accent">
                              E-book · PDF/EPUB
                            </div>
                          </div>
                          {/* Giá */}
                          <div className="flex-shrink-0 text-[13px] font-semibold tabular-nums text-ink">
                            {formatVND(item.unitPrice)}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="my-4 h-px bg-line" />

                  {/* Tạm tính */}
                  <div className="flex items-baseline justify-between text-[13px]">
                    <span className="text-ink-2">Tạm tính</span>
                    <span className="font-medium tabular-nums text-ink">{formatVND(subtotal)}</span>
                  </div>

                  {/* Giảm giá coupon */}
                  {couponDiscount > 0 && (
                    <div className="mt-2 flex items-baseline justify-between text-[13px]">
                      <span className="text-ink-2">Mã giảm giá</span>
                      <span className="font-medium tabular-nums text-success-fg">−{formatVND(couponDiscount)}</span>
                    </div>
                  )}

                  {/* Giảm giá điểm thưởng */}
                  {loyaltyDiscount > 0 && (
                    <div className="mt-2 flex items-baseline justify-between text-[13px]">
                      <span className="text-ink-2">Điểm thưởng</span>
                      <span className="font-medium tabular-nums text-success-fg">−{formatVND(loyaltyDiscount)}</span>
                    </div>
                  )}

                  <div className="my-3 h-px bg-line" />

                  {/* Tổng cộng */}
                  <div className="flex items-baseline justify-between">
                    <span className="text-[13px] font-semibold text-ink">Tổng cộng</span>
                    <span className="text-[18px] font-bold tabular-nums text-ink">{formatVND(total)}</span>
                  </div>
                </div>

                {/* Link quay lại giỏ hàng */}
                <Link
                  to="/cart"
                  className="flex items-center gap-1.5 px-6 py-4 text-[12px] text-ink-2 transition-colors hover:text-ink border-t border-line"
                >
                  ← Quay lại giỏ hàng
                </Link>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};
