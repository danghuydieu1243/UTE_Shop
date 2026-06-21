/**
 * Định dạng giá tiền VND.
 * Ví dụ: 89000 → "89.000đ"
 */
export function formatVND(amount: number): string {
  return amount.toLocaleString('vi-VN') + 'đ';
}

/**
 * Định dạng số nguyên với dấu phân cách hàng nghìn (vi-VN).
 * Ví dụ: 1248 → "1.248"
 */
export function formatCount(n: number): string {
  return n.toLocaleString('vi-VN');
}

/**
 * Định dạng dung lượng file thuần (bytes → "12.4 MB" / "850 KB").
 * Ví dụ: formatBytes(13002342) → "12.4 MB"
 */
export function formatBytes(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`;
}

/**
 * Định dạng dung lượng file kèm format (bytes → "PDF · 12.4 MB").
 * Ví dụ: formatFileSize('PDF', 13002342) → "PDF · 12.4 MB"
 */
export function formatFileSize(format: string, bytes: number): string {
  return `${format} · ${formatBytes(bytes)}`;
}

/**
 * Định dạng ngày giờ ngắn gọn (vi-VN).
 * Ví dụ: "2024-01-01T03:30:00Z" → "03:30, 01/01/2024"
 */
export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const date = d.toLocaleDateString('vi-VN');
  return `${time}, ${date}`;
}
