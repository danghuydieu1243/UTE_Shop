// Màn Danh sách yêu thích — Screen 16, route /user/wishlist
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AccountShell } from '../../profile/components/AccountShell';
import { useGetMeQuery } from '../../auth/authApi';
import { useGetWishlistQuery, useRemoveFromWishlistMutation } from '../wishlistApi';
import { useToast } from '../../../shared/hooks/useToast';
import { formatVND } from '../../../shared/format';
import type { WishlistItem } from '../types';
import { COVER_PLACEHOLDER } from '../../../shared/ui';

// ── Skeleton card khi đang tải ──
const WishlistSkeleton = () => (
  <div className="animate-pulse">
    <div className="aspect-[2/3] rounded-[2px] bg-line mb-3" />
    <div className="h-3 bg-line rounded mb-2 w-3/4" />
    <div className="h-3 bg-line rounded mb-3 w-1/2" />
    <div className="h-8 bg-line rounded" />
  </div>
);

// ── Icon tim rỗng cho empty state ──
const EmptyHeartIcon = () => (
  <svg
    className="mb-5 text-line"
    width="64"
    height="64"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </svg>
);

// ── Card sách trong wishlist ──
const WishlistCard = ({
  item,
  onRemove,
  isRemoving,
}: {
  item: WishlistItem;
  onRemove: (bookId: number) => void;
  isRemoving: boolean;
}) => {
  const navigate = useNavigate();
  const { book } = item;

  // Render sao đánh giá
  const fullStars = Math.round(book.ratingAvg);
  const stars = '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);

  return (
    <div className="flex flex-col">
      {/* Cover tile */}
      <div
        className="relative aspect-[2/3] rounded-[2px] overflow-hidden bg-cover-bg border border-line mb-3 cursor-pointer group"
        onClick={() => navigate(`/books/${book.slug}`)}
        role="link"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            navigate(`/books/${book.slug}`);
          }
        }}
        aria-label={book.title}
      >
        <img
          src={book.coverImageUrl || COVER_PLACEHOLDER}
          alt={book.title}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.src.endsWith(COVER_PLACEHOLDER)) return;
            img.src = COVER_PLACEHOLDER;
          }}
        />

        {/* Nút X xóa — góc trên phải */}
        <button
          type="button"
          aria-label="Xóa khỏi wishlist"
          disabled={isRemoving}
          onClick={(e) => {
            e.stopPropagation();
            onRemove(book.id);
          }}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-surface border border-line text-ink-2 transition-[border-color,color] duration-200 hover:border-ink hover:text-ink disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg
            width="12"
            height="12"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Tên sách */}
      <p
        className="text-[13px] font-semibold text-ink line-clamp-2 mb-0.5 leading-snug cursor-pointer hover:underline"
        onClick={() => navigate(`/books/${book.slug}`)}
      >
        {book.title}
      </p>

      {/* Rating */}
      <div className="mb-2 flex items-center gap-1.5 text-[11px] text-ink-2">
        <span className="text-star" aria-hidden="true">
          {stars}
        </span>
        <span className="tabular-nums">{book.ratingAvg.toFixed(1)}</span>
      </div>

      {/* Giá */}
      <p className="text-[14px] font-semibold tabular-nums text-ink mb-3">
        {formatVND(book.price)}
      </p>

      {/* Nút Thêm vào giỏ */}
      <button
        type="button"
        className="mt-auto w-full border border-ink py-2 text-[11px] font-semibold uppercase tracking-[1px] text-ink transition-colors duration-150 hover:bg-ink hover:text-paper"
        onClick={(e) => {
          e.stopPropagation();
          // TODO Phase 4: wiring cart từ wishlist
        }}
      >
        Thêm vào giỏ
      </button>
    </div>
  );
};

/* ─────────────────────────────────────────────────────── */
/*  WishlistPage                                           */
/*  Route: /user/wishlist (role 'user')                    */
/* ─────────────────────────────────────────────────────── */
export default function WishlistPage() {
  const { data: me } = useGetMeQuery();
  const { show, ToastLayer } = useToast();

  // Phân trang server-side
  const [page, setPage] = useState(1);
  const LIMIT = 12;

  const { data, isLoading } = useGetWishlistQuery({ page, limit: LIMIT });
  const [removeFromWishlist] = useRemoveFromWishlistMutation();

  // Theo dõi bookId đang bị xóa
  const [removingIds, setRemovingIds] = useState<Set<number>>(new Set());

  const items = data?.items ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: LIMIT, total: 0, totalPages: 0 };

  const handleRemove = async (bookId: number) => {
    setRemovingIds((prev) => new Set(prev).add(bookId));
    const item = items.find((it) => it.book.id === bookId);
    const title = item?.book.title ?? 'Sách';
    try {
      await removeFromWishlist(bookId).unwrap();
      show(`Đã xóa "${title}" khỏi Wishlist`);
    } catch {
      show('Không thể xóa. Vui lòng thử lại.');
    } finally {
      setRemovingIds((prev) => {
        const next = new Set(prev);
        next.delete(bookId);
        return next;
      });
    }
  };

  const userData = me ? { fullName: me.fullName, email: me.email } : null;

  return (
    <AccountShell
      breadcrumbLabel="Danh sách yêu thích"
      activeNav="/user/wishlist"
      userData={userData}
    >
      <ToastLayer />

      {/* ── Content header ── */}
      <div className="px-7 pt-6 pb-5 border-b border-line">
        <div className="flex items-center justify-between">
          <h1 className="text-[18px] font-semibold tracking-[-0.3px] text-ink">
            Danh sách yêu thích{' '}
            {!isLoading && (
              <span className="text-ink-3 font-normal text-[15px]">
                ({pagination.total} cuốn)
              </span>
            )}
          </h1>
        </div>
      </div>

      {/* ── Content body ── */}
      <div className="p-7">
        {isLoading ? (
          // Skeleton grid khi đang tải
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6">
            {Array.from({ length: LIMIT }).map((_, i) => (
              <WishlistSkeleton key={i} />
            ))}
          </div>
        ) : items.length === 0 ? (
          // Empty state
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <EmptyHeartIcon />
            <p className="text-[20px] font-semibold tracking-[-0.3px] text-ink mb-2">
              Chưa có sách yêu thích nào
            </p>
            <p className="text-[14px] leading-[1.7] text-ink-2 mb-7 max-w-[320px]">
              Nhấn vào icon ♡ trên bất kỳ sách nào để lưu vào đây
            </p>
            <Link
              to="/books"
              className="inline-flex h-10 items-center rounded-[2px] bg-ink px-6 text-[12px] font-semibold uppercase tracking-[1.5px] text-paper transition-opacity duration-200 hover:opacity-[0.85]"
            >
              Khám phá sách →
            </Link>
          </div>
        ) : (
          <>
            {/* Grid sách */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6">
              {items.map((item) => (
                <WishlistCard
                  key={item.wishlistId}
                  item={item}
                  onRemove={handleRemove}
                  isRemoving={removingIds.has(item.book.id)}
                />
              ))}
            </div>

            {/* Phân trang — chỉ hiển thị khi có nhiều hơn 1 trang */}
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
    </AccountShell>
  );
}
