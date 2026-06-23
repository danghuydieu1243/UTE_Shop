/**
 * Payments service — xử lý thanh toán giả lập (simulate) và cấp entitlement.
 */

import {
  sequelize,
  Payment, Order, OrderItem, Book, Entitlement, Coupon,
} from '../../db/models';
import { AppError } from '../../shared/errors/AppError';
import { mapOrderDetailDTO } from '../orders/orders.repository';
import { OrderDetailDTO } from '../orders/orders.schema';
import * as notificationsService from '../notifications/notifications.service';

// ── Tải lại order đầy đủ (items + book + payments) để build DTO ──────────────

async function reloadOrder(orderId: number, transaction?: import('sequelize').Transaction) {
  return Order.findOne({
    where: { id: orderId },
    include: [
      {
        model: OrderItem,
        as: 'items',
        include: [{ model: Book, as: 'book', attributes: ['id', 'slug', 'coverImageUrl'] }],
      },
      {
        model: Payment,
        as: 'payments',
        separate: true,
        order: [['id', 'DESC']],
      },
    ],
    ...(transaction ? { transaction } : {}),
  });
}

// ── completePayment ───────────────────────────────────────────────────────────

/**
 * Hoàn tất payment bằng simulate (không gọi cổng thật).
 * IDEMPOTENT: nếu payment đã PAID → trả OrderDetailDTO ngay.
 *
 * @param paymentId  Primary key của Payment
 * @param opts.userId  User đang gọi (để kiểm chủ đơn)
 */
export async function completePayment(
  paymentId: number,
  opts: { userId: number },
): Promise<OrderDetailDTO> {
  return sequelize.transaction(async (t) => {
    // 1. Load payment — SELECT ... FOR UPDATE để ngăn double-complete khi gọi song song
    const payment = await Payment.findByPk(paymentId, { transaction: t, lock: t.LOCK.UPDATE });
    if (!payment) {
      throw AppError.from('PAYMENT_NOT_FOUND', 'Không tìm thấy giao dịch thanh toán');
    }

    // 2. Load order kèm items để kiểm chủ sở hữu
    const order = await Order.findOne({
      where: { id: payment.orderId },
      include: [{ model: OrderItem, as: 'items' }],
      transaction: t,
    });
    if (!order) {
      throw AppError.from('PAYMENT_NOT_FOUND', 'Không tìm thấy đơn hàng liên quan');
    }

    // 3. Kiểm chủ đơn (không lộ thông tin nếu không phải chủ)
    if (Number(order.userId) !== opts.userId) {
      throw AppError.from('PAYMENT_NOT_FOUND', 'Không tìm thấy giao dịch thanh toán');
    }

    // 4. Kiểm trạng thái payment: FAILED → từ chối
    if (payment.status === 'FAILED') {
      throw AppError.from('PAYMENT_ALREADY_FAILED', 'Giao dịch thanh toán đã bị từ chối trước đó');
    }

    // 5. IDEMPOTENT: PAID → trả DTO ngay (không làm gì thêm)
    if (payment.status === 'PAID') {
      const existing = await reloadOrder(Number(order.id), t);
      return mapOrderDetailDTO(existing!);
    }

    // 6. Kiểm hết hạn
    if (payment.expiresAt && new Date(payment.expiresAt) < new Date()) {
      throw AppError.from('PAYMENT_EXPIRED', 'Giao dịch thanh toán đã hết hạn');
    }

    // 7. Sinh providerTxnId giả
    const providerTxnId =
      'SIMULATED-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    const now = new Date();

    // 8. Cập nhật payment → PAID
    await payment.update(
      { status: 'PAID', paidAt: now, providerTxnId },
      { transaction: t },
    );

    // 9. Cập nhật order → COMPLETED
    await order.update(
      { status: 'COMPLETED', completedAt: now },
      { transaction: t },
    );

    // 10. Cấp entitlement + tăng purchaseCount cho mỗi book trong đơn
    const items = (order as any).items as OrderItem[];
    for (const item of items) {
      // findOrCreate để đảm bảo idempotent (UNIQUE constraint userId+bookId)
      await Entitlement.findOrCreate({
        where: { userId: opts.userId, bookId: Number(item.bookId) },
        defaults: {
          userId: opts.userId,
          bookId: Number(item.bookId),
          orderId: Number(order.id),
          grantedAt: now,
        },
        transaction: t,
      });

      // Tăng purchaseCount (chỉ tăng lần đầu — idempotent qua entitlement.findOrCreate)
      await Book.increment('purchaseCount', {
        where: { id: Number(item.bookId) },
        transaction: t,
      });
    }

    // TODO P6: cộng ví Vendor (bảng vendor_wallets tạo ở Phase 6)

    // 6a: thông báo ebook sẵn sàng tải (idempotent — nhánh này chỉ chạy lần đầu PAID)
    const itemCount = items.length;
    await notificationsService.createNotification(
      {
        userId: opts.userId,
        type: 'ebook',
        title: `Đơn ${order.code} đã hoàn thành — ${itemCount} e-book sẵn sàng tải`,
        body: 'Thanh toán đã được xác nhận. E-book đã được thêm vào thư viện của bạn.',
        data: { orderCode: order.code, count: itemCount },
      },
      { transaction: t },
    );

    // D10: increment coupon used_count on first COMPLETED (guard is the payment.status===PAID early return above)
    if (order.couponId) {
      await Coupon.increment('usedCount', { by: 1, where: { id: Number(order.couponId) }, transaction: t });
    }

    // 11. Load lại order đầy đủ để build DTO
    const reloaded = await reloadOrder(Number(order.id), t);
    return mapOrderDetailDTO(reloaded!);
  });
}
