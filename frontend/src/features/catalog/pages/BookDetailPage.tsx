import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { SiteHeader, SiteFooter, BookCard, COVER_PLACEHOLDER } from '../../../shared/ui';
import { useGetBookDetailQuery } from '../catalogApi';
import { useAddToCartMutation } from '../../cart/cartApi';
import { useAddToWishlistMutation, useRemoveFromWishlistMutation, useGetWishlistQuery } from '../../wishlist/wishlistApi';
import { ReviewSection } from '../../reviews/components/ReviewSection';
import type { BookCard as BookCardDTO } from '../types';
import { formatVND, formatFileSize, formatCount } from '../../../shared/format';
import { useAppSelector } from '../../../app/hooks';
import { useToast } from '../../../shared/hooks/useToast';

/* ── Star renderer ── */
const renderStars = (avg: number, size: 'sm' | 'lg' = 'sm') => {
  const full = Math.round(avg);
  const stars = '★'.repeat(full) + '☆'.repeat(5 - full);
  const cls =
    size === 'lg'
      ? 'text-star text-[20px] tracking-[3px]'
      : 'text-star tracking-[2px]';
  return (
    <span className={cls} aria-label={`${avg} sao`}>
      {stars}
    </span>
  );
};

/* ── Skeleton ── */
const Skeleton = () => (
  <div className="min-h-screen bg-paper">
    <SiteHeader />
    <div className="mx-auto max-w-[1180px] px-10 py-10 animate-pulse">
      <div className="h-4 w-64 rounded bg-line mb-10" />
      <div className="grid grid-cols-[40%_60%] gap-16">
        <div className="aspect-[2/3] rounded bg-cover-bg border border-line" />
        <div className="flex flex-col gap-4 pt-4">
          <div className="h-8 w-3/4 rounded bg-line" />
          <div className="h-4 w-1/3 rounded bg-line" />
          <div className="h-4 w-1/2 rounded bg-line" />
          <div className="h-8 w-1/4 rounded bg-line" />
          <div className="mt-6 h-12 w-full rounded bg-line" />
        </div>
      </div>
    </div>
    <SiteFooter />
  </div>
);

/* ── 404 state ── */
const NotFoundState = () => (
  <div className="min-h-screen bg-paper">
    <SiteHeader />
    <div className="mx-auto flex max-w-[1180px] flex-col items-center px-10 py-24 text-center">
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
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" strokeWidth="1.6" />
      </svg>
      <p className="mb-3 text-[22px] font-semibold leading-tight tracking-[-0.4px] text-ink">
        Không tìm thấy sách
      </p>
      <p className="mb-8 max-w-[340px] text-[14px] leading-[1.7] text-ink-2">
        Cuốn sách bạn tìm không tồn tại hoặc đã bị gỡ khỏi hệ thống.
      </p>
      <Link
        to="/books"
        className="inline-flex h-11 items-center rounded-[2px] border border-ink px-6 text-[12px] font-semibold uppercase tracking-[1.5px] text-ink transition-[background,color] duration-200 hover:bg-ink hover:text-paper"
      >
        Quay về danh sách sách
      </Link>
    </div>
    <SiteFooter />
  </div>
);

/* ── Related carousel ── */
interface CarouselProps {
  title: string;
  books: BookCardDTO[];
  viewAllUrl: string;
  viewAllLabel: string;
  onAddToCart?: (book: BookCardDTO) => void;
}

const RelatedCarousel = ({ title, books, viewAllUrl, viewAllLabel, onAddToCart }: CarouselProps) => {
  const [offset, setOffset] = useState(0);
  const pageSize = 5;

  if (books.length === 0) return null;

  const totalPages = Math.ceil(books.length / pageSize);
  const visibleBooks = books.slice(offset, offset + pageSize);

  const prev = () => setOffset((o) => Math.max(0, o - pageSize));
  const next = () => setOffset((o) => Math.min((totalPages - 1) * pageSize, o + pageSize));

  return (
    <section className="border-t border-line py-16">
      <div className="mx-auto max-w-[1180px] px-10">
        <div className="mb-10 flex items-center justify-between">
          <span className="text-[13px] font-medium uppercase tracking-[2px] text-ink">
            {title}
          </span>
          <div className="flex items-center gap-4">
            <Link
              to={viewAllUrl}
              className="text-[12px] tracking-[.5px] text-ink-2 transition-colors duration-200 hover:text-ink"
            >
              {viewAllLabel} →
            </Link>
            <button
              type="button"
              onClick={prev}
              disabled={offset === 0}
              aria-label="Trước"
              className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-line text-ink-2 transition-[border-color,color] duration-200 hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg width="13" height="13" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" strokeLinecap="round" fill="none" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={next}
              disabled={offset + pageSize >= books.length}
              aria-label="Tiếp"
              className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-line text-ink-2 transition-[border-color,color] duration-200 hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              <svg width="13" height="13" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" strokeLinecap="round" fill="none" aria-hidden="true">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-5 gap-x-6">
          {visibleBooks.map((book) => (
            <BookCard key={book.id} book={book} onAddToCart={onAddToCart} />
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─────────────────────────────────────────── */
/*  BookDetailPage                             */
/* ─────────────────────────────────────────── */
export const BookDetailPage = () => {
  const { idOrSlug = '' } = useParams<{ idOrSlug: string }>();
  const navigate = useNavigate();
  const user = useAppSelector((s) => s.auth.user);
  const { show, ToastLayer } = useToast();

  const [addToCart] = useAddToCartMutation();
  const [addToWishlist] = useAddToWishlistMutation();
  const [removeFromWishlist] = useRemoveFromWishlistMutation();

  // Wishlist: chỉ fetch khi đã đăng nhập với role 'user'
  const isUserRole = user?.role === 'user';
  const { data: wishlistData } = useGetWishlistQuery(
    { page: 1, limit: 100 },
    { skip: !isUserRole },
  );

  const { data: book, isLoading, isError, error } = useGetBookDetailQuery(
    { idOrSlug },
    { skip: !idOrSlug },
  );

  /* gallery state */
  const [activeThumbIndex, setActiveThumbIndex] = useState(0);
  const [fading, setFading] = useState(false);

  /* tab state: 0=Mô tả, 1=Mục lục, 2=Đánh giá */
  const [activeTab, setActiveTab] = useState(0);

  /* description expand */
  const [descExpanded, setDescExpanded] = useState(false);

  /* reset thumb when book changes */
  useEffect(() => {
    setActiveThumbIndex(0);
  }, [book?.id]);

  /* ── Loading ── */
  if (isLoading) return <Skeleton />;

  /* ── 404 ── */
  const is404 =
    isError &&
    error &&
    'data' in error &&
    (error.data as { code?: string })?.code === 'BOOK_NOT_FOUND';

  if (isError || !book) {
    if (is404 || isError) return <NotFoundState />;
    return <NotFoundState />;
  }

  /* ── Build gallery items ── */
  const galleryItems: Array<{ url: string | null; label: string }> =
    book.images.length > 0
      ? book.images.map((img) => ({ url: img.url, alt: img.alt, label: img.alt } as { url: string | null; label: string }))
      : [{ url: book.coverImageUrl, label: 'Bìa' }];

  const activeItem = galleryItems[activeThumbIndex] ?? galleryItems[0];

  const handleThumbClick = (idx: number) => {
    if (idx === activeThumbIndex) return;
    setFading(true);
    setTimeout(() => {
      setActiveThumbIndex(idx);
      setFading(false);
    }, 180);
  };

  /* ── Action handlers ── */
  const handleAddToCart = async () => {
    // Chưa đăng nhập → chuyển về trang login
    if (!user) {
      navigate(`/login?returnUrl=/books/${idOrSlug}`);
      return;
    }
    // Đã đăng nhập nhưng không phải role 'user' (vendor/admin/manager) → không cho thêm giỏ
    if (user.role !== 'user') return;
    if (!book) return;
    try {
      await addToCart({ bookId: book.id }).unwrap();
      show('Đã thêm vào giỏ hàng');
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      const msg = e?.data?.message ?? '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('đã có')) {
        show('Sách đã có trong giỏ');
      } else {
        show('Không thể thêm vào giỏ hàng');
      }
    }
  };

  const handleBuyNow = async () => {
    // Chưa đăng nhập → chuyển về trang login
    if (!user) {
      navigate(`/login?returnUrl=/books/${idOrSlug}`);
      return;
    }
    // Không phải role 'user' → không cho mua
    if (user.role !== 'user') return;
    if (!book) return;
    try {
      await addToCart({ bookId: book.id }).unwrap();
      navigate('/checkout');
    } catch (err: unknown) {
      const e = err as { data?: { message?: string } };
      const msg = e?.data?.message ?? '';
      if (msg.toLowerCase().includes('already') || msg.toLowerCase().includes('đã có')) {
        // Sách đã trong giỏ → cũng navigate checkout được
        navigate('/checkout');
      } else {
        show('Không thể thêm vào giỏ hàng');
      }
    }
  };

  // Kiểm tra book có trong wishlist không (dựa vào danh sách đã fetch)
  const isWishlisted = book
    ? (wishlistData?.items ?? []).some((it) => it.book.id === book.id)
    : false;

  const handleWishlist = async () => {
    if (!user) {
      navigate(`/login?returnUrl=/books/${idOrSlug}`);
      return;
    }
    // vendor/admin không được dùng wishlist
    if (user.role !== 'user') return;
    if (!book) return;
    try {
      if (isWishlisted) {
        await removeFromWishlist(book.id).unwrap();
        show(`Đã xóa "${book.title}" khỏi Wishlist`);
      } else {
        await addToWishlist({ bookId: book.id }).unwrap();
        show(`Đã thêm "${book.title}" vào Wishlist`);
      }
    } catch {
      show('Không thể cập nhật Wishlist. Vui lòng thử lại.');
    }
  };

  /* ── Breadcrumb ── */
  const authorSlug = book.author?.slug ?? '';
  const authorName = book.author?.name ?? 'Không rõ';
  const categorySlug = book.category?.slug ?? '';
  const categoryName = book.category?.name ?? '';
  const publisherName = book.publisher?.name ?? '';

  /* ── Price ── */
  const hasDiscount =
    book.originalPrice != null && book.originalPrice > book.price;

  /* ── năm xuất bản: ưu tiên publishYear, fallback năm publishedAt ── */
  const publishedYear =
    book.publishYear ??
    (book.publishedAt ? new Date(book.publishedAt).getFullYear() : null);

  /* ── Description paragraphs ── */
  const descParagraphs = book.description
    ? book.description.split(/\n+/).filter((p) => p.trim())
    : [];

  /* ── TOC ── */
  const toc = book.tableOfContents ?? [];

  return (
    <div className="min-h-screen bg-paper">
      <ToastLayer />
      <SiteHeader />

      <div className="mx-auto max-w-[1180px] px-10">
        {/* ── Breadcrumb ── */}
        <nav className="flex items-center gap-[10px] pt-7 pb-0 text-[12px] tracking-[.2px] text-ink-2" aria-label="Breadcrumb">
          <Link to="/" className="text-ink-2 transition-colors duration-200 hover:text-ink">
            Trang chủ
          </Link>
          <span className="text-ink-3">/</span>
          {categorySlug ? (
            <Link
              to={`/books?category=${categorySlug}`}
              className="text-ink-2 transition-colors duration-200 hover:text-ink"
            >
              {categoryName}
            </Link>
          ) : (
            <Link to="/books" className="text-ink-2 transition-colors duration-200 hover:text-ink">
              Sách
            </Link>
          )}
          <span className="text-ink-3">/</span>
          <span className="text-ink">{book.title}</span>
        </nav>

        {/* ── Product block ── */}
        <div className="grid grid-cols-[40%_60%] gap-16 py-10 pb-20">
          {/* Gallery */}
          <div>
            {/* Main image */}
            <div
              className="relative flex aspect-[2/3] flex-col items-center justify-center overflow-hidden rounded-[2px] border border-line bg-cover-bg p-[48px_36px]"
              style={{ transition: 'background .3s' }}
            >
              {/* Format badge */}
              <span className="absolute left-4 top-4 text-[9px] font-semibold uppercase tracking-[1.5px] text-accent">
                {book.fileFormat}
              </span>

              {/* Wishlist heart — hiển thị cho user + guest (ẩn với vendor/admin) */}
              {(!user || user.role === 'user') && (
                <button
                  type="button"
                  aria-label={isWishlisted ? 'Bỏ yêu thích' : 'Lưu vào Wishlist'}
                  onClick={handleWishlist}
                  className="absolute right-[14px] top-[14px] flex h-9 w-9 items-center justify-center rounded-full border border-line bg-surface text-ink-2 transition-[border-color,color] duration-200 hover:border-ink hover:text-ink"
                >
                  <svg width="16" height="16" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24" fill={isWishlisted ? 'currentColor' : 'none'} aria-hidden="true">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}

              {/* Cover content with fade */}
              <div
                className="flex flex-col items-center"
                style={{
                  transition: 'opacity .35s cubic-bezier(.22,.61,.36,1)',
                  opacity: fading ? 0 : 1,
                }}
              >
                {activeItem.url ? (
                  <img
                    src={activeItem.url}
                    alt={activeItem.label}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.src.endsWith(COVER_PLACEHOLDER)) return;
                      img.src = COVER_PLACEHOLDER;
                    }}
                  />
                ) : (
                  <>
                    <div className="mb-6 h-px w-8 bg-ink-3" />
                    <div
                      className="text-center text-[22px] font-semibold leading-[1.35] tracking-[-0.4px] text-ink"
                      data-testid="gallery-title"
                    >
                      {book.title}
                    </div>
                    <div className="mt-[18px] text-center text-[11px] font-medium uppercase tracking-[1.5px] text-ink-3">
                      {authorName}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Thumbnails */}
            {galleryItems.length > 1 && (
              <div className="mt-4 flex gap-[10px]">
                {galleryItems.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    aria-label={`Xem ảnh ${item.label}`}
                    onClick={() => handleThumbClick(idx)}
                    className={`flex h-16 w-12 flex-shrink-0 items-center justify-center rounded-[2px] border bg-cover-bg text-[8px] font-semibold uppercase tracking-[.5px] text-ink-3 transition-[border-color] duration-200 hover:border-ink-3 ${
                      idx === activeThumbIndex ? 'border-ink' : 'border-line'
                    }`}
                  >
                    {item.url ? (
                      <img
                        src={item.url}
                        alt={item.label}
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          const img = e.currentTarget;
                          if (img.src.endsWith(COVER_PLACEHOLDER)) return;
                          img.src = COVER_PLACEHOLDER;
                        }}
                      />
                    ) : (
                      item.label.slice(0, 4)
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* Single-image fallback thumbnails (static placeholder, matches design) */}
            {galleryItems.length === 1 && (
              <div className="mt-4 flex gap-[10px]">
                {['Bìa', 'Sau', 'Gáy', 'Trang', 'Mục'].map((label, idx) => (
                  <button
                    key={label}
                    type="button"
                    aria-label={`Xem ${label}`}
                    onClick={() => handleThumbClick(idx === 0 ? 0 : 0)} // all map to idx 0 in single-image mode
                    className={`flex h-16 w-12 flex-shrink-0 items-center justify-center rounded-[2px] border bg-cover-bg text-[8px] font-semibold uppercase tracking-[.5px] text-ink-3 transition-[border-color] duration-200 hover:border-ink-3 ${
                      idx === 0 ? 'border-ink' : 'border-line'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            <h1 className="mb-[14px] text-[28px] font-semibold leading-[1.25] tracking-[-0.5px] text-ink">
              {book.title}
            </h1>

            <div className="mb-[18px] text-[13px] text-ink-2">
              Tác giả:{' '}
              {authorSlug ? (
                <Link
                  to={`/books?author=${authorSlug}`}
                  className="border-b border-ink-3 pb-px text-ink transition-[border-color] duration-200 hover:border-ink"
                >
                  {authorName}
                </Link>
              ) : (
                <span className="text-ink">{authorName}</span>
              )}
            </div>

            {/* Rating row */}
            <div className="mb-[18px] flex items-center gap-[10px] text-[13px] text-ink-2">
              {renderStars(book.ratingAvg)}
              <span className="font-semibold text-ink">{book.ratingAvg.toFixed(1)}</span>
              <span className="text-ink-3">({formatCount(book.ratingCount)} đánh giá)</span>
              <span className="text-ink-3">·</span>
              <span className="text-ink-3">{formatCount(book.purchaseCount)} lượt mua</span>
            </div>

            {/* Format chip */}
            <div className="mb-[18px]">
              <span className="inline-block rounded-[2px] border border-line px-[10px] py-1 text-[9px] font-semibold uppercase tracking-[1.5px] text-accent">
                {book.fileFormat}
              </span>
            </div>

            {/* Meta */}
            <div className="border-b border-line pb-6 text-[12px] tracking-[.2px] text-ink-2">
              {publisherName && (
                <>
                  <span>{publisherName}</span>
                  <span className="mx-2 text-ink-3">·</span>
                </>
              )}
              {publishedYear && (
                <>
                  <span>{publishedYear}</span>
                  <span className="mx-2 text-ink-3">·</span>
                </>
              )}
              {categorySlug && categoryName && (
                <Link
                  to={`/books?category=${categorySlug}`}
                  className="text-ink-2 transition-colors duration-200 hover:text-ink"
                >
                  {categoryName}
                </Link>
              )}
            </div>

            {/* Price block */}
            <div className="flex items-baseline gap-[14px] py-6">
              <span className="text-[28px] font-semibold tabular-nums tracking-[-0.5px] text-ink">
                {formatVND(book.price)}
              </span>
              {hasDiscount && (
                <>
                  <span className="text-[14px] tabular-nums text-ink-3 line-through">
                    {formatVND(book.originalPrice!)}
                  </span>
                  {book.discountPercent != null && book.discountPercent > 0 && (
                    <span className="rounded-[2px] bg-danger-bg px-2 py-[3px] text-[11px] font-semibold tracking-[.5px] text-danger-fg">
                      −{book.discountPercent}%
                    </span>
                  )}
                </>
              )}
            </div>

            {/* E-book info row */}
            <div className="mb-6 flex items-center gap-[10px] border-b border-t border-line py-4 text-[12px] text-ink-2">
              <svg width="16" height="16" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" fill="none" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
              <span>{formatFileSize(book.fileFormat, book.fileSizeBytes)} · Tải file về máy ngay sau khi thanh toán</span>
            </div>

            {/* Action buttons */}
            <div className="flex max-w-[420px] flex-col gap-2">
              <button
                type="button"
                onClick={handleBuyNow}
                className="inline-flex h-12 items-center justify-center rounded-[2px] bg-ink text-[12px] font-semibold uppercase tracking-[1.5px] text-paper transition-opacity duration-200 hover:opacity-[.85]"
              >
                Mua ngay
              </button>
              <button
                type="button"
                onClick={handleAddToCart}
                className="inline-flex h-12 items-center justify-center rounded-[2px] border border-ink text-[12px] font-semibold uppercase tracking-[1.5px] text-ink transition-[background,color] duration-200 hover:bg-ink hover:text-paper"
              >
                Thêm vào giỏ
              </button>
              {(!user || user.role === 'user') && (
                <button
                  type="button"
                  onClick={handleWishlist}
                  className="inline-flex items-center gap-2 self-start bg-transparent border-none py-2 text-[13px] text-ink-2 transition-colors duration-200 hover:text-ink"
                >
                  <svg width="15" height="15" stroke="currentColor" strokeWidth="1.6" viewBox="0 0 24 24" fill={isWishlisted ? 'currentColor' : 'none'} aria-hidden="true">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {isWishlisted ? 'Đã lưu vào Wishlist' : 'Lưu vào Wishlist'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs section ── */}
      <section className="border-t border-line py-16">
        <div className="mx-auto max-w-[1180px] px-10">
          {/* Tab bar */}
          <div className="mb-10 flex gap-9 border-b border-line">
            {(['Mô tả', 'Mục lục', 'Đánh giá'] as const).map((label, idx) => (
              <button
                key={label}
                type="button"
                onClick={() => setActiveTab(idx)}
                className={`relative pb-4 text-[13px] font-medium tracking-[.3px] transition-colors duration-200 ${
                  activeTab === idx ? 'text-ink' : 'text-ink-2 hover:text-ink'
                }`}
              >
                {label}
                {idx === 2 && (
                  <span className="ml-1 text-ink-3">({formatCount(book.ratingCount)})</span>
                )}
                {activeTab === idx && (
                  <span className="absolute bottom-[-1px] left-0 h-[2px] w-full bg-ink" />
                )}
              </button>
            ))}
          </div>

          {/* Panel: Mô tả */}
          <div className={`max-w-[820px] ${activeTab !== 0 ? 'hidden' : ''}`}>
            <div className="mb-5 text-[11px] font-semibold uppercase tracking-[2px] text-ink-3">
              Mô tả
            </div>
            {descParagraphs.length > 0 ? (
              <>
                <div className="text-[14px] leading-[1.85] text-ink-2">
                  {(descExpanded ? descParagraphs : descParagraphs.slice(0, 3)).map((p, i) => (
                    <p key={i} className={i > 0 ? 'mt-[14px]' : ''}>
                      {p}
                    </p>
                  ))}
                </div>
                {descParagraphs.length > 3 && (
                  <button
                    type="button"
                    onClick={() => setDescExpanded((v) => !v)}
                    className="mt-[14px] border-b border-ink bg-transparent pb-px text-[13px] font-medium text-ink"
                  >
                    {descExpanded ? 'Thu gọn' : 'Xem thêm'}
                  </button>
                )}
              </>
            ) : (
              <p className="text-[14px] text-ink-3">Chưa có mô tả.</p>
            )}
          </div>

          {/* Panel: Mục lục */}
          <div className={`max-w-[820px] ${activeTab !== 1 ? 'hidden' : ''}`}>
            <div className="mb-5 text-[11px] font-semibold uppercase tracking-[2px] text-ink-3">
              Mục lục
            </div>
            {toc.length > 0 ? (
              <div className="flex flex-col">
                {toc.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex gap-[18px] border-b border-line px-1 py-4 text-[14px] last:border-b-0"
                  >
                    <span className="w-7 flex-shrink-0 tabular-nums text-ink-3">
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span className="text-ink">{item}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[14px] text-ink-3">Chưa cập nhật mục lục.</p>
            )}
          </div>

          {/* Panel: Đánh giá (Phase 4) */}
          <div className={`max-w-[820px] ${activeTab !== 2 ? 'hidden' : ''}`}>
            <div className="mb-5 text-[11px] font-semibold uppercase tracking-[2px] text-ink-3">
              Đánh giá ({formatCount(book.ratingCount)})
            </div>
            <ReviewSection
              bookId={book.id}
              bookSlug={book.slug}
              ratingAvg={book.ratingAvg}
              ratingCount={book.ratingCount}
            />
          </div>
        </div>
      </section>

      {/* ── Related: by author ── */}
      {book.relatedByAuthor.length > 0 && (
        <RelatedCarousel
          title={`Sách của ${authorName}`}
          books={book.relatedByAuthor}
          viewAllUrl={`/books?author=${authorSlug}`}
          viewAllLabel="Xem tất cả"
          onAddToCart={handleAddToCart}
        />
      )}

      {/* ── Related: by category ── */}
      {book.relatedByCategory.length > 0 && (
        <RelatedCarousel
          title="Có thể bạn cũng thích"
          books={book.relatedByCategory}
          viewAllUrl={`/books?category=${categorySlug}`}
          viewAllLabel="Xem thêm"
          onAddToCart={handleAddToCart}
        />
      )}

      <SiteFooter />
    </div>
  );
};
