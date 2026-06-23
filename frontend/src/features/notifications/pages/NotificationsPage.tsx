// Màn Thông báo — Screen 29, route /user/notifications
import { useNavigate } from 'react-router-dom';
import { AccountShell } from '../../profile/components/AccountShell';
import { useGetMeQuery } from '../../auth/authApi';
import {
  useGetNotificationsQuery,
  useMarkReadMutation,
  useMarkAllReadMutation,
} from '../notificationsApi';
import { formatDateTime } from '../../../shared/format';
import type { NotificationRow } from '../types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  if (diffHours < 1) {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return `Vừa xong · ${formatDateTime(iso)}`;
    return `${diffMins} phút trước · ${formatDateTime(iso)}`;
  }
  if (diffHours < 24) {
    return `${diffHours} giờ trước · ${formatDateTime(iso)}`;
  }
  return formatDateTime(iso);
}

// ── Icon by notification type ─────────────────────────────────────────────────

function NotifIcon({ type }: { type: string }) {
  // DS hex colors (no var(--) usage)
  const colorMap: Record<string, { bg: string; color: string }> = {
    order:     { bg: '#EDF1F6', color: '#3A5680' },
    payment:   { bg: '#EDF1F6', color: '#3A5680' },
    ebook:     { bg: '#ECF6EE', color: '#2E7D4F' },
    promotion: { bg: '#FFF6E0', color: '#7A5C1E' },
    system:    { bg: '#F4F2ED', color: '#A8A8AE' },
  };
  const { bg, color } = colorMap[type] ?? colorMap.system;

  return (
    <div
      className="w-[40px] h-[40px] rounded-full flex-shrink-0 flex items-center justify-center mt-[2px]"
      style={{ backgroundColor: bg, color }}
    >
      {type === 'order' && (
        <svg width="18" height="18" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" />
          <line x1="3" y1="6" x2="21" y2="6" />
          <path d="M16 10a4 4 0 01-8 0" />
        </svg>
      )}
      {type === 'payment' && (
        <svg width="18" height="18" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      )}
      {type === 'ebook' && (
        <svg width="18" height="18" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
        </svg>
      )}
      {type === 'promotion' && (
        <svg width="18" height="18" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
      )}
      {(type === 'system' || !['order','payment','ebook','promotion'].includes(type)) && (
        <svg width="18" height="18" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      )}
    </div>
  );
}

// ── Action label by type ──────────────────────────────────────────────────────

function getActionLabel(type: string): string | null {
  switch (type) {
    case 'order':     return 'Xem đơn hàng →';
    case 'payment':   return 'Xem đơn hàng →';
    case 'ebook':     return 'Tải ngay →';
    case 'promotion': return 'Khám phá ngay →';
    case 'system':    return null;
    default:          return null;
  }
}

// ── Single notification item ──────────────────────────────────────────────────

function NotifItem({
  notif,
  onItemClick,
}: {
  notif: NotificationRow;
  onItemClick: (notif: NotificationRow) => void;
}) {
  const isUnread = notif.readAt === null;
  const actionLabel = getActionLabel(notif.type);

  return (
    <div
      data-testid="notif-item"
      className="flex items-start gap-4 px-7 py-4 border-b border-line relative cursor-pointer hover:bg-[#F4F2ED] transition-colors duration-150"
      style={isUnread ? { backgroundColor: '#FAFAF8' } : {}}
      onClick={() => onItemClick(notif)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onItemClick(notif);
        }
      }}
    >
      {/* Unread dot */}
      {isUnread && (
        <span
          data-testid="unread-dot"
          className="absolute left-[12px] top-[22px] w-[6px] h-[6px] rounded-full"
          style={{ backgroundColor: '#16161A' }}
          aria-label="Chưa đọc"
        />
      )}

      {/* Icon */}
      <NotifIcon type={notif.type} />

      {/* Body */}
      <div className="flex-1 min-w-0">
        <p
          className={`text-[13px] text-ink mb-[3px] leading-[1.4] ${isUnread ? 'font-semibold' : 'font-medium'}`}
        >
          {notif.title}
        </p>
        {notif.body && (
          <p className="text-[12px] text-ink-2 leading-[1.5] mb-[6px]">{notif.body}</p>
        )}
        <p className="text-[11px]" style={{ color: '#A8A8AE' }}>
          {formatRelativeTime(notif.createdAt)}
        </p>
        {actionLabel && (
          <button
            type="button"
            className="text-[11px] font-semibold text-ink tracking-[0.5px] uppercase bg-transparent border-none p-0 mt-[6px] block cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onItemClick(notif);
            }}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center text-center px-[40px] py-[64px]">
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="mb-5"
        style={{ color: '#A8A8AE' }}
        aria-hidden="true"
      >
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
      <p className="text-[16px] font-medium text-ink mb-2">Bạn chưa có thông báo nào</p>
      <p className="text-[13px] text-ink-2">Các cập nhật đơn hàng và ưu đãi sẽ xuất hiện tại đây.</p>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function NotifSkeleton() {
  return (
    <div className="flex items-start gap-4 px-7 py-4 border-b border-line animate-pulse">
      <div className="w-10 h-10 rounded-full bg-line flex-shrink-0 mt-[2px]" />
      <div className="flex-1">
        <div className="h-3 bg-line rounded w-2/3 mb-2" />
        <div className="h-3 bg-line rounded w-full mb-2" />
        <div className="h-2 bg-line rounded w-1/4" />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────── */
/*  NotificationsPage                                       */
/*  Route: /user/notifications (role 'user')               */
/* ─────────────────────────────────────────────────────── */
export default function NotificationsPage() {
  const navigate = useNavigate();
  const { data: me } = useGetMeQuery();
  const { data, isLoading } = useGetNotificationsQuery({ page: 1, limit: 20 });
  const [markRead] = useMarkReadMutation();
  const [markAllRead] = useMarkAllReadMutation();

  const notifications = data?.notifications ?? [];

  const todayItems = notifications.filter((n) => isToday(n.createdAt));
  const olderItems = notifications.filter((n) => !isToday(n.createdAt));

  const handleItemClick = (notif: NotificationRow) => {
    // Mark as read if unread
    if (notif.readAt === null) {
      markRead(notif.id);
    }
    // Navigate by type
    const orderCode = notif.data?.orderCode as string | undefined;
    switch (notif.type) {
      case 'order':
      case 'payment':
        if (orderCode) navigate(`/user/orders/${orderCode}`);
        else navigate('/user/orders');
        break;
      case 'ebook':
        navigate('/user/ebooks');
        break;
      case 'promotion':
        navigate('/books');
        break;
      case 'system':
      default:
        // stay on page
        break;
    }
  };

  const handleMarkAllRead = () => {
    markAllRead();
  };

  const userData = me ? { fullName: me.fullName, email: me.email } : null;

  return (
    <AccountShell
      breadcrumbLabel="Thông báo"
      activeNav="/user/notifications"
      userData={userData}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-7 pt-6 pb-5 border-b border-line">
        <h1 className="text-[18px] font-semibold tracking-[-0.3px] text-ink">Thông báo</h1>
        <button
          type="button"
          onClick={handleMarkAllRead}
          className="flex items-center gap-[6px] text-[11px] font-medium tracking-[0.3px] text-ink-2 bg-transparent border-none cursor-pointer hover:text-ink transition-colors"
        >
          <svg width="14" height="14" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Đánh dấu tất cả đã đọc
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div>
          {Array.from({ length: 5 }).map((_, i) => (
            <NotifSkeleton key={i} />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <EmptyState />
      ) : (
        <div>
          {/* Hôm nay group */}
          {todayItems.length > 0 && (
            <>
              <p
                className="text-[11px] font-medium tracking-[1.5px] uppercase px-7 pt-4 pb-2"
                style={{ color: '#A8A8AE' }}
              >
                Hôm nay
              </p>
              {todayItems.map((n) => (
                <NotifItem key={n.id} notif={n} onItemClick={handleItemClick} />
              ))}
            </>
          )}

          {/* Trước đó group */}
          {olderItems.length > 0 && (
            <>
              <p
                className="text-[11px] font-medium tracking-[1.5px] uppercase px-7 pt-4 pb-2"
                style={{ color: '#A8A8AE' }}
              >
                Trước đó
              </p>
              {olderItems.map((n) => (
                <NotifItem key={n.id} notif={n} onItemClick={handleItemClick} />
              ))}
            </>
          )}
        </div>
      )}
    </AccountShell>
  );
}
