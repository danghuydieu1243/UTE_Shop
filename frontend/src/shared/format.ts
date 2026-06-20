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
 * Định dạng dung lượng file (bytes → "PDF · 12.4 MB").
 * Ví dụ: formatFileSize('PDF', 13002342) → "PDF · 12.4 MB"
 */
export function formatFileSize(format: string, bytes: number): string {
  const mb = bytes / (1024 * 1024);
  const display = mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  return `${format} · ${display}`;
}
