// Màn E-book của tôi — Screen 15, route /user/ebooks
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { AccountShell } from '../../profile/components/AccountShell';
import { useGetMeQuery } from '../../auth/authApi';
import { useGetMyEbooksQuery, useRequestDownloadMutation } from '../libraryApi';
import { useToast } from '../../../shared/hooks/useToast';
import { formatBytes } from '../../../shared/format';
import type { Ebook } from '../types';

// ── Helper: định dạng ISO date → DD/MM/YYYY ──
function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// ── Badge định dạng file — PDF → warning, EPUB → info (token Tailwind v2.0) ──
const FormatBadge = ({ format }: { format: string }) => {
  const upper = format.toUpperCase();
  let cls = 'bg-surface text-ink-2';
  if (upper === 'PDF') cls = 'bg-warning-bg text-warning-fg';
  else if (upper === 'EPUB') cls = 'bg-info-bg text-info-fg';
  return (
    <span
      className={`inline-block rounded-[2px] px-1.5 py-0.5 text-[10px] font-semibold leading-none ${cls}`}
    >
      {upper}
    </span>
  );
};

// ── Skeleton card khi đang tải ──
const EbookSkeleton = () => (
  <div className="animate-pulse">
    <div className="aspect-[2/3] rounded-[2px] bg-line mb-3" />
    <div className="h-3 bg-line rounded mb-2 w-3/4" />
    <div className="h-3 bg-line rounded mb-3 w-1/2" />
    <div className="h-8 bg-line rounded" />
  </div>
);

// ── Card e-book ──
const EbookCard = ({
  ebook,
  onDownload,
  isDownloading,
}: {
  ebook: Ebook;
  onDownload: (bookId: number) => void;
  isDownloading: boolean;
}) => {
  const upper = ebook.fileFormat.toUpperCase();

  return (
    <div className="flex flex-col">
      {/* Cover tile */}
      <div className="relative aspect-[2/3] rounded-[2px] overflow-hidden bg-cover-bg border border-line mb-3">
        {ebook.coverImageUrl ? (
          <img
            src={ebook.coverImageUrl}
            alt={ebook.title}
            className="w-full h-full object-cover"
          />
        ) : (
          // Fallback cover dạng giấy khi không có ảnh
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-cover-bg">
            <p className="text-center text-ink font-semibold text-sm leading-snug line-clamp-3 mb-2">
              {ebook.title}
            </p>
            {ebook.author && (
              <p className="text-center text-ink-3 text-[11px] uppercase tracking-wide line-clamp-2">
                {ebook.author}
              </p>
            )}
          </div>
        )}
        {/* Badge định dạng góc trên phải */}
        <div className="absolute top-2 right-2">
          <FormatBadge format={upper} />
        </div>
      </div>

      {/* Tiêu đề + tác giả */}
      <p className="text-[13px] font-semibold text-ink line-clamp-2 mb-0.5 leading-snug">
        {ebook.title}
      </p>
      {ebook.author && (
        <p className="text-[12px] text-ink-3 mb-2 line-clamp-1">{ebook.author}</p>
      )}

      {/* Meta row: format tag + dung lượng (không lặp format 2 lần) */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <FormatBadge format={upper} />
        <span className="text-[11px] text-ink-3">{formatBytes(ebook.fileSizeBytes)}</span>
      </div>

      {/* Ngày mua */}
      <p className="text-[11px] text-ink-3 mb-3">Mua: {formatDate(ebook.grantedAt)}</p>

      {/* Nút tải xuống */}
      <button
        type="button"
        onClick={() => onDownload(ebook.bookId)}
        disabled={isDownloading}
        className="mt-auto w-full h-9 rounded-[2px] bg-ink text-paper text-[11px] font-semibold uppercase tracking-[1px] transition-opacity duration-200 hover:opacity-[0.85] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isDownloading ? 'Đang tải...' : 'Tải xuống'}
      </button>
    </div>
  );
};

// ── Icon sách mở cho empty state ──
const OpenBookIcon = () => (
  <svg
    className="mb-5 text-line"
    width="64"
    height="64"
    viewBox="0 0 64 64"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="8" y="12" width="20" height="40" rx="3" />
    <rect x="36" y="12" width="20" height="40" rx="3" />
    <path d="M28 32 L32 36 L36 32" />
    <line x1="8" y1="32" x2="28" y2="32" />
    <line x1="36" y1="32" x2="56" y2="32" />
  </svg>
);

/* ─────────────────────────────────────────────────────── */
/*  MyEbooksPage                                           */
/*  Route: /user/ebooks (role 'user')                      */
/* ─────────────────────────────────────────────────────── */
export default function MyEbooksPage() {
  const { data: me } = useGetMeQuery();
  const { show, ToastLayer } = useToast();

  // Phân trang server-side
  const [page, setPage] = useState(1);
  const LIMIT = 12;

  // Trạng thái search + sort (client-side)
  const [searchQuery, setSearchQuery] = useState('');
  const [sortKey, setSortKey] = useState<'name' | 'date' | 'format'>('date');

  const { data, isLoading } = useGetMyEbooksQuery({ page, limit: LIMIT });

  // Download mutation — theo dõi per-card bookId
  const [requestDownload] = useRequestDownloadMutation();
  const [downloadingIds, setDownloadingIds] = useState<Set<number>>(new Set());

  const ebooks = data?.ebooks ?? [];
  const pagination = data?.pagination ?? { page: 1, limit: LIMIT, total: 0, totalPages: 0 };

  // Lọc + sắp xếp client-side trên trang hiện tại
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = q
      ? ebooks.filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            (e.author ?? '').toLowerCase().includes(q),
        )
      : [...ebooks];

    if (sortKey === 'name') {
      list.sort((a, b) => a.title.localeCompare(b.title, 'vi'));
    } else if (sortKey === 'date') {
      list.sort(
        (a, b) => new Date(b.grantedAt).getTime() - new Date(a.grantedAt).getTime(),
      );
    } else {
      // format
      list.sort((a, b) => a.fileFormat.localeCompare(b.fileFormat));
    }

    return list;
  }, [ebooks, searchQuery, sortKey]);

  // Kích hoạt tải file qua signed URL
  const handleDownload = async (bookId: number) => {
    setDownloadingIds((prev) => new Set(prev).add(bookId));
    try {
      const result = await requestDownload(bookId).unwrap();
      // Dùng window.location.assign để trình duyệt tải file đính kèm
      window.location.assign(result.url);
      show('Đang tải xuống e-book...');
    } catch (err: unknown) {
      const msg =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: string }).message)
          : 'Tải xuống thất bại. Vui lòng thử lại.';
      show(msg);
    } finally {
      setDownloadingIds((prev) => {
        const next = new Set(prev);
        next.delete(bookId);
        return next;
      });
    }
  };

  const userData = me ? { fullName: me.fullName, email: me.email } : null;

  return (
    <AccountShell
      breadcrumbLabel="E-book của tôi"
      activeNav="/user/ebooks"
      userData={userData}
    >
      <ToastLayer />

      {/* ── Content header ── */}
      <div className="px-7 pt-6 pb-5 border-b border-line">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-[18px] font-semibold tracking-[-0.3px] text-ink">
            E-book của tôi{' '}
            {!isLoading && (
              <span className="text-ink-3 font-normal text-[15px]">
                ({pagination.total} cuốn)
              </span>
            )}
          </h1>

          {/* Toolbar: search + sort */}
          <div className="flex items-center gap-2">
            <input
              type="search"
              placeholder="Tìm trong thư viện..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="h-8 w-44 rounded-[2px] border border-line bg-surface px-3 text-[12px] text-ink placeholder:text-ink-3 focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as 'name' | 'date' | 'format')}
              className="h-8 rounded-[2px] border border-line bg-surface px-2 text-[12px] text-ink focus:outline-none focus:ring-1 focus:ring-accent"
            >
              <option value="name">Tên A→Z</option>
              <option value="date">Ngày mua</option>
              <option value="format">Định dạng</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── Content body ── */}
      <div className="p-7">
        {isLoading ? (
          // Skeleton grid khi đang tải
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6">
            {Array.from({ length: LIMIT }).map((_, i) => (
              <EbookSkeleton key={i} />
            ))}
          </div>
        ) : ebooks.length === 0 ? (
          // Empty state thật — người dùng chưa sở hữu e-book nào
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <OpenBookIcon />
            <p className="text-[20px] font-semibold tracking-[-0.3px] text-ink mb-2">
              Bạn chưa có E-book nào
            </p>
            <p className="text-[14px] leading-[1.7] text-ink-2 mb-7 max-w-[300px]">
              Mua E-book để bắt đầu xây dựng thư viện
            </p>
            <Link
              to="/books"
              className="inline-flex h-10 items-center rounded-[2px] bg-ink px-6 text-[12px] font-semibold uppercase tracking-[1.5px] text-paper transition-opacity duration-200 hover:opacity-[0.85]"
            >
              Khám phá E-book →
            </Link>
          </div>
        ) : filtered.length === 0 ? (
          // Có e-book nhưng từ khóa tìm kiếm không khớp item nào trên trang này
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <OpenBookIcon />
            <p className="text-[16px] font-semibold tracking-[-0.3px] text-ink mb-2">
              Không tìm thấy E-book phù hợp
            </p>
            <p className="text-[14px] leading-[1.7] text-ink-2 max-w-[320px]">
              Không có kết quả cho “{searchQuery.trim()}” trên trang này. Thử từ khóa khác.
            </p>
          </div>
        ) : (
          <>
            {/* Grid e-book */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-6">
              {filtered.map((ebook) => (
                <EbookCard
                  key={ebook.bookId}
                  ebook={ebook}
                  onDownload={handleDownload}
                  isDownloading={downloadingIds.has(ebook.bookId)}
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
