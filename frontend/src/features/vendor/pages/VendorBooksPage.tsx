import { useState, useCallback, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { VendorShell } from '../components/VendorShell';
import {
  useGetVendorBooksQuery,
  useDeleteVendorBookMutation,
  useChangeVendorBookStatusMutation,
} from '../vendorBooksApi';
import { formatVND } from '../../../shared/format';
import type { VendorBookRow, VendorBookStatus } from '../types';

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

// ── Status pill ───────────────────────────────────────────────────────────────
const StatusPill = ({ status }: { status: VendorBookStatus }) => {
  const styles: Record<VendorBookStatus, React.CSSProperties> = {
    published: { color: '#2E7D4F', background: '#ECF6EE' },
    draft:     { color: '#A8A8AE', background: '#F4F3F0' },
    hidden:    { color: '#A8A8AE', background: '#F4F3F0' },
  };
  const labels: Record<VendorBookStatus, string> = {
    published: 'Công khai',
    draft:     'Nháp',
    hidden:    'Ẩn',
  };
  return (
    <span
      style={{
        fontSize: '9px',
        fontWeight: 600,
        letterSpacing: '.8px',
        textTransform: 'uppercase',
        padding: '2px 7px',
        borderRadius: '2px',
        ...styles[status],
      }}
    >
      {labels[status]}
    </span>
  );
};

// ── Confirm dialog ────────────────────────────────────────────────────────────
interface ConfirmDialogProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}
const ConfirmDialog = ({ title, message, onConfirm, onCancel }: ConfirmDialogProps) => (
  <div
    role="dialog"
    aria-modal="true"
    aria-label={title}
    style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(22,22,26,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
  >
    <div
      style={{
        background: '#FFFFFF', borderRadius: '4px', padding: '28px 28px 24px',
        maxWidth: '420px', width: '90%', border: '1px solid #ECEAE5',
      }}
    >
      <h2 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '10px' }}>{title}</h2>
      <p style={{ fontSize: '13px', color: '#6B6B73', marginBottom: '22px', lineHeight: 1.6 }}>{message}</p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        <button
          onClick={onCancel}
          style={{
            height: '32px', padding: '0 14px', background: 'none', color: '#16161A',
            fontSize: '11px', fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase',
            border: '1px solid #ECEAE5', borderRadius: '2px', cursor: 'pointer',
          }}
        >
          Hủy
        </button>
        <button
          onClick={onConfirm}
          style={{
            height: '32px', padding: '0 14px', background: '#B43A3A', color: '#FFFFFF',
            fontSize: '11px', fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase',
            border: 'none', borderRadius: '2px', cursor: 'pointer',
          }}
        >
          Xóa
        </button>
      </div>
    </div>
  </div>
);

// ── Main page ─────────────────────────────────────────────────────────────────
export const VendorBooksPage = () => {
  const [page, setPage]               = useState(1);
  const [limit, setLimit]             = useState(10);
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<VendorBookStatus | ''>('');
  const [selected, setSelected]       = useState<Set<number>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<VendorBookRow | null>(null);
  const [bulkDeletePending, setBulkDeletePending] = useState(false);

  const debouncedQ = useDebounce(searchInput, 400);

  const { data, isFetching } = useGetVendorBooksQuery({
    q: debouncedQ || undefined,
    status: statusFilter || undefined,
    page,
    limit,
  });

  const [deleteVendorBook] = useDeleteVendorBookMutation();
  const [changeVendorBookStatus] = useChangeVendorBookStatusMutation();

  const books      = data?.books ?? [];
  const pagination = data?.pagination ?? { page: 1, limit, total: 0, totalPages: 1 };
  const total      = pagination.total;

  // Reset page when filter/search changes
  const prevQ      = useRef(debouncedQ);
  const prevStatus = useRef(statusFilter);
  useEffect(() => {
    if (prevQ.current !== debouncedQ || prevStatus.current !== statusFilter) {
      setPage(1);
      setSelected(new Set());
      prevQ.current = debouncedQ;
      prevStatus.current = statusFilter;
    }
  }, [debouncedQ, statusFilter]);

  // ── Select helpers ──
  const toggleOne = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const allChecked = books.length > 0 && books.every((b) => selected.has(b.id));
  const toggleAll = useCallback(() => {
    if (allChecked) {
      setSelected(new Set());
    } else {
      setSelected(new Set(books.map((b) => b.id)));
    }
  }, [allChecked, books]);

  const clearSelection = useCallback(() => setSelected(new Set()), []);

  // ── Delete single ──
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try { await deleteVendorBook({ id: deleteTarget.id }).unwrap(); } catch { /* ignore */ }
    setDeleteTarget(null);
    setSelected((prev) => { const n = new Set(prev); n.delete(deleteTarget.id); return n; });
  };

  // ── Bulk delete ──
  const handleBulkDelete = async () => {
    setBulkDeletePending(true);
    const ids = Array.from(selected);
    for (const id of ids) {
      try { await deleteVendorBook({ id }).unwrap(); } catch { /* ignore */ }
    }
    setSelected(new Set());
    setBulkDeletePending(false);
  };

  // ── Bulk status change ──
  const handleBulkStatus = async () => {
    const ids = Array.from(selected);
    // Toggle: published → draft, draft/hidden → published
    for (const id of ids) {
      const book = books.find((b) => b.id === id);
      const newStatus: VendorBookStatus = book?.status === 'published' ? 'draft' : 'published';
      try { await changeVendorBookStatus({ id, status: newStatus }).unwrap(); } catch { /* ignore */ }
    }
    setSelected(new Set());
  };

  // ── Pagination helpers ──
  const totalPages   = pagination.totalPages;
  const startItem    = (page - 1) * limit + 1;
  const endItem      = Math.min(page * limit, total);

  const pageNumbers = () => {
    const pages: number[] = [];
    for (let i = 1; i <= Math.min(totalPages, 5); i++) pages.push(i);
    return pages;
  };

  // ── Topbar content ──
  const topbarTitle = (
    <>
      <span style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-.2px' }}>Quản lý E-book</span>
      <span style={{ fontSize: '13px', color: '#A8A8AE', fontVariantNumeric: 'tabular-nums' }}>
        {total} E-book
      </span>
    </>
  );

  const topbarActions = (
    <Link
      to="/vendor/books/new"
      style={{
        height: '32px', padding: '0 14px', background: '#16161A', color: '#FBFAF8',
        fontSize: '11px', fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase',
        border: 'none', borderRadius: '2px', cursor: 'pointer',
        textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
      }}
    >
      + Thêm E-book mới
    </Link>
  );

  return (
    <VendorShell title={topbarTitle} actions={topbarActions}>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, minWidth: '200px', maxWidth: '320px' }}>
          <span
            style={{
              position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
              color: '#A8A8AE', fontSize: '12px', pointerEvents: 'none',
            }}
          >
            ⌕
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm theo tên E-book..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            aria-label="Tìm kiếm E-book"
            style={{
              width: '100%', height: '32px', padding: '0 10px 0 32px',
              border: '1px solid #ECEAE5', borderRadius: '2px', background: '#FFFFFF',
              fontSize: '12px', fontFamily: "'Inter', sans-serif", color: '#16161A', outline: 'none',
            }}
          />
        </div>
        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as VendorBookStatus | '')}
          aria-label="Lọc trạng thái"
          style={{
            height: '32px', padding: '0 10px', border: '1px solid #ECEAE5',
            borderRadius: '2px', background: '#FFFFFF', fontSize: '12px',
            fontFamily: "'Inter', sans-serif", color: '#16161A', cursor: 'pointer',
          }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="published">Công khai</option>
          <option value="draft">Nháp</option>
        </select>
      </div>

      {/* ── Bulk bar ── */}
      {selected.size > 0 && (
        <div
          data-testid="bulk-bar"
          style={{
            background: '#F4F2ED', border: '1px solid #ECEAE5', borderRadius: '2px',
            padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px',
          }}
        >
          <span style={{ fontWeight: 600 }}>{selected.size} đã chọn</span>
          <button
            onClick={handleBulkDelete}
            disabled={bulkDeletePending}
            style={{
              height: '28px', padding: '0 10px', background: 'none', color: '#B43A3A',
              fontSize: '11px', fontWeight: 500, border: '1px solid #ECEAE5',
              borderRadius: '2px', cursor: 'pointer',
            }}
          >
            Xóa đã chọn
          </button>
          <button
            onClick={handleBulkStatus}
            style={{
              height: '28px', padding: '0 10px', background: 'none', color: '#6B6B73',
              fontSize: '11px', fontWeight: 500, border: '1px solid #ECEAE5',
              borderRadius: '2px', cursor: 'pointer',
            }}
          >
            Đổi trạng thái
          </button>
          <button
            onClick={clearSelection}
            style={{
              height: '28px', padding: '0 10px', background: 'none', color: '#6B6B73',
              fontSize: '11px', fontWeight: 500, border: '1px solid #ECEAE5',
              borderRadius: '2px', cursor: 'pointer', marginLeft: 'auto',
            }}
          >
            Bỏ chọn
          </button>
        </div>
      )}

      {/* ── Table + Pagination ── */}
      <div
        style={{
          background: '#FFFFFF', border: '1px solid #ECEAE5', borderRadius: '2px', overflow: 'hidden',
        }}
      >
        {/* Empty state */}
        {!isFetching && books.length === 0 ? (
          <div
            data-testid="empty-state"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '60px 24px', gap: '16px',
            }}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#A8A8AE" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
            </svg>
            <p style={{ fontSize: '14px', color: '#6B6B73', margin: 0 }}>Bạn chưa có E-book nào</p>
            <Link
              to="/vendor/books/new"
              style={{
                height: '32px', padding: '0 14px', background: '#16161A', color: '#FBFAF8',
                fontSize: '11px', fontWeight: 600, letterSpacing: '.5px', textTransform: 'uppercase',
                border: 'none', borderRadius: '2px', cursor: 'pointer',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
              }}
            >
              Thêm E-book đầu tiên →
            </Link>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ width: '32px', padding: '10px 16px', textAlign: 'left', borderBottom: '1px solid #ECEAE5', background: '#FFFFFF' }}>
                      <span
                        role="checkbox"
                        aria-checked={allChecked}
                        aria-label="Chọn tất cả"
                        onClick={toggleAll}
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && toggleAll()}
                        style={{
                          width: '14px', height: '14px',
                          border: `1.5px solid ${allChecked ? '#16161A' : '#A8A8AE'}`,
                          borderRadius: '2px', display: 'inline-block', cursor: 'pointer',
                          background: allChecked ? '#16161A' : 'transparent', flexShrink: 0,
                        }}
                      />
                    </th>
                    {['#', 'E-book', 'Giá bán', 'Đã bán', 'Trạng thái', 'Thao tác'].map((h) => (
                      <th
                        key={h}
                        style={{
                          fontSize: '9px', fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase',
                          color: '#A8A8AE', padding: '10px 16px', textAlign: 'left',
                          borderBottom: '1px solid #ECEAE5', whiteSpace: 'nowrap', background: '#FFFFFF',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {books.map((book, idx) => {
                    const isChecked = selected.has(book.id);
                    return (
                      <tr
                        key={book.id}
                        style={{ borderBottom: idx < books.length - 1 ? '1px solid #ECEAE5' : 'none' }}
                      >
                        {/* Checkbox */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <span
                            role="checkbox"
                            aria-checked={isChecked}
                            aria-label={`Chọn ${book.title}`}
                            onClick={() => toggleOne(book.id)}
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && toggleOne(book.id)}
                            style={{
                              width: '14px', height: '14px',
                              border: `1.5px solid ${isChecked ? '#16161A' : '#A8A8AE'}`,
                              borderRadius: '2px', display: 'inline-block', cursor: 'pointer',
                              background: isChecked ? '#16161A' : 'transparent', flexShrink: 0,
                            }}
                          />
                        </td>
                        {/* Row number */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <span style={{ fontSize: '11px', color: '#A8A8AE', fontVariantNumeric: 'tabular-nums' }}>
                            {String((page - 1) * limit + idx + 1).padStart(2, '0')}
                          </span>
                        </td>
                        {/* Book cell */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            {book.coverImageUrl ? (
                              <img
                                src={book.coverImageUrl}
                                alt={book.title}
                                style={{
                                  width: '36px', height: '50px', objectFit: 'cover',
                                  border: '1px solid #ECEAE5', borderRadius: '1px', flexShrink: 0,
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '36px', height: '50px', background: '#F4F2ED',
                                  border: '1px solid #ECEAE5', borderRadius: '1px', flexShrink: 0,
                                }}
                              />
                            )}
                            <div>
                              <div
                                style={{
                                  fontSize: '13px', fontWeight: 500,
                                  maxWidth: '200px', whiteSpace: 'nowrap',
                                  overflow: 'hidden', textOverflow: 'ellipsis',
                                }}
                              >
                                {book.title}
                              </div>
                              {book.author && (
                                <div style={{ fontSize: '11px', color: '#A8A8AE', marginTop: '2px' }}>
                                  {book.author}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* Price */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '13px' }}>
                            {formatVND(book.price)}
                          </span>
                        </td>
                        {/* Purchase count */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: '13px' }}>
                            {book.purchaseCount}
                          </span>
                        </td>
                        {/* Status pill */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <StatusPill status={book.status} />
                        </td>
                        {/* Actions */}
                        <td style={{ padding: '12px 16px', verticalAlign: 'middle' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Link
                              to={`/vendor/books/${book.id}/edit`}
                              style={{
                                height: '28px', padding: '0 10px', background: 'none', color: '#6B6B73',
                                fontSize: '11px', fontWeight: 500, border: '1px solid #ECEAE5',
                                borderRadius: '2px', cursor: 'pointer',
                                textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
                              }}
                            >
                              Sửa
                            </Link>
                            <button
                              onClick={() => setDeleteTarget(book)}
                              style={{
                                height: '28px', padding: '0 10px', background: 'none', color: '#B43A3A',
                                fontSize: '11px', fontWeight: 500, border: '1px solid #ECEAE5',
                                borderRadius: '2px', cursor: 'pointer',
                              }}
                            >
                              Xóa
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderTop: '1px solid #ECEAE5', background: '#FFFFFF',
                flexWrap: 'wrap', gap: '8px',
              }}
            >
              <div style={{ fontSize: '12px', color: '#A8A8AE', fontVariantNumeric: 'tabular-nums' }}>
                {total > 0 ? `Hiển thị ${startItem}–${endItem} / ${total} E-book` : ''}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    height: '28px', minWidth: '28px', padding: '0 8px',
                    border: '1px solid #ECEAE5', borderRadius: '2px', background: '#FFFFFF',
                    fontSize: '12px', color: page === 1 ? '#A8A8AE' : '#6B6B73',
                    cursor: page === 1 ? 'default' : 'pointer',
                  }}
                >
                  ←
                </button>
                {pageNumbers().map((n) => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    style={{
                      height: '28px', minWidth: '28px', padding: '0 8px',
                      border: '1px solid #ECEAE5', borderRadius: '2px',
                      background: n === page ? '#16161A' : '#FFFFFF',
                      color: n === page ? '#FBFAF8' : '#6B6B73',
                      fontSize: '12px', cursor: 'pointer',
                    }}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  style={{
                    height: '28px', minWidth: '28px', padding: '0 8px',
                    border: '1px solid #ECEAE5', borderRadius: '2px', background: '#FFFFFF',
                    fontSize: '12px', color: page >= totalPages ? '#A8A8AE' : '#6B6B73',
                    cursor: page >= totalPages ? 'default' : 'pointer',
                  }}
                >
                  →
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#A8A8AE' }}>
                Hiển thị
                <select
                  value={limit}
                  onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
                  style={{
                    height: '28px', padding: '0 6px', border: '1px solid #ECEAE5',
                    borderRadius: '2px', fontSize: '12px', fontFamily: "'Inter', sans-serif",
                    background: '#FFFFFF',
                  }}
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                mục / trang
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Delete confirm dialog ── */}
      {deleteTarget && (
        <ConfirmDialog
          title="Xóa E-book"
          message={`Bạn có chắc muốn xóa "${deleteTarget.title}"? Thao tác này sẽ ẩn E-book khỏi catalog, lịch sử đơn hàng vẫn được giữ lại.`}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </VendorShell>
  );
};
