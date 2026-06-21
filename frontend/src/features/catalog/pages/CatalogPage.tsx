import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { SiteHeader, SiteFooter, BookCard } from '../../../shared/ui';
import {
  useGetBooksQuery,
  useGetCategoriesQuery,
  useGetFiltersQuery,
} from '../catalogApi';
import type { BookCard as BookCardDTO, SortOption } from '../types';
import { formatVND } from '../../../shared/format';

/* ─────────────────────────────────────────── */
/*  Chevron SVG                                */
/* ─────────────────────────────────────────── */
const ChevronDown = ({ open }: { open: boolean }) => (
  <svg
    width="12"
    height="7"
    viewBox="0 0 12 7"
    fill="none"
    aria-hidden="true"
    className={`text-ink-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
  >
    <path
      d="M1 1l5 5 5-5"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* ─────────────────────────────────────────── */
/*  Filter accordion                           */
/* ─────────────────────────────────────────── */
interface AccordionProps {
  label: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const FilterAccordion = ({ label, defaultOpen = true, children }: AccordionProps) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line last:border-b-0">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between bg-transparent px-5 py-4 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="text-[12px] font-medium uppercase tracking-[0.5px] text-ink">
          {label}
        </span>
        <ChevronDown open={open} />
      </button>
      {open && <div className="px-5 pb-4 pt-1">{children}</div>}
    </div>
  );
};

/* ─────────────────────────────────────────── */
/*  Staged filter state                        */
/* ─────────────────────────────────────────── */
interface StagedFilters {
  formats: ('PDF' | 'EPUB')[];
  categories: string[];
  priceMin: string;
  priceMax: string;
  rating: number | null;
  authors: string[];
  publishers: string[];
}

const DEFAULT_STAGED: StagedFilters = {
  formats: [],
  categories: [],
  priceMin: '',
  priceMax: '',
  rating: null,
  authors: [],
  publishers: [],
};

/* ─────────────────────────────────────────── */
/*  Parse URL params into staged state          */
/* ─────────────────────────────────────────── */
function paramsToStaged(sp: URLSearchParams): StagedFilters {
  const getAll = (key: string) =>
    sp.getAll(key).flatMap((v) => v.split(',').filter(Boolean));
  const formats = getAll('format').filter(
    (f): f is 'PDF' | 'EPUB' => f === 'PDF' || f === 'EPUB',
  );
  return {
    formats,
    categories: getAll('category'),
    priceMin: sp.get('priceMin') ?? '',
    priceMax: sp.get('priceMax') ?? '',
    rating: sp.get('rating') ? Number(sp.get('rating')) : null,
    authors: getAll('author'),
    publishers: getAll('publisher'),
  };
}

/* ─────────────────────────────────────────── */
/*  Chip definitions from committed filters    */
/* ─────────────────────────────────────────── */
interface Chip {
  key: string;
  label: string;
  onRemove: () => void;
}

/* ─────────────────────────────────────────── */
/*  Empty state                                */
/* ─────────────────────────────────────────── */
const EmptyState = ({ onClear }: { onClear: () => void }) => (
  <div className="flex flex-col items-center px-10 py-20 text-center">
    <svg
      className="mb-6 text-ink-3"
      width="48"
      height="48"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.35-4.35" />
      <path d="M8 11h6M11 8v6" strokeWidth="1" opacity="0.5" />
    </svg>
    <p className="mb-2 text-[18px] font-medium text-ink">Không tìm thấy kết quả</p>
    <p className="mb-6 max-w-[360px] text-[14px] leading-[1.7] text-ink-2">
      Không có sách nào khớp với bộ lọc hiện tại. Hãy thử thay đổi hoặc xóa bộ lọc.
    </p>
    <button
      type="button"
      onClick={onClear}
      className="inline-flex h-[38px] items-center rounded border border-line px-6 text-[12px] font-medium uppercase tracking-[0.5px] text-ink transition-[border-color] duration-200 hover:border-ink"
    >
      Xóa bộ lọc
    </button>
  </div>
);

/* ─────────────────────────────────────────── */
/*  CatalogPage                                */
/* ─────────────────────────────────────────── */
export const CatalogPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  /* ── URL-derived "committed" state ── */
  const q = searchParams.get('q') ?? '';
  const sort = (searchParams.get('sort') as SortOption) || 'relevant';

  /* ── Accumulated books + current page ── */
  const [books, setBooks] = useState<BookCardDTO[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  /* ── Staged (in-sidebar, not yet applied) ── */
  const [staged, setStaged] = useState<StagedFilters>(() =>
    paramsToStaged(searchParams),
  );
  /* ── Committed (applied to URL / API) ── */
  const [committed, setCommitted] = useState<StagedFilters>(() =>
    paramsToStaged(searchParams),
  );

  /* ── Mobile sidebar drawer ── */
  const [sidebarOpen, setSidebarOpen] = useState(false);

  /* ── Author/publisher search in sidebar ── */
  const [authorSearch, setAuthorSearch] = useState('');
  const [publisherSearch, setPublisherSearch] = useState('');

  /* ── API calls ── */
  const { data: categoriesData } = useGetCategoriesQuery();
  const { data: filtersData } = useGetFiltersQuery();

  /* Build API params for current page fetch */
  const apiParams = {
    q: q || undefined,
    format: committed.formats.length
      ? (committed.formats as ('PDF' | 'EPUB')[])
      : undefined,
    category: committed.categories.length
      ? committed.categories[0]
      : undefined,
    priceMin: committed.priceMin ? Number(committed.priceMin) : undefined,
    priceMax: committed.priceMax ? Number(committed.priceMax) : undefined,
    rating: committed.rating ?? undefined,
    author: committed.authors.length ? committed.authors : undefined,
    publisher: committed.publishers.length ? committed.publishers : undefined,
    sort: sort !== 'relevant' ? sort : undefined,
    page: currentPage,
    limit: 20,
  };

  const { data: pageData, isFetching } = useGetBooksQuery(apiParams);

  /* ── Reset accumulator on filter/sort/q change ── */
  // We track a "filter key" that changes whenever committed+sort+q change
  const filterKeyRef = useRef(0);
  const prevCommittedRef = useRef(committed);
  const prevSortRef = useRef(sort);
  const prevQRef = useRef(q);

  useEffect(() => {
    const filterChanged =
      prevCommittedRef.current !== committed ||
      prevSortRef.current !== sort ||
      prevQRef.current !== q;

    if (filterChanged) {
      filterKeyRef.current += 1;
      setBooks([]);
      setCurrentPage(1);
      setHasMore(true);
      prevCommittedRef.current = committed;
      prevSortRef.current = sort;
      prevQRef.current = q;
    }
  }, [committed, sort, q]);

  /* ── Accumulate books when page data arrives ── */
  useEffect(() => {
    if (!pageData) return;
    const newBooks = pageData.books ?? [];
    const pagination = pageData.pagination;
    setTotalCount(pagination.total);

    if (currentPage === 1) {
      setBooks(newBooks);
    } else {
      setBooks((prev) => {
        const existingIds = new Set(prev.map((b) => b.id));
        const deduped = newBooks.filter((b) => !existingIds.has(b.id));
        return [...prev, ...deduped];
      });
    }

    const loaded = currentPage * (pagination.limit || 20);
    setHasMore(loaded < pagination.total && currentPage < pagination.totalPages);
  }, [pageData, currentPage]);

  /* ── Lazy load sentinel ── */
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  const loadNext = useCallback(() => {
    if (!isFetching && hasMore) {
      setCurrentPage((p) => p + 1);
    }
  }, [isFetching, hasMore]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadNext();
      },
      { rootMargin: '200px' },
    );
    if (sentinelRef.current) observerRef.current.observe(sentinelRef.current);
    return () => observerRef.current?.disconnect();
  }, [loadNext]);

  /* ── Apply filters ── */
  const applyFilters = () => {
    setCommitted({ ...staged });
    // Update URL — reset page to 1
    const params: Record<string, string | string[]> = {};
    if (q) params.q = q;
    if (staged.formats.length) params.format = staged.formats;
    if (staged.categories.length) params.category = staged.categories;
    if (staged.priceMin) params.priceMin = staged.priceMin;
    if (staged.priceMax) params.priceMax = staged.priceMax;
    if (staged.rating != null) params.rating = String(staged.rating);
    if (staged.authors.length) params.author = staged.authors;
    if (staged.publishers.length) params.publisher = staged.publishers;
    if (sort && sort !== 'relevant') params.sort = sort;
    setSearchParams(params);
    setSidebarOpen(false);
  };

  /* ── Clear all filters ── */
  const clearAll = () => {
    const empty = { ...DEFAULT_STAGED };
    setStaged(empty);
    setCommitted(empty);
    const params: Record<string, string> = {};
    if (q) params.q = q;
    if (sort && sort !== 'relevant') params.sort = sort;
    setSearchParams(params);
  };

  /* ── Sort change (immediate refetch) ── */
  const handleSortChange = (newSort: SortOption) => {
    const params: Record<string, string | string[]> = {};
    if (q) params.q = q;
    if (committed.formats.length) params.format = committed.formats;
    if (committed.categories.length) params.category = committed.categories;
    if (committed.priceMin) params.priceMin = committed.priceMin;
    if (committed.priceMax) params.priceMax = committed.priceMax;
    if (committed.rating != null) params.rating = String(committed.rating);
    if (committed.authors.length) params.author = committed.authors;
    if (committed.publishers.length) params.publisher = committed.publishers;
    if (newSort && newSort !== 'relevant') params.sort = newSort;
    setSearchParams(params);
  };

  /* ── Remove a chip (immediate) ── */
  const removeChip = (update: Partial<StagedFilters>) => {
    const next = { ...committed, ...update };
    setCommitted(next);
    setStaged(next);
    const params: Record<string, string | string[]> = {};
    if (q) params.q = q;
    if (next.formats.length) params.format = next.formats;
    if (next.categories.length) params.category = next.categories;
    if (next.priceMin) params.priceMin = next.priceMin;
    if (next.priceMax) params.priceMax = next.priceMax;
    if (next.rating != null) params.rating = String(next.rating);
    if (next.authors.length) params.author = next.authors;
    if (next.publishers.length) params.publisher = next.publishers;
    if (sort && sort !== 'relevant') params.sort = sort;
    setSearchParams(params);
  };

  /* ── Build chips array ── */
  const chips: Chip[] = [];
  committed.formats.forEach((f) =>
    chips.push({
      key: `format:${f}`,
      label: f,
      onRemove: () =>
        removeChip({ formats: committed.formats.filter((x) => x !== f) }),
    }),
  );
  committed.categories.forEach((catSlug) => {
    const cat = categoriesData?.find((c) => c.slug === catSlug);
    chips.push({
      key: `category:${catSlug}`,
      label: cat?.name ?? catSlug,
      onRemove: () =>
        removeChip({
          categories: committed.categories.filter((x) => x !== catSlug),
        }),
    });
  });
  if (committed.rating != null) {
    chips.push({
      key: 'rating',
      label: `≥ ${committed.rating}★`,
      onRemove: () => removeChip({ rating: null }),
    });
  }
  if (committed.priceMin || committed.priceMax) {
    const minLabel = committed.priceMin
      ? formatVND(Number(committed.priceMin))
      : '0đ';
    const maxLabel = committed.priceMax
      ? formatVND(Number(committed.priceMax))
      : '∞';
    chips.push({
      key: 'price',
      label: `${minLabel} — ${maxLabel}`,
      onRemove: () => removeChip({ priceMin: '', priceMax: '' }),
    });
  }
  committed.authors.forEach((a) =>
    chips.push({
      key: `author:${a}`,
      label: filtersData?.authors.find((x) => x.slug === a)?.name ?? a,
      onRemove: () =>
        removeChip({ authors: committed.authors.filter((x) => x !== a) }),
    }),
  );
  committed.publishers.forEach((p) =>
    chips.push({
      key: `publisher:${p}`,
      label: filtersData?.publishers.find((x) => x.slug === p)?.name ?? p,
      onRemove: () =>
        removeChip({
          publishers: committed.publishers.filter((x) => x !== p),
        }),
    }),
  );

  const hasActiveFilters =
    committed.formats.length > 0 ||
    committed.categories.length > 0 ||
    committed.rating != null ||
    !!committed.priceMin ||
    !!committed.priceMax ||
    committed.authors.length > 0 ||
    committed.publishers.length > 0;

  /* ── Helpers for staged toggles ── */
  const toggleFormat = (fmt: 'PDF' | 'EPUB') => {
    setStaged((s) => ({
      ...s,
      formats: s.formats.includes(fmt)
        ? s.formats.filter((f) => f !== fmt)
        : [...s.formats, fmt],
    }));
  };
  const toggleCategory = (slug: string) => {
    setStaged((s) => ({
      ...s,
      categories: s.categories.includes(slug)
        ? s.categories.filter((c) => c !== slug)
        : [...s.categories, slug],
    }));
  };
  const toggleAuthor = (slug: string) => {
    setStaged((s) => ({
      ...s,
      authors: s.authors.includes(slug)
        ? s.authors.filter((a) => a !== slug)
        : [...s.authors, slug],
    }));
  };
  const togglePublisher = (slug: string) => {
    setStaged((s) => ({
      ...s,
      publishers: s.publishers.includes(slug)
        ? s.publishers.filter((p) => p !== slug)
        : [...s.publishers, slug],
    }));
  };

  /* ── Filtered author/publisher lists for sidebar search ── */
  const visibleAuthors = (filtersData?.authors ?? []).filter((a) =>
    a.name.toLowerCase().includes(authorSearch.toLowerCase()),
  );
  const visiblePublishers = (filtersData?.publishers ?? []).filter((p) =>
    p.name.toLowerCase().includes(publisherSearch.toLowerCase()),
  );

  /* ─────────────────────────────────────────── */
  /*  Sidebar JSX (shared desktop + drawer)      */
  /* ─────────────────────────────────────────── */
  const sidebarContent = (
    <div className="rounded border border-line bg-surface overflow-clip">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-line px-5 py-[18px]">
        <span className="text-[13px] font-medium uppercase tracking-[2px] text-ink">
          Bộ lọc
        </span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearAll}
            className="bg-transparent border-none p-0 text-[11px] font-medium uppercase tracking-[0.5px] text-[#B43A3A] cursor-pointer"
          >
            Xóa tất cả
          </button>
        )}
      </div>

      {/* 1. Định dạng */}
      <FilterAccordion label="Định dạng">
        {(['PDF', 'EPUB'] as const).map((fmt) => (
          <label key={fmt} className="flex cursor-pointer items-center gap-2.5 py-[7px]">
            <input
              type="checkbox"
              className="h-[15px] w-[15px] flex-shrink-0 rounded-[2px] border border-line accent-ink"
              checked={staged.formats.includes(fmt)}
              onChange={() => toggleFormat(fmt)}
            />
            <span className="text-[13px] text-ink">{fmt}</span>
          </label>
        ))}
      </FilterAccordion>

      {/* 2. Danh mục */}
      <FilterAccordion label="Danh mục">
        {(categoriesData ?? []).slice(0, 8).map((cat) => (
          <label key={cat.id} className="flex cursor-pointer items-center gap-2.5 py-[7px]">
            <input
              type="checkbox"
              className="h-[15px] w-[15px] flex-shrink-0 rounded-[2px] border border-line accent-ink"
              checked={staged.categories.includes(cat.slug)}
              onChange={() => toggleCategory(cat.slug)}
            />
            <span className="text-[13px] text-ink">{cat.name}</span>
          </label>
        ))}
      </FilterAccordion>

      {/* 3. Khoảng giá */}
      <FilterAccordion label="Khoảng giá">
        <div className="flex flex-col gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="w-[26px] flex-shrink-0 text-[11px] font-medium uppercase tracking-[0.5px] text-ink-3">
              Từ
            </span>
            <input
              type="number"
              placeholder="0"
              value={staged.priceMin}
              onChange={(e) => setStaged((s) => ({ ...s, priceMin: e.target.value }))}
              className="min-w-0 flex-1 h-8 rounded-[2px] border border-line bg-paper px-2.5 text-[12px] font-[variant-numeric:tabular-nums] text-ink outline-none focus:border-ink-2"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="w-[26px] flex-shrink-0 text-[11px] font-medium uppercase tracking-[0.5px] text-ink-3">
              Đến
            </span>
            <input
              type="number"
              placeholder="∞"
              value={staged.priceMax}
              onChange={(e) => setStaged((s) => ({ ...s, priceMax: e.target.value }))}
              className="min-w-0 flex-1 h-8 rounded-[2px] border border-line bg-paper px-2.5 text-[12px] font-[variant-numeric:tabular-nums] text-ink outline-none focus:border-ink-2"
            />
          </div>
        </div>
      </FilterAccordion>

      {/* 4. Đánh giá */}
      <FilterAccordion label="Đánh giá">
        {[5, 4, 3, 2, 1].map((star) => (
          <label key={star} className="flex cursor-pointer items-center gap-2.5 py-[7px]">
            <input
              type="radio"
              name="rating"
              className="h-[14px] w-[14px] flex-shrink-0 accent-ink"
              checked={staged.rating === star}
              onChange={() => setStaged((s) => ({ ...s, rating: star }))}
            />
            <span className="text-star tracking-[1px]">{'★'.repeat(star)}</span>
            <span className="text-[12px] text-ink-2">trở lên</span>
          </label>
        ))}
      </FilterAccordion>

      {/* 5. Tác giả */}
      <FilterAccordion label="Tác giả" defaultOpen={false}>
        <div className="mb-2.5 flex h-8 items-center gap-2 rounded-[2px] border border-line bg-paper px-2.5">
          <svg
            width="12"
            height="12"
            stroke="#A8A8AE"
            strokeWidth="1.6"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Tìm tác giả..."
            value={authorSearch}
            onChange={(e) => setAuthorSearch(e.target.value)}
            className="w-full bg-transparent text-[12px] text-ink outline-none placeholder:text-ink-3"
          />
        </div>
        {visibleAuthors.slice(0, 8).map((a) => (
          <label key={a.slug} className="flex cursor-pointer items-center gap-2.5 py-[7px]">
            <input
              type="checkbox"
              className="h-[15px] w-[15px] flex-shrink-0 rounded-[2px] border border-line accent-ink"
              checked={staged.authors.includes(a.slug)}
              onChange={() => toggleAuthor(a.slug)}
            />
            <span className="text-[13px] text-ink">{a.name}</span>
          </label>
        ))}
      </FilterAccordion>

      {/* 6. Nhà xuất bản */}
      <FilterAccordion label="Nhà xuất bản" defaultOpen={false}>
        <div className="mb-2.5 flex h-8 items-center gap-2 rounded-[2px] border border-line bg-paper px-2.5">
          <svg
            width="12"
            height="12"
            stroke="#A8A8AE"
            strokeWidth="1.6"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Tìm nhà xuất bản..."
            value={publisherSearch}
            onChange={(e) => setPublisherSearch(e.target.value)}
            className="w-full bg-transparent text-[12px] text-ink outline-none placeholder:text-ink-3"
          />
        </div>
        {visiblePublishers.slice(0, 8).map((p) => (
          <label key={p.slug} className="flex cursor-pointer items-center gap-2.5 py-[7px]">
            <input
              type="checkbox"
              className="h-[15px] w-[15px] flex-shrink-0 rounded-[2px] border border-line accent-ink"
              checked={staged.publishers.includes(p.slug)}
              onChange={() => togglePublisher(p.slug)}
            />
            <span className="text-[13px] text-ink">{p.name}</span>
          </label>
        ))}
      </FilterAccordion>

      {/* Apply button */}
      <button
        type="button"
        onClick={applyFilters}
        className="mx-5 my-4 block w-[calc(100%-40px)] h-[38px] rounded-[2px] bg-ink text-[11px] font-semibold uppercase tracking-[1.5px] text-paper transition-opacity duration-150 hover:opacity-[0.85]"
      >
        Áp dụng bộ lọc
      </button>
    </div>
  );

  /* ─────────────────────────────────────────── */
  /*  Render                                     */
  /* ─────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader />

      {/* ── Breadcrumb ── */}
      <div className="border-b border-line pt-[72px]">
        <div className="mx-auto max-w-container px-10 py-[14px]">
          <nav className="flex items-center gap-2 text-[12px] text-ink-2">
            <Link to="/" className="text-ink-2 transition-colors hover:text-ink">
              Trang chủ
            </Link>
            <span className="text-ink-3">/</span>
            {q ? (
              <>
                <Link
                  to="/books"
                  className="text-ink-2 transition-colors hover:text-ink"
                >
                  Danh sách sách
                </Link>
                <span className="text-ink-3">/</span>
                <span className="font-medium text-ink">
                  Tìm kiếm: &ldquo;{q}&rdquo;
                </span>
              </>
            ) : (
              <span className="font-medium text-ink">Danh sách sách</span>
            )}
          </nav>
        </div>
      </div>

      {/* ── Page body ── */}
      <div className="mx-auto max-w-container px-10 py-10 pb-20">
        {/* Mobile filter toggle */}
        <div className="mb-4 flex items-center justify-between lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="flex h-9 items-center gap-2 rounded border border-line px-4 text-[12px] font-medium uppercase tracking-[0.5px] text-ink"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden="true"
            >
              <path d="M3 6h18M7 12h10M11 18h2" strokeLinecap="round" />
            </svg>
            Bộ lọc
          </button>
        </div>

        {/* Desktop layout: sidebar + product area */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[280px_1fr] lg:items-start">
          {/* ── Desktop sidebar ── */}
          <div className="hidden lg:block lg:sticky lg:top-[88px]">
            {sidebarContent}
          </div>

          {/* ── Product area ── */}
          <main>
            {/* Sort bar */}
            <div className="mb-5 flex items-center justify-between">
              <p className="text-[13px] text-ink-2">
                Hiển thị{' '}
                <strong className="font-semibold text-ink">
                  {totalCount.toLocaleString('vi-VN')}
                </strong>{' '}
                kết quả{q ? <> cho &ldquo;{q}&rdquo;</> : null}
              </p>
              <div className="flex items-center gap-3">
                <select
                  value={sort}
                  onChange={(e) => handleSortChange(e.target.value as SortOption)}
                  className="h-[34px] appearance-none rounded-[2px] border border-line bg-surface pl-3 pr-7 text-[12px] text-ink outline-none"
                  style={{
                    backgroundImage:
                      "url(\"data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23A8A8AE' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E\")",
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 10px center',
                  }}
                >
                  <option value="relevant">Liên quan nhất</option>
                  <option value="newest">Mới nhất</option>
                  <option value="bestselling">Bán chạy nhất</option>
                  <option value="price_asc">Giá: Thấp → Cao</option>
                  <option value="price_desc">Giá: Cao → Thấp</option>
                </select>
              </div>
            </div>

            {/* Active filter chips */}
            {chips.length > 0 && (
              <div className="mb-6 flex flex-wrap gap-2">
                {chips.map((chip) => (
                  <span
                    key={chip.key}
                    className="inline-flex h-[26px] items-center gap-1.5 rounded-[2px] border border-line bg-surface px-2.5 text-[11px] font-medium uppercase tracking-[0.5px] text-ink"
                  >
                    {chip.label}
                    <button
                      type="button"
                      onClick={chip.onRemove}
                      aria-label={`Xóa bộ lọc ${chip.label}`}
                      className="flex items-center bg-transparent border-none p-0 text-[13px] text-ink-3 leading-none cursor-pointer hover:text-ink"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isFetching && books.length === 0 && (
              <EmptyState onClear={clearAll} />
            )}

            {/* Book grid */}
            {books.length > 0 && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-4 lg:gap-y-6">
                {books.map((book) => (
                  <BookCard
                    key={book.id}
                    book={
                      q
                        ? {
                            ...book,
                            title: book.title, // highlight handled via wrapper
                          }
                        : book
                    }
                    highlightQuery={q || undefined}
                  />
                ))}
              </div>
            )}

            {/* Lazy load sentinel + loading indicator */}
            <div ref={sentinelRef} className="mt-12 flex flex-col items-center gap-3">
              {isFetching && books.length > 0 && (
                <div className="flex items-center gap-2 text-[12px] text-ink-3">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-line border-t-ink-2" />
                  Đang tải...
                </div>
              )}
              {!hasMore && books.length > 0 && (
                <p className="text-[12px] tabular-nums text-ink-3">
                  Đang hiển thị {books.length.toLocaleString('vi-VN')} /{' '}
                  {totalCount.toLocaleString('vi-VN')} kết quả
                </p>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* ── Mobile sidebar drawer ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[300] flex lg:hidden">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Đóng bộ lọc"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer */}
          <div className="relative ml-auto flex h-full w-[320px] flex-col overflow-y-auto bg-paper shadow-xl">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <span className="text-[13px] font-medium uppercase tracking-[2px] text-ink">
                Bộ lọc
              </span>
              <button
                type="button"
                onClick={() => setSidebarOpen(false)}
                className="text-[20px] text-ink-3 hover:text-ink"
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">{sidebarContent}</div>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
};
