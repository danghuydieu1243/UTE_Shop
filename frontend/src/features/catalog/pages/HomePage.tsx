import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SiteHeader, SiteFooter, BookCard } from '../../../shared/ui';
import { useGetHomeQuery } from '../catalogApi';
import type { HomeCategory } from '../types';

/* ── Hero slides data (static marketing copy from home_preview.html) ── */
const HERO_SLIDES = [
  {
    eyebrow: 'Nền tảng sách · Việt Nam',
    title: (
      <>
        Kho tri thức
        <br />
        <span className="font-normal text-ink-3">vô tận</span> trong tầm tay
      </>
    ),
    desc: 'Hơn 10.000 đầu sách điện tử (E-book) từ các nhà xuất bản uy tín hàng đầu.',
    primaryLabel: 'Khám phá ngay',
    primaryTo: '/books',
    ghostLabel: 'Xem E-book',
    ghostTo: '/books',
  },
  {
    eyebrow: 'Nền tảng sách · Việt Nam',
    title: (
      <>
        Đọc mọi lúc,
        <br />
        <span className="font-normal text-ink-3">mọi nơi</span>
      </>
    ),
    desc: 'Hơn 5.000 E-book chất lượng cao. Tải ngay sau khi thanh toán — không chờ đợi.',
    primaryLabel: 'Xem bộ sưu tập',
    primaryTo: '/books',
    ghostLabel: 'Tìm hiểu thêm',
    ghostTo: '/books',
  },
  {
    eyebrow: 'Nền tảng sách · Việt Nam',
    title: (
      <>
        Top 10 sách
        <br />
        <span className="font-normal text-ink-3">được yêu thích</span>
      </>
    ),
    desc: 'Những cuốn sách được hàng nghìn độc giả Việt Nam đánh giá cao nhất tháng này.',
    primaryLabel: 'Xem bảng xếp hạng',
    primaryTo: '/books?sort=bestseller',
    ghostLabel: 'Tất cả sách',
    ghostTo: '/books',
  },
] as const;

/* ── Book skeletons ── */
const BookSkeleton = () => (
  <div className="flex flex-col gap-2 animate-pulse">
    <div className="aspect-[2/3] rounded bg-line" />
    <div className="h-3 w-3/4 rounded bg-line" />
    <div className="h-3 w-1/2 rounded bg-line" />
    <div className="h-3 w-1/3 rounded bg-line" />
    <div className="mt-auto h-9 w-full rounded bg-line" />
  </div>
);

const BookGridSkeleton = ({ count = 5 }: { count?: number }) => (
  <div className="grid grid-cols-5 gap-6">
    {Array.from({ length: count }, (_, i) => (
      <BookSkeleton key={i} />
    ))}
  </div>
);

/* ── CategoryRow skeleton ── */
const CatSkeleton = () => (
  <div className="flex animate-pulse items-center justify-between border-b border-line py-6 px-1">
    <div className="flex items-baseline gap-6">
      <div className="h-3 w-6 rounded bg-line" />
      <div className="h-6 w-40 rounded bg-line" />
    </div>
    <div className="h-3 w-24 rounded bg-line" />
  </div>
);

/* ── Prev / Next arrow SVGs ── */
const IconLeft = () => (
  <svg
    width="13"
    height="13"
    stroke="currentColor"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M15 18l-6-6 6-6" />
  </svg>
);
const IconRight = () => (
  <svg
    width="13"
    height="13"
    stroke="currentColor"
    strokeWidth="1.5"
    viewBox="0 0 24 24"
    fill="none"
    strokeLinecap="round"
    aria-hidden="true"
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
);

/* ─────────────────────────────────────────── */
/*  HomePage component                         */
/* ─────────────────────────────────────────── */
export const HomePage = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useGetHomeQuery();

  /* ── Hero state ── */
  const [heroIdx, setHeroIdx] = useState(0);
  const heroTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const resetHeroTimer = useCallback(() => {
    if (heroTimerRef.current) clearInterval(heroTimerRef.current);
    heroTimerRef.current = setInterval(() => {
      setHeroIdx((i) => (i + 1) % HERO_SLIDES.length);
    }, 5000);
  }, []);

  useEffect(() => {
    resetHeroTimer();
    return () => {
      if (heroTimerRef.current) clearInterval(heroTimerRef.current);
    };
  }, [resetHeroTimer]);

  const goHero = (i: number) => {
    setHeroIdx(i);
    resetHeroTimer();
  };
  const stepHero = (d: -1 | 1) => {
    setHeroIdx((i) => (i + d + HERO_SLIDES.length) % HERO_SLIDES.length);
    resetHeroTimer();
  };

  /* ── Bestseller page state ── */
  const [bsPage, setBsPage] = useState(0);
  const bestsellers = data?.bestsellers ?? [];
  const bsPageSize = 5;
  const bsMaxPage = Math.max(0, Math.ceil(bestsellers.length / bsPageSize) - 1);
  const bsSlice = bestsellers.slice(bsPage * bsPageSize, (bsPage + 1) * bsPageSize);

  /* ── Scroll reveal ── */
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );
    document.querySelectorAll<HTMLElement>('.reveal').forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  });

  /* ── Data ── */
  const newReleases = data?.newReleases?.slice(0, 5) ?? [];
  const featured = data?.featured?.slice(0, 5) ?? [];
  const categories: HomeCategory[] = data?.categories?.slice(0, 6) ?? [];

  const slide = HERO_SLIDES[heroIdx];

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />

      {/* ── HERO ── */}
      <section className="pb-24 pt-[104px]">
        <div className="mx-auto max-w-container px-10">
          <div
            className="text-[11px] font-medium uppercase tracking-[3px] text-accent"
            style={{ animation: 'rise 0.7s cubic-bezier(.22,.61,.36,1) 0.1s both' }}
          >
            {slide.eyebrow}
          </div>

          {/* Slide content */}
          <div className="relative mt-[30px]">
            {HERO_SLIDES.map((s, i) => (
              <div
                key={i}
                className={`transition-opacity duration-[600ms] ${
                  i === heroIdx
                    ? 'relative opacity-100 visible'
                    : 'absolute inset-0 opacity-0 invisible'
                }`}
                aria-hidden={i !== heroIdx}
              >
                <h1 className="mb-8 max-w-[740px] text-[68px] font-semibold leading-[1.05] tracking-[-2.2px] text-ink">
                  {s.title}
                </h1>
                <p className="mb-10 max-w-[460px] text-[16px] leading-[1.7] text-ink-2">
                  {s.desc}
                </p>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    className="inline-flex h-12 items-center justify-center rounded bg-ink px-7 text-[14px] font-medium text-paper transition-opacity duration-[200ms] hover:opacity-[0.85]"
                    onClick={() => navigate(s.primaryTo)}
                  >
                    {s.primaryLabel}
                  </button>
                  <Link
                    to={s.ghostTo}
                    className="inline-flex h-12 items-center rounded border border-line px-6 text-[14px] font-medium text-ink transition-[border-color] duration-[250ms] hover:border-ink"
                  >
                    {s.ghostLabel}
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Pager */}
          <div className="mt-16 flex items-center gap-5">
            <div className="flex gap-2" role="tablist" aria-label="Hero slides">
              {HERO_SLIDES.map((_, i) => (
                <button
                  key={i}
                  role="tab"
                  aria-selected={i === heroIdx}
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => goHero(i)}
                  className={`h-0.5 w-7 cursor-pointer transition-colors duration-[300ms] ${
                    i === heroIdx ? 'bg-ink' : 'bg-line'
                  }`}
                />
              ))}
            </div>
            <span className="text-[12px] tabular-nums tracking-[1px] text-ink-3">
              {String(heroIdx + 1).padStart(2, '0')} / {String(HERO_SLIDES.length).padStart(2, '0')}
            </span>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                aria-label="Slide trước"
                onClick={() => stepHero(-1)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink-2 transition-[border-color,color] duration-[200ms] hover:border-ink hover:text-ink"
              >
                <IconLeft />
              </button>
              <button
                type="button"
                aria-label="Slide tiếp theo"
                onClick={() => stepHero(1)}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line text-ink-2 transition-[border-color,color] duration-[200ms] hover:border-ink hover:text-ink"
              >
                <IconRight />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── SÁCH MỚI RA MẮT ── */}
      <section className="border-t border-line py-20">
        <div className="mx-auto max-w-container px-10">
          <div className="reveal mb-11 flex items-baseline justify-between">
            <span className="text-[13px] font-medium uppercase tracking-[2px] text-ink">
              Sách mới ra mắt
            </span>
            <Link
              to="/books?sort=newest"
              className="text-[12px] tracking-[0.5px] text-ink-2 transition-colors duration-[200ms] hover:text-ink"
            >
              Xem tất cả →
            </Link>
          </div>

          {isLoading ? (
            <BookGridSkeleton />
          ) : newReleases.length === 0 ? (
            <p className="text-[13px] text-ink-3">Chưa có dữ liệu.</p>
          ) : (
            <div className="grid grid-cols-5 gap-6">
              {newReleases.map((book, i) => (
                <BookCard
                  key={book.id}
                  book={book}
                  className={`reveal d${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── SÁCH BÁN CHẠY ── */}
      <section className="border-t border-line py-20">
        <div className="mx-auto max-w-container px-10">
          <div className="reveal mb-11 flex items-baseline justify-between">
            <span className="text-[13px] font-medium uppercase tracking-[2px] text-ink">
              Sách bán chạy
            </span>
            <div className="flex items-center gap-4">
              <Link
                to="/books?sort=bestseller"
                className="text-[12px] tracking-[0.5px] text-ink-2 transition-colors duration-[200ms] hover:text-ink"
              >
                Bảng xếp hạng →
              </Link>
              <button
                type="button"
                aria-label="Trang trước"
                disabled={bsPage === 0}
                onClick={() => setBsPage((p) => p - 1)}
                className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-line text-ink-2 transition-[border-color,color] duration-[200ms] hover:border-ink hover:text-ink disabled:pointer-events-none disabled:opacity-35"
              >
                <IconLeft />
              </button>
              <button
                type="button"
                aria-label="Trang tiếp theo"
                disabled={bsPage >= bsMaxPage}
                onClick={() => setBsPage((p) => p + 1)}
                className="flex h-[34px] w-[34px] items-center justify-center rounded-full border border-line text-ink-2 transition-[border-color,color] duration-[200ms] hover:border-ink hover:text-ink disabled:pointer-events-none disabled:opacity-35"
              >
                <IconRight />
              </button>
            </div>
          </div>

          {isLoading ? (
            <BookGridSkeleton />
          ) : bestsellers.length === 0 ? (
            <p className="text-[13px] text-ink-3">Chưa có dữ liệu.</p>
          ) : (
            <div className="grid grid-cols-5 gap-6">
              {bsSlice.map((book, i) => (
                <BookCard
                  key={book.id}
                  book={book}
                  rank={bsPage * bsPageSize + i + 1}
                  className={`reveal d${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── E-BOOK NỔI BẬT ── */}
      <section className="border-t border-line py-20">
        <div className="mx-auto max-w-container px-10">
          <div className="reveal mb-11 flex items-baseline justify-between">
            <span className="text-[13px] font-medium uppercase tracking-[2px] text-ink">
              E-book nổi bật
            </span>
            <Link
              to="/books?type=ebook"
              className="text-[12px] tracking-[0.5px] text-ink-2 transition-colors duration-[200ms] hover:text-ink"
            >
              Xem tất cả →
            </Link>
          </div>

          {isLoading ? (
            <BookGridSkeleton />
          ) : featured.length === 0 ? (
            <p className="text-[13px] text-ink-3">Chưa có dữ liệu.</p>
          ) : (
            <div className="grid grid-cols-5 gap-6">
              {featured.map((book, i) => (
                <BookCard
                  key={book.id}
                  book={book}
                  className={`reveal d${i + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── KHÁM PHÁ THEO DANH MỤC ── */}
      <section className="border-t border-line py-20">
        <div className="mx-auto max-w-container px-10">
          <div className="reveal mb-11 flex items-baseline justify-between">
            <span className="text-[13px] font-medium uppercase tracking-[2px] text-ink">
              Khám phá theo danh mục
            </span>
          </div>

          <div className="border-t border-line">
            {isLoading ? (
              Array.from({ length: 6 }, (_, i) => <CatSkeleton key={i} />)
            ) : categories.length === 0 ? (
              <p className="py-6 text-[13px] text-ink-3">Chưa có dữ liệu.</p>
            ) : (
              categories.map((cat, i) => (
                <Link
                  key={cat.id}
                  to={`/books?category=${cat.slug}`}
                  className={`reveal d${Math.min(i + 1, 5)} group flex items-baseline justify-between border-b border-line px-1 py-[26px] transition-[padding-left] duration-[300ms] hover:pl-[14px]`}
                >
                  <div className="flex items-baseline gap-6">
                    <span className="w-7 text-[12px] tabular-nums text-ink-3">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-[24px] font-medium tracking-[-0.5px] text-ink">
                      {cat.name}
                    </span>
                  </div>
                  <div className="flex items-baseline gap-8">
                    <span className="text-[12px] tracking-[0.3px] text-ink-3">
                      {cat.bookCount.toLocaleString('vi-VN')} đầu sách
                    </span>
                    <span className="text-[16px] text-ink-3 transition-[transform,color] duration-[300ms] group-hover:translate-x-1.5 group-hover:text-ink">
                      →
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>

      <SiteFooter />

      {/* Keyframe for hero eyebrow rise animation */}
      <style>{`
        @keyframes rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .reveal { opacity: 0; transform: translateY(14px); transition: opacity .55s cubic-bezier(.22,.61,.36,1), transform .55s cubic-bezier(.22,.61,.36,1); }
        .reveal.in { opacity: 1; transform: translateY(0); }
        .d1 { transition-delay: .04s; } .d2 { transition-delay: .08s; } .d3 { transition-delay: .12s; }
        .d4 { transition-delay: .16s; } .d5 { transition-delay: .20s; }
      `}</style>
    </div>
  );
};
