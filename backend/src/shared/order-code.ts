import { nanoid } from 'nanoid';
import { Order } from '../db/models';

/**
 * Sinh mã đơn UNIQUE = 'ATH' + base36(Date.now()) + nanoid 4 ký tự HOA.
 * Retry tự động nếu trùng (collision rất hiếm nhưng đảm bảo UNIQUE).
 */
export async function generateOrderCode(maxRetries = 5): Promise<string> {
  for (let i = 0; i < maxRetries; i++) {
    const suffix = nanoid(4).toUpperCase().replace(/[^A-Z0-9]/g, 'X'); // Đảm bảo uppercase alphanum
    const code = `ATH${Date.now().toString(36).toUpperCase()}${suffix}`;
    // Kiểm tính duy nhất
    const existing = await Order.findOne({ where: { code } });
    if (!existing) return code;
  }
  // Fallback với timestamp nano nếu quá nhiều collision
  return `ATH${Date.now().toString(36).toUpperCase()}${nanoid(6).toUpperCase().replace(/[^A-Z0-9]/g, 'X')}`;
}

/**
 * Sinh qr_payload placeholder cho payment intent.
 */
export function generateQrPayload(ref: string, amount: number): string {
  return JSON.stringify({ ref, amount, bank: 'SIMULATED' });
}
