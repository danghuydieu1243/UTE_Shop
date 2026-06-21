import { useNavigate } from 'react-router-dom';
import type { BookCard as BookCardDTO } from '../../features/catalog/types';
import { formatVND, formatFileSize, formatCount } from '../format';

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
}

/**
 * BookCard — bám Design System §5 + home_static.html + book_catalog_static.html.
 * Root = <article> (not <a>) so the "Thêm vào giỏ" <button> is a valid sibling,
 * avoiding button-inside-anchor (invalid HTML5).
 * Hover: .book-cover đổi nền sang #EFEDE6; .cover-rule giãn rộng (home_preview.html).
 */
export const BookCard = ({ book, className = '', rank, onAddToCart, highlightQuery }: BookCardProps) => {
  const navigate = useNavigate();

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

  return (
    <article
      role="link"
      tabIndex={0}
      onClick={handleNavigate}
      onKeyDown={handleKeyDown}
      aria-label={title}
      className={`group flex flex-col cursor-pointer ${className}`}
    >
      {/* Cover image */}
      <div className="relative mb-3.5 flex aspect-[2/3] flex-col items-center justify-center overflow-hidden border border-line bg-cover-bg p-[26px_22px] transition-colors duration-200 group-hover:bg-[#EFEDE6]">
        {/* Tag badge — top-left */}
        {tag && (
          <span className="absolute left-3 top-3 text-[9px] font-semibold uppercase tracking-[1.5px] text-accent">
            {tag}
          </span>
        )}

        {/* Rank badge — top-right (optional) */}
        {rank != null && (
          <span className="absolute right-3.5 top-3 font-[500] tabular-nums text-ink-3">
            <span className="text-[9px] mr-0.5">No.</span>
            <span className="text-[13px]">{rank}</span>
          </span>
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

      {/* "Thêm vào giỏ" — always visible, sibling to cover (not inside <a>).
          Cart wiring comes in Phase 3. */}
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
    </article>
  );
};
