import { Link, useNavigate } from 'react-router-dom';
import { SiteHeader, SiteFooter } from '../../../shared/ui';
import { COVER_PLACEHOLDER } from '../../../shared/ui/BookCard';
import { formatVND } from '../../../shared/format';
import {
  useGetCartQuery,
  useRemoveFromCartMutation,
  useClearCartMutation,
} from '../cartApi';
import { useToast } from '../../../shared/hooks/useToast';

/* ── E-book icon SVG ── */
const EbookIcon = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 11 11"
    stroke="currentColor"
    strokeWidth="1.4"
    fill="none"
    aria-hidden="true"
  >
    <rect x="1.5" y="1" width="8" height="9" rx="1" />
    <line x1="3.5" y1="4" x2="7.5" y2="4" />
    <line x1="3.5" y1="6" x2="7.5" y2="6" />
  </svg>
);

/* ── Trash icon SVG ── */
const TrashIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    stroke="currentColor"
    strokeWidth="1.5"
    fill="none"
    aria-hidden="true"
  >
    <polyline points="1,3 11,3" />
    <path d="M4,3V2a1,1,0,0,1,1-1h2a1,1,0,0,1,1,1v1" />
    <rect x="2.5" y="3" width="7" height="8" rx=".5" />
  </svg>
);

/* ── Lock icon SVG ── */
const LockIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 12 12"
    stroke="currentColor"
    strokeWidth="1.4"
    fill="none"
    aria-hidden="true"
  >
    <rect x="2" y="5" width="8" height="6" rx="1" />
    <path d="M4,5V3.5a2,2,0,0,1,4,0V5" />
  </svg>
);

/* ─────────────────────────────────────────── */
/*  CartPage                                   */
/* ─────────────────────────────────────────── */
export const CartPage = () => {
  const navigate = useNavigate();
  const { show, ToastLayer } = useToast();

  const { data: cart, isLoading } = useGetCartQuery();
  const [removeFromCart] = useRemoveFromCartMutation();
  const [clearCart] = useClearCartMutation();

  /* ── Xóa một item ── */
  const handleRemove = async (bookId: number) => {
    try {
      await removeFromCart({ bookId }).unwrap();
    } catch {
      show('Không thể xóa sách khỏi giỏ hàng');
    }
  };

  /* ── Xóa toàn bộ giỏ ── */
  const handleClearCart = async () => {
    try {
      await clearCart().unwrap();
    } catch {
      show('Không thể xóa giỏ hàng');
    }
  };

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-paper">
        <SiteHeader />
        <div className="mx-auto max-w-container px-10 py-16">
          <div className="animate-pulse">
            <div className="mb-8 h-8 w-48 rounded bg-line" />
            <div className="grid grid-cols-[1fr_360px] gap-8">
              <div className="h-80 rounded bg-line" />
              <div className="h-60 rounded bg-line" />
            </div>
          </div>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const items = cart?.items ?? [];
  const subtotal = cart?.subtotal ?? 0;
  const itemCount = cart?.itemCount ?? 0;
  const isEmpty = items.length === 0;

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
            <span className="font-medium text-ink">Giỏ hàng</span>
          </nav>
        </div>
      </div>

      {/* ── Page body ── */}
      <div className="mx-auto max-w-container px-10 py-10 pb-20">
        <h1 className="mb-8 text-[28px] font-semibold leading-tight tracking-[-0.5px] text-ink">
          Giỏ hàng
        </h1>

        {/* Empty state */}
        {isEmpty ? (
          <div className="flex flex-col items-center py-24 text-center">
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
              <path d="M2 2h1.5l1.8 8h7l1.5-6H5" />
              <circle cx="6.5" cy="12.5" r="1.2" />
              <circle cx="11.5" cy="12.5" r="1.2" />
            </svg>
            <p className="mb-3 text-[22px] font-semibold leading-tight tracking-[-0.4px] text-ink">
              Giỏ hàng trống
            </p>
            <p className="mb-8 max-w-[340px] text-[14px] leading-[1.7] text-ink-2">
              Bạn chưa có sách nào trong giỏ hàng. Hãy khám phá kho sách của Athena.
            </p>
            <Link
              to="/books"
              className="inline-flex h-11 items-center rounded-[2px] border border-ink px-6 text-[12px] font-semibold uppercase tracking-[1.5px] text-ink transition-[background,color] duration-200 hover:bg-ink hover:text-paper"
            >
              Tiếp tục mua sắm
            </Link>
          </div>
        ) : (
          /* ── Layout 2 cột ── */
          <div className="grid grid-cols-[1fr_360px] items-start gap-8">

            {/* ── LEFT: Cart items panel ── */}
            <div className="rounded border border-line bg-surface">

              {/* Toolbar */}
              <div className="flex items-center gap-4 border-b border-line px-6 py-4">
                <span className="text-[13px] font-medium text-ink">
                  Chọn tất cả
                </span>
                <span className="text-[13px] text-ink-3">
                  ({itemCount} sản phẩm)
                </span>
                <button
                  type="button"
                  onClick={handleClearCart}
                  className="ml-auto bg-transparent border-none p-0 text-[11px] font-medium uppercase tracking-[0.5px] text-danger-fg cursor-pointer hover:opacity-80"
                >
                  Xóa tất cả
                </button>
              </div>

              {/* Danh sách item */}
              {items.map((item) => {
                const { book } = item;
                return (
                  <div
                    key={item.id}
                    data-testid="cart-item"
                    className="flex items-start gap-4 border-b border-line px-6 py-5 last:border-b-0"
                  >
                    {/* Ảnh bìa */}
                    <div className="flex h-[100px] w-[72px] flex-shrink-0 items-center justify-center overflow-hidden rounded-[2px] border border-line bg-cover-bg p-2">
                      <img
                        src={book.coverImageUrl || COVER_PLACEHOLDER}
                        alt={book.title}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (img.src.endsWith(COVER_PLACEHOLDER)) return;
                          img.src = COVER_PLACEHOLDER;
                        }}
                      />
                    </div>

                    {/* Thông tin sách */}
                    <div className="flex-1 min-w-0">
                      <div className="mb-1 line-clamp-2 text-[14px] font-medium leading-[1.4] text-ink">
                        {book.title}
                      </div>
                      {book.author && (
                        <div className="mb-2 text-[12px] text-ink-3">
                          {book.author}
                        </div>
                      )}
                      {/* Badge định dạng */}
                      <div className="mb-3 inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[1.5px] text-accent">
                        <EbookIcon />
                        {book.fileFormat}
                      </div>
                      <div className="text-[12px] text-ink-3">
                        Số lượng: 1 (giấy phép cá nhân)
                      </div>
                    </div>

                    {/* Cột giá + nút xóa */}
                    <div className="flex flex-shrink-0 flex-col items-end gap-2 min-w-[100px]">
                      <div className="text-[15px] font-semibold tabular-nums text-ink">
                        {formatVND(item.unitPrice)}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemove(book.id)}
                        className="mt-auto flex items-center gap-1.5 bg-transparent border-none p-0 text-[11px] font-medium tracking-[0.3px] text-ink-3 cursor-pointer hover:text-danger-fg transition-colors duration-150"
                        aria-label={`Xóa ${book.title} khỏi giỏ hàng`}
                      >
                        <TrashIcon />
                        Xóa
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── RIGHT: Summary card (sticky) ── */}
            <div className="sticky top-[88px] rounded-[2px] border border-line bg-surface p-6">
              <div className="mb-5 text-[13px] font-medium uppercase tracking-[2px] text-ink">
                Tóm tắt đơn hàng
              </div>

              {/* Tạm tính */}
              <div className="flex items-baseline justify-between text-[13px]">
                <span className="text-ink-2">Tạm tính ({itemCount} sản phẩm)</span>
                <span className="font-medium tabular-nums text-ink">{formatVND(subtotal)}</span>
              </div>

              {/* Divider */}
              <hr className="my-4 border-none border-t border-line" />

              {/* Tổng cộng */}
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-semibold text-ink">Tổng cộng</span>
                <span className="text-[20px] font-bold tabular-nums text-ink">{formatVND(subtotal)}</span>
              </div>

              {/* Nút thanh toán */}
              <button
                type="button"
                onClick={() => navigate('/checkout')}
                className="mt-5 flex h-12 w-full items-center justify-center rounded-[2px] bg-ink text-[11px] font-semibold uppercase tracking-[1.5px] text-paper transition-opacity duration-200 hover:opacity-[0.85]"
              >
                Tiến hành thanh toán →
              </button>

              {/* Nút tiếp tục mua sắm */}
              <Link
                to="/books"
                className="mt-2.5 flex h-10 w-full items-center justify-center rounded-[2px] border border-line bg-surface text-[11px] font-medium uppercase tracking-[1px] text-ink transition-[border-color] duration-200 hover:border-ink"
              >
                Tiếp tục mua sắm
              </Link>

              {/* Trust badge */}
              <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-ink-3">
                <LockIcon />
                Thanh toán bảo mật SSL 256-bit
              </div>
            </div>

          </div>
        )}
      </div>

      <SiteFooter />
    </div>
  );
};
