import { describe, it, expect } from 'vitest';
import { transformNotificationsResponse } from '../notificationsApi';
import type { EnvelopeMeta } from '../../../shared/api/baseApi';

const ROWS = [
  { id: 2, type: 'ebook', title: 'B', body: null, data: { orderCode: 'X' }, readAt: null, createdAt: '2026-06-23T08:00:00.000Z' },
  { id: 1, type: 'order', title: 'A', body: 'x', data: null, readAt: '2026-06-23T07:00:00.000Z', createdAt: '2026-06-23T07:00:00.000Z' },
];

describe('transformNotificationsResponse — contract lock', () => {
  it('đọc mảng + meta.pagination + meta.unreadCount', () => {
    const meta: EnvelopeMeta = { pagination: { page: 1, limit: 20, total: 2, totalPages: 1 }, unreadCount: 1 };
    const r = transformNotificationsResponse(ROWS as never, meta);
    expect(Array.isArray(r.notifications)).toBe(true);
    expect(r.notifications).toHaveLength(2);
    // Khóa TỪNG field DTO (bug-class #1 dự án: FE↔BE shape/casing drift)
    expect(r.notifications[0].id).toBe(2);
    expect(r.notifications[0].type).toBe('ebook');
    expect(r.notifications[0].title).toBe('B');
    expect(r.notifications[0].body).toBeNull();
    expect(r.notifications[0].data).toEqual({ orderCode: 'X' });
    expect(r.notifications[0].readAt).toBeNull();         // camelCase đúng
    expect(r.notifications[0].createdAt).toBe('2026-06-23T08:00:00.000Z');
    expect(r.notifications[1].readAt).toBe('2026-06-23T07:00:00.000Z'); // ca readAt non-null
    expect(r.notifications[1].body).toBe('x');
    expect(r.unreadCount).toBe(1);
    expect(r.pagination.total).toBe(2);
  });

  it('data không phải mảng → notifications rỗng, unreadCount 0', () => {
    const r = transformNotificationsResponse(null as never, undefined);
    expect(r.notifications).toEqual([]);
    expect(r.unreadCount).toBe(0);
  });
});
