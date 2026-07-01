import { useState, useEffect } from 'react';
import {
  useGetBookReviewsQuery,
  useGetMyReviewQuery,
  useCreateReviewMutation,
  useUpdateReviewMutation,
} from '../reviewsApi';
import { useGetMyEbooksQuery } from '../../library/libraryApi';
import { useAppSelector } from '../../../app/hooks';
import { useToast } from '../../../shared/hooks/useToast';
import { formatDateTime, formatCount } from '../../../shared/format';
import type { ReviewDTO } from '../types';

/* ── Props ── */
interface ReviewSectionProps {
  bookId: number;
  bookSlug: string;
  ratingAvg: number;
  ratingCount: number;
}

/* ── Star renderer ── */
const renderStars = (rating: number, size: 'sm' | 'lg' = 'sm') => {
  const full = Math.round(rating);
  const stars = '★'.repeat(full) + '☆'.repeat(5 - full);
  const cls =
    size === 'lg'
      ? 'text-star text-[20px] tracking-[3px]'
      : 'text-star tracking-[2px]';
  return (
    <span className={cls} aria-label={`${rating} sao`}>
      {stars}
    </span>
  );
};

/* ── Avatar initial ── */
const UserAvatar = ({ name }: { name: string }) => {
  const initial = name.trim().charAt(0).toUpperCase();
  return (
    <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-surface border border-line text-[14px] font-semibold text-ink-2">
      {initial}
    </div>
  );
};

/* ── Star picker for write form ── */
const StarPicker = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          aria-label={`Chọn ${s} sao`}
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          className="text-[24px] text-star leading-none transition-opacity duration-100 hover:opacity-100"
        >
          {s <= (hovered || value) ? '★' : '☆'}
        </button>
      ))}
    </div>
  );
};

/* ── Individual review card ── */
const ReviewCard = ({ review }: { review: ReviewDTO }) => (
  <div className="border-b border-line py-6 last:border-b-0">
    <div className="flex items-start gap-3">
      <UserAvatar name={review.userName} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[13px] font-semibold text-ink">{review.userName}</span>
          <span className="text-[11px] text-ink-3">{formatDateTime(review.createdAt)}</span>
        </div>
        <div className="mt-1">{renderStars(review.rating)}</div>
        {review.comment && (
          <p className="mt-2 text-[14px] leading-[1.7] text-ink-2">{review.comment}</p>
        )}
        {review.vendorReply && (
          <div className="mt-3 rounded-[2px] border border-line bg-surface px-4 py-3">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-[1px] text-ink-3">
              Phản hồi từ người bán:
            </div>
            <p className="text-[13px] leading-[1.6] text-ink-2">{review.vendorReply}</p>
          </div>
        )}
      </div>
    </div>
  </div>
);

/* ── Rating distribution bar ── */
const computeDistribution = (reviews: ReviewDTO[], ratingAvg: number, ratingCount: number) => {
  // Count from loaded reviews
  const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reviews.forEach((r) => {
    if (r.rating >= 1 && r.rating <= 5) counts[r.rating]++;
  });

  // If we have fewer reviews loaded than total, approximate based on avg
  const loadedTotal = reviews.length;
  if (loadedTotal < ratingCount) {
    // Use avg-weighted approximation
    const basePercent = [5, 4, 3, 2, 1].map((s) => {
      if (s === Math.round(ratingAvg)) return 60;
      const diff = Math.abs(s - ratingAvg);
      return Math.max(0, 45 - diff * 14);
    });
    return [5, 4, 3, 2, 1].map((s, i) => ({
      star: s,
      width: `${basePercent[i]}%`,
      count: counts[s] > 0 ? counts[s] : null,
    }));
  }

  const max = Math.max(...Object.values(counts), 1);
  return [5, 4, 3, 2, 1].map((s) => ({
    star: s,
    width: `${Math.round((counts[s] / max) * 100)}%`,
    count: counts[s],
  }));
};

/* ── Main component ── */
export const ReviewSection = ({
  bookId,
  bookSlug,
  ratingAvg,
  ratingCount,
}: ReviewSectionProps) => {
  const user = useAppSelector((s) => s.auth.user);
  const isUserRole = user?.role === 'user';
  const { show, ToastLayer } = useToast();

  /* ── Pagination state ── */
  const [currentPage, setCurrentPage] = useState(1);

  /* ── Filter state ── */
  const [starFilter, setStarFilter] = useState<number | null>(null);

  /* ── Reviews query ── */
  const { data, isLoading, isError } = useGetBookReviewsQuery({
    idOrSlug: bookSlug,
    page: currentPage,
    limit: 10,
  });

  const reviews = data?.reviews ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: 10, total: 0, totalPages: 1 };

  /* ── Library query (gating) ── */
  const { data: ebooksData } = useGetMyEbooksQuery(
    { page: 1, limit: 200 },
    { skip: !isUserRole },
  );
  const ownsBook = isUserRole
    ? (ebooksData?.ebooks ?? []).some((e) => e.bookId === bookId)
    : false;

  /* ── My existing review (gating: chỉ user role) ── */
  const { data: myReview } = useGetMyReviewQuery({ bookId }, { skip: !isUserRole });
  const hasReviewed = !!myReview;

  /* ── Write/Edit form state ── */
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [createReview, { isLoading: creating }] = useCreateReviewMutation();
  const [updateReview, { isLoading: updating }] = useUpdateReviewMutation();
  const submitting = creating || updating;

  /* ── Prefill form khi đã có đánh giá (edit mode) ── */
  useEffect(() => {
    if (myReview) {
      setRating(myReview.rating);
      setComment(myReview.comment ?? '');
    }
  }, [myReview?.id, myReview?.rating, myReview?.comment]);

  const handleSubmit = async () => {
    if (rating === 0) {
      show('Vui lòng chọn số sao');
      return;
    }
    const trimmed = comment.trim() || undefined;
    try {
      if (hasReviewed) {
        await updateReview({ bookId, rating, comment: trimmed, idOrSlug: bookSlug }).unwrap();
        show('Đã cập nhật đánh giá!');
      } else {
        await createReview({ bookId, rating, comment: trimmed, idOrSlug: bookSlug }).unwrap();
        show('Đã gửi đánh giá thành công!');
      }
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      const code = e?.code;
      if (code === 'REVIEW_NOT_ALLOWED') {
        show('Bạn cần mua sách để viết đánh giá');
      } else if (code === 'REVIEW_DUPLICATE') {
        show('Bạn đã đánh giá cuốn sách này rồi');
      } else {
        show(e?.message ?? 'Không thể gửi đánh giá. Vui lòng thử lại.');
      }
    }
  };

  /* ── Filtered reviews ── */
  const filteredReviews = starFilter !== null
    ? reviews.filter((r) => r.rating === starFilter)
    : reviews;

  /* ── Distribution bars ── */
  const distribution = computeDistribution(reviews, ratingAvg, ratingCount);

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4 py-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <div className="h-9 w-9 rounded-full bg-line" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-24 rounded bg-line" />
              <div className="h-3 w-full rounded bg-line" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  /* ── Error state ── */
  if (isError) {
    return (
      <div className="py-8 text-center text-[14px] text-ink-3">
        Không thể tải đánh giá. Vui lòng thử lại sau.
      </div>
    );
  }

  return (
    <div>
      <ToastLayer />

      {/* ── Overview block ── */}
      {ratingCount > 0 && (
        <div
          className="mb-7 grid items-center gap-12 border-b border-line pb-8"
          style={{ gridTemplateColumns: '200px 1fr' }}
        >
          <div>
            <div className="text-[56px] font-semibold leading-none tracking-[-2px] text-ink">
              {ratingAvg.toFixed(1)}
            </div>
            <div className="my-[10px]">{renderStars(ratingAvg, 'lg')}</div>
            <div className="text-[12px] text-ink-3">
              Dựa trên {formatCount(ratingCount)} đánh giá
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {distribution.map(({ star, width, count }) => (
              <div key={star} className="flex items-center gap-3 text-[12px] text-ink-2">
                <span className="w-7 tabular-nums text-ink-3">{star}★</span>
                <span className="flex-1 h-[6px] rounded-[2px] bg-line overflow-hidden">
                  <span className="block h-full bg-ink" style={{ width }} />
                </span>
                <span className="w-9 text-right tabular-nums text-ink-3">
                  {count !== null ? count : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Filter chips ── */}
      {reviews.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStarFilter(null)}
            className={`rounded-[2px] border px-3 py-1 text-[12px] font-medium transition-[border-color,color] duration-200 ${
              starFilter === null
                ? 'border-ink bg-ink text-paper'
                : 'border-line text-ink-2 hover:border-ink hover:text-ink'
            }`}
          >
            Tất cả
          </button>
          {[5, 4, 3, 2, 1].map((s) => (
            <button
              key={s}
              type="button"
              aria-label={`${s}★`}
              onClick={() => setStarFilter(starFilter === s ? null : s)}
              className={`rounded-[2px] border px-3 py-1 text-[12px] font-medium transition-[border-color,color] duration-200 ${
                starFilter === s
                  ? 'border-ink bg-ink text-paper'
                  : 'border-line text-ink-2 hover:border-ink hover:text-ink'
              }`}
            >
              {s}★
            </button>
          ))}
        </div>
      )}

      {/* ── Review list ── */}
      {filteredReviews.length > 0 ? (
        <div>
          {filteredReviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center py-10 text-center">
          <svg
            className="mb-4 text-ink-3"
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p className="text-[14px] font-medium text-ink">Chưa có đánh giá</p>
          <p className="mt-1 text-[13px] text-ink-2">
            Hãy là người đầu tiên đánh giá cuốn sách này.
          </p>
        </div>
      )}

      {/* ── Tải thêm đánh giá ── */}
      {pagination.totalPages > 1 && pagination.page < pagination.totalPages && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setCurrentPage((p) => p + 1)}
            className="inline-flex h-10 items-center rounded-[2px] border border-ink px-6 text-[12px] font-semibold uppercase tracking-[1.5px] text-ink transition-[background,color] duration-200 hover:bg-ink hover:text-paper"
          >
            Tải thêm đánh giá
          </button>
        </div>
      )}

      {/* ── Write review section ── */}
      <div className="mt-10 border-t border-line pt-8">
        {/* Guest: no form */}
        {!user && null}

        {/* Vendor/admin: no form */}
        {user && !isUserRole && null}

        {/* User role: check ownership */}
        {isUserRole && !ownsBook && !hasReviewed && (
          <div className="flex items-center gap-3 rounded-[2px] border border-line bg-surface px-5 py-4 text-[14px] text-ink-2">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="flex-shrink-0 text-ink-3"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4M12 16h.01" strokeWidth="1.6" />
            </svg>
            <span>Mua sách để viết đánh giá</span>
          </div>
        )}

        {isUserRole && (ownsBook || hasReviewed) && (
          <div>
            <div className="mb-5 text-[11px] font-semibold uppercase tracking-[2px] text-ink-3">
              {hasReviewed ? 'Chỉnh sửa đánh giá của bạn' : 'Viết đánh giá của bạn'}
            </div>
            <div className="mb-4">
              <div className="mb-2 text-[13px] text-ink-2">Xếp hạng</div>
              <StarPicker value={rating} onChange={setRating} />
            </div>
            <div className="mb-4">
              <div className="mb-2 text-[13px] text-ink-2">Nhận xét (tuỳ chọn)</div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                placeholder="Chia sẻ cảm nhận của bạn về cuốn sách..."
                className="w-full rounded-[2px] border border-line bg-paper px-4 py-3 text-[14px] text-ink placeholder:text-ink-3 focus:border-ink focus:outline-none transition-[border-color] duration-200 resize-none"
              />
            </div>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting || rating === 0}
              className="inline-flex h-11 items-center rounded-[2px] bg-ink px-6 text-[12px] font-semibold uppercase tracking-[1.5px] text-paper transition-opacity duration-200 hover:opacity-[.85] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? hasReviewed
                  ? 'Đang cập nhật...'
                  : 'Đang gửi...'
                : hasReviewed
                  ? 'Cập nhật đánh giá'
                  : 'Gửi đánh giá'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
