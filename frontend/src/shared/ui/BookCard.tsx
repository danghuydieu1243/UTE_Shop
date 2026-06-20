import { Link } from 'react-router-dom';
import type { BookCard as BookCardDTO } from '../../features/catalog/types';
import { formatVND, formatFileSize } from '../format';

interface BookCardProps {
  book: BookCardDTO;
  /** Extra classes to control grid column sizing from parent */
  className?: string;
  /** Show rank badge (e.g. "No. 1") */
  rank?: number;
}

/**
 * BookCard — bám Design System §5 + home_static.html + book_catalog_static.html.
 * Hover: .book-cover đổi nền sang #EFEDE6; .cover-rule giãn rộng (home_preview.html).
 */
export const BookCard = ({ book, className = '', rank }: BookCardProps) => {
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

  // Render star rating (filled ★ based on ratingAvg out of 5)
  const renderStars = () => {
    const fullStars = Math.round(ratingAvg);
    return '★'.repeat(fullStars) + '☆'.repeat(5 - fullStars);
  };

  return (
    <Link
      to={`/books/${slug}`}
      className={`group flex flex-col ${className}`}
      aria-label={title}
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

        {coverImageUrl ? (
          <img
            src={coverImageUrl}
            alt={title}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          /* Fallback placeholder: rule + title + author */
          <>
            <div className="mb-[18px] h-px w-6 bg-ink-3 transition-all duration-300 group-hover:w-10" />
            <div className="text-center text-[13px] font-semibold leading-[1.4] tracking-[-0.2px] text-ink line-clamp-4">
              {title}
            </div>
            {author && (
              <div className="mt-3.5 text-center text-[10px] font-medium uppercase tracking-[1.5px] text-ink-3">
                {author}
              </div>
            )}
          </>
        )}
      </div>

      {/* Title — 2 line clamp */}
      <div className="mb-1 line-clamp-2 min-h-[36px] text-[13px] font-medium leading-[1.4] text-ink">
        {title}
      </div>

      {/* Author */}
      <div className="mb-2 text-[12px] text-ink-3">{author ?? ' '}</div>

      {/* Rating */}
      <div className="mb-2 flex items-center gap-1.5 text-[11px] text-ink-2">
        <span className="text-star" aria-hidden="true">
          {renderStars()}
        </span>
        <span>{ratingAvg.toFixed(1)}</span>
        <span className="text-ink-3">({ratingCount.toLocaleString('vi-VN')})</span>
      </div>

      {/* Price row */}
      <div className="mb-3 flex items-baseline gap-2">
        <span className="text-[14px] font-semibold tabular-nums text-ink">{formatVND(price)}</span>
        {hasDiscount && (
          <span className="text-[11px] tabular-nums text-ink-3 line-through">
            {formatVND(originalPrice!)}
          </span>
        )}
        {discountPercent != null && discountPercent > 0 && (
          <span className="text-[9px] font-semibold uppercase tracking-[1px] text-accent">
            {`-${discountPercent}%`}
          </span>
        )}
      </div>

      {/* Format + size */}
      <div className="mt-auto text-[11px] tracking-[0.3px] text-ink-3">
        {formatFileSize(fileFormat, fileSizeBytes)}
      </div>
    </Link>
  );
};
