import { useNavigate } from 'react-router-dom';
import type { BookCard as BookCardDTO } from '../../features/catalog/types';
import { formatVND, formatFileSize, formatCount } from '../format';
import { useAppSelector } from '../../app/hooks';
import { useAddToWishlistMutation, useRemoveFromWishlistMutation } from '../../features/wishlist/wishlistApi';
import { useToast } from '../hooks/useToast';

/** Ảnh bìa dùng chung (data giả): lưu ở frontend/public, phục vụ tại /book-cover-placeholder.svg */
export const COVER_PLACEHOLDER = '/book-cover-placeholder.svg';

/* ── Highlight helper ── */
function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const Highlight = ({ text, query }: { text: string; query?: string }) => {
  if (!query?.trim()) return <>{text}</>;
  // Split with ONE capturing group → matched text lands at ODD indices.
  // No .test() needed — avoids stateful lastIndex bug with /g flag.
  const parts = text.split(new RegExp(`(${escapeRegex(query)})`, 'i'));
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={`${i}-${part}`} className="rounded-[1px] bg-[#FFF3CD] px-[1px] text-ink">
            {part}
          </mark>
        ) : (
          <span key={`${i}-${part}`}>{part}</span>
        ),
      )}
    </>
  );
};

interface BookCardProps {
  book: BookCardDTO;
  /** Extra classes to control grid column sizing from parent */
  className?: string;
  /** Show rank badge (e.g. "No. 1") */
  rank?: number;
  /** Called when "Thêm vào giỏ" is clicked. Wired in Phase 3 (cart feature). */
  onAddToCart?: (book: BookCardDTO) => void;
  /** Highlight this query string in title + author */
  highlightQuery?: string;
  /** Nếu true, heart đang ở trạng thái "đã thêm" (tim đặc) */
  isWishlisted?: boolean;
  /** Nếu true, user đã sở hữu sách → thay nút "Thêm vào giỏ" bằng "Đọc ngay" (→ thư viện) */
  owned?: boolean;
}

/**
 * BookCard — bám Design System §5 + home_static.html + book_catalog_static.html.
 * Root = <article> (not <a>) so the "Thêm vào giỏ" <button> is a valid sibling,
 * avoiding button-inside-anchor (invalid HTML5).
 * Hover: .book-cover đổi nền sang #EFEDE6; .cover-rule giãn rộng (home_preview.html).
 *
 * Heart toggle (Phase 4):
 * - role 'user': hiển thị tim, click → addToWishlist hoặc removeFromWishlist
 * - guest (null): click → navigate /login
 * - vendor/admin: ẩn heart (không hiện)
 */
export const BookCard = ({ book, className = '', rank, onAddToCart, highlightQuery, isWishlisted = false, owned = false }: BookCardProps) => {
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const [addToWishlist] = useAddToWishlistMutation();
  const [removeFromWishlist] = useRemoveFromWishlistMutation();
  const { show, ToastLayer } = useToast();

  const {
    slug,
    title,
    author,
    coverImageUrl,
    price,
    originalPrice,
    discountPercent,
    fileFormat,
    fileSizeBytes,
    ratingAvg,
    ratingCount,
    tag,
  } = book;

  const hasDiscount = originalPrice != null && originalPrice > price;

  const handleNavigate = () => navigate(`/books/${slug}`);
  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleNavigate();
    }
  };

  // Render star rating (filled ★ based on ratingAvg out of 5)
  const renderStars = () => {
    const fullStars = Math.round(ratingAvg);
    return '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
  };

  // Heart toggle handler — chỉ dành cho role 'user'
  // guest → redirect /login; vendor/admin → không hiển thị button
  const handleHeartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate(`/login?returnUrl=/books/${slug}`);
      return;
    }
    if (user.role !== 'user') return;
    if (isWishlisted) {
      removeFromWishlist(book.id)
        .unwrap()
        .then(() => show('Đã bỏ khỏi danh sách yêu thích'))
        .catch(() => show('Không thể bỏ yêu thích. Vui lòng thử lại.'));
    } else {
      addToWishlist({ bookId: book.id })
        .unwrap()
        .then(() => show('Đã thêm vào danh sách yêu thích'))
        .catch(() => show('Không thể thêm vào Wishlist. Vui lòng thử lại.'));
    }
  };

  // Chỉ hiển thị heart cho user đã đăng nhập với role 'user', hoặc cho guest (→ redirect login)
  // vendor/admin: ẩn hoàn toàn
  const showHeart = !user || user.role === 'user';

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={handleNavigate}
      onKeyDown={handleKeyDown}
      aria-label={title}
      className={`group flex flex-col cursor-pointer ${className}`}
    >
      <ToastLayer />
      {/* Cover image */}
      <div className="relative mb-3.5 flex aspect-[2/3] flex-col items-center justify-center overflow-hidden border border-line bg-cover-bg p-[26px_22px] transition-colors duration-200 group-hover:bg-[#EFEDE6]">
        {/* Tag badge — top-left */}
        {tag && (
          <span className="absolute left-3 top-3 text-[9px] font-semibold uppercase tracking-[1.5px] text-accent">
            {tag}
          </span>
        )}

        {/* Rank badge — top-left when heart is present, top-right otherwise */}
        {rank != null && (
          <span
            className={`absolute top-3 font-[500] tabular-nums text-ink-3 ${showHeart ? 'left-3.5' : 'right-3.5'}`}
          >
            <span className="text-[9px] mr-0.5">No.</span>
            <span className="text-[13px]">{rank}</span>
          </span>
        )}

        {/* Heart toggle — top-right (chỉ user + guest; ẩn với vendor/admin) */}
        {showHeart && (
          <button
            type="button"
            aria-label={isWishlisted ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
            onClick={handleHeartClick}
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-surface border border-line text-ink-2 transition-[border-color,color] duration-200 hover:border-ink hover:text-ink"
          >
            <svg
              width="13"
              height="13"
              stroke="currentColor"
              strokeWidth="1.6"
              viewBox="0 0 24 24"
              fill={isWishlisted ? 'currentColor' : 'none'}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </button>
        )}

        {/* Ảnh bìa: dùng URL thật nếu có, hỏng/thiếu → placeholder dùng chung */}
        <img
          src={coverImageUrl || COVER_PLACEHOLDER}
          alt={title}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.src.endsWith(COVER_PLACEHOLDER)) return; // tránh lặp vô hạn
            img.src = COVER_PLACEHOLDER;
          }}
        />
      </div>

      {/* Title — 2 line clamp */}
      <div className="mb-1 line-clamp-2 min-h-[36px] text-[13px] font-medium leading-[1.4] text-ink">
        <Highlight text={title} query={highlightQuery} />
      </div>

      {/* Author */}
      <div className="mb-2 text-[12px] text-ink-3">
        {author ? <Highlight text={author} query={highlightQuery} /> : ' '}
      </div>

      {/* Rating — tabular-nums per Design System §3 */}
      <div className="mb-2 flex items-center gap-1.5 text-[11px] text-ink-2">
        <span className="text-star" aria-hidden="true">
          {renderStars()}
        </span>
        <span className="tabular-nums">{ratingAvg.toFixed(1)}</span>
        <span className="tabular-nums text-ink-3">({formatCount(ratingCount)})</span>
      </div>

      {/* Price row */}
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-[14px] font-semibold tabular-nums text-ink">{formatVND(price)}</span>
        {hasDiscount && (
          <span className="text-[11px] tabular-nums text-ink-3 line-through">
            {formatVND(originalPrice!)}
          </span>
        )}
        {/* I2: badge gated on hasDiscount to prevent badge without strikethrough price */}
        {hasDiscount && discountPercent != null && discountPercent > 0 && (
          <span className="text-[9px] font-semibold uppercase tracking-[1px] text-accent">
            {`-${discountPercent}%`}
          </span>
        )}
      </div>

      {/* Format + size */}
      <div className="mt-auto text-[11px] tracking-[0.3px] text-ink-3">
        {formatFileSize(fileFormat, fileSizeBytes)}
      </div>

      {/* Nút hành động — sibling to cover (not inside <a>).
          Đã sở hữu → "Đọc ngay" (điều hướng thư viện); ngược lại → "Thêm vào giỏ". */}
      {owned ? (
        <button
          type="button"
          className="btn-cart mt-3 w-full border border-ink bg-ink py-2 text-[11px] font-semibold uppercase tracking-[1px] text-bg transition-colors duration-150 hover:bg-transparent hover:text-ink"
          onClick={(e) => {
            e.stopPropagation();
            navigate('/user/ebooks');
          }}
        >
          Đọc ngay
        </button>
      ) : (
        <button
          type="button"
          className="btn-cart mt-3 w-full border border-ink py-2 text-[11px] font-semibold uppercase tracking-[1px] text-ink transition-colors duration-150 hover:bg-ink hover:text-bg"
          onClick={(e) => {
            e.stopPropagation();
            onAddToCart?.(book);
          }}
        >
          Thêm vào giỏ
        </button>
      )}
    </article>
  );
};
