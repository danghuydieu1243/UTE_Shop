export type Period = 'today' | '7d' | '30d' | 'month' | 'year';
const VALID: Period[] = ['today', '7d', '30d', 'month', 'year'];

export function resolvePeriod(period: string, now: Date = new Date()): { from: Date; to: Date } {
  const p = (VALID as string[]).includes(period) ? (period as Period) : '30d';
  const to = new Date(now);
  const from = new Date(now);
  from.setHours(0, 0, 0, 0);
  switch (p) {
    case 'today': break;
    case '7d': from.setDate(from.getDate() - 6); break;
    case '30d': from.setDate(from.getDate() - 29); break;
    case 'month': from.setDate(1); break;
    case 'year': from.setMonth(0, 1); break;
  }
  return { from, to };
}

/** Gom rows {date,value} theo ngày YYYY-MM-DD trong [from,to], fill 0 ngày trống. */
export function bucketByDay(
  rows: { date: Date; value: number }[],
  from: Date,
  to: Date,
): { date: string; value: number }[] {
  const key = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const map = new Map<string, number>();
  // seed các ngày trong khoảng = 0
  const cur = new Date(from); cur.setHours(0, 0, 0, 0);
  const end = new Date(to); end.setHours(0, 0, 0, 0);
  while (cur <= end) { map.set(key(cur), 0); cur.setDate(cur.getDate() + 1); }
  for (const r of rows) {
    const k = key(new Date(r.date));
    if (map.has(k)) map.set(k, (map.get(k) ?? 0) + Number(r.value));
  }
  return Array.from(map.entries()).map(([date, value]) => ({ date, value }));
}
