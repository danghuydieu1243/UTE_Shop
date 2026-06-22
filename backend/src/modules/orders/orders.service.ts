import {
  sequelize,
  Cart, CartItem, Book, Entitlement,
  Order, OrderItem, Payment,
  LoyaltyAccount, LoyaltyTransaction, CouponRedemption,
} from '../../db/models';
import { AppError } from '../../shared/errors/AppError';
import * as cartCache from '../../shared/cache/cartCache';
import { generateOrderCode, generateQrPayload } from '../../shared/order-code';
import * as repo from './orders.repository';
import {
  OrderDetailDTO,
  OrderSummaryDTO,
  PaymentDTO,
  PaginationMeta,
  CreateOrderBody,
} from './orders.schema';
import { validateAndPriceCoupon } from '../coupons/coupons.service';

// ── Helpers ───────────────────────────────────────────────────────────────────

const PAYMENT_TTL_MINUTES = 15;

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

// ── createOrder (checkout) ────────────────────────────────────────────────────

export async function createOrder(userId: number, input: CreateOrderBody = {}): Promise<OrderDetailDTO> {
  // Bọc toàn bộ trong transaction; kết quả được capture để xử lý cache SAU KHI commit
  const result = await sequelize.transaction(async (t) => {
    // 1. Lấy cart của user
    const cart = await Cart.findOne({ where: { userId }, transaction: t });
    if (!cart) {
      throw AppError.from('CART_EMPTY', 'Giỏ hàng trống, không thể đặt đơn');
    }

    // 2. Lấy tất cả cart items kèm book
    const cartItems = await CartItem.findAll({
      where: { cartId: cart.id },
      include: [
        {
          model: Book,
          as: 'book',
          attributes: ['id', 'slug', 'title', 'price', 'status', 'coverImageUrl', 'vendorUserId'],
        },
      ],
      transaction: t,
    });

    if (cartItems.length === 0) {
      throw AppError.from('CART_EMPTY', 'Giỏ hàng trống, không thể đặt đơn');
    }

    // 3. Lấy danh sách bookId mà user đã có entitlement
    const bookIds = cartItems.map((ci) => Number((ci as any).book?.id ?? ci.bookId));
    const ownedEntitlements = await Entitlement.findAll({
      where: { userId, bookId: bookIds },
      attributes: ['bookId'],
      transaction: t,
    });
    const ownedBookIds = new Set(ownedEntitlements.map((e) => Number(e.bookId)));

    // Lọc bỏ sách đã sở hữu hoặc không còn published
    const eligibleItems = cartItems.filter((ci) => {
      const book = (ci as any).book as Book;
      if (!book) return false;
      if (book.status !== 'published') return false;
      if (ownedBookIds.has(Number(book.id))) return false;
      return true;
    });

    if (eligibleItems.length === 0) {
      throw AppError.from('CART_EMPTY', 'Không còn sách hợp lệ trong giỏ để đặt đơn');
    }

    // 4. Tính subtotal dùng giá HIỆN TẠI của book (book.price, không phải cart item unit_price)
    const subtotal = eligibleItems.reduce((sum, ci) => {
      const book = (ci as any).book as Book;
      return sum + Number(book.price);
    }, 0);

    // --- Coupon ---
    let couponId: number | null = null;
    let couponDiscount = 0;
    if (input.couponCode) {
      const eligibleItemsForCoupon = eligibleItems.map((ci) => {
        const book = (ci as any).book as Book;
        return { bookId: Number(book.id), vendorUserId: Number(book.vendorUserId), price: Number(book.price) };
      });
      const { coupon, discount } = await validateAndPriceCoupon(
        input.couponCode, eligibleItemsForCoupon, userId, { transaction: t }
      );
      couponId = Number(coupon.id);
      couponDiscount = discount;
    }

    // --- Loyalty ---
    let loyaltyDiscount = 0;
    let pointsActuallyUsed = 0;
    let loyaltyAccount: LoyaltyAccount | null = null;
    if (input.pointsToUse && input.pointsToUse > 0) {
      const [acc] = await LoyaltyAccount.findOrCreate({
        where: { userId },
        defaults: { userId, balancePoints: 0 },
        transaction: t,
      });
      loyaltyAccount = acc;
      if (input.pointsToUse > Number(acc.balancePoints)) {
        throw AppError.from('LOYALTY_INSUFFICIENT', 'Số điểm không đủ');
      }
      loyaltyDiscount = Math.min(input.pointsToUse * 100, subtotal - couponDiscount);
      pointsActuallyUsed = Math.ceil(loyaltyDiscount / 100);
    }

    const total = subtotal - couponDiscount - loyaltyDiscount;

    // 5. Tạo order
    const code = await generateOrderCode();
    const order = await Order.create(
      {
        userId,
        code,
        status: 'NEW',
        subtotal,
        couponId,
        couponDiscount,
        loyaltyDiscount,
        pointsUsed: pointsActuallyUsed,
        total,
        currency: 'VND',
      },
      { transaction: t },
    );

    // 6. Tạo order_items
    const orderItemsData = eligibleItems.map((ci) => {
      const book = (ci as any).book as Book;
      return {
        orderId: Number(order.id),
        bookId: Number(book.id),
        vendorUserId: Number(book.vendorUserId),
        titleSnapshot: book.title,
        unitPrice: Number(book.price),
      };
    });
    await OrderItem.bulkCreate(orderItemsData, { transaction: t });

    // --- CouponRedemption ---
    if (couponId) {
      await CouponRedemption.create(
        { couponId, userId, orderId: Number(order.id), discountAmount: couponDiscount },
        { transaction: t }
      );
    }

    // --- Loyalty deduction ---
    if (pointsActuallyUsed > 0 && loyaltyAccount) {
      await loyaltyAccount.decrement('balancePoints', { by: pointsActuallyUsed, transaction: t });
      await LoyaltyTransaction.create(
        { userId, type: 'redeem', points: -pointsActuallyUsed, orderId: Number(order.id) },
        { transaction: t }
      );
    }

    // 7. Tạo payment intent PENDING
    const now = new Date();
    const qrPayload = generateQrPayload(code, total);
    const payment = await Payment.create(
      {
        orderId: Number(order.id),
        provider: 'sepay',
        amount: total,
        currency: 'VND',
        status: 'PENDING',
        referenceCode: code,
        qrPayload,
        expiresAt: addMinutes(now, PAYMENT_TTL_MINUTES),
      },
      { transaction: t },
    );

    // 8. Xóa các cart_items vừa đặt (chỉ những sách eligible)
    const eligibleBookIds = eligibleItems.map((ci) => Number((ci as any).book?.id ?? ci.bookId));
    await CartItem.destroy({
      where: { cartId: cart.id, bookId: eligibleBookIds },
      transaction: t,
    });

    // 9. Build và trả OrderDetailDTO
    // Load lại order với items + payment (trong transaction)
    const createdOrder = await Order.findOne({
      where: { id: order.id },
      include: [
        {
          model: OrderItem,
          as: 'items',
          include: [{ model: Book, as: 'book', attributes: ['id', 'slug', 'coverImageUrl'] }],
        },
        { model: Payment, as: 'payments' },
      ],
      transaction: t,
    });

    return repo.mapOrderDetailDTO(createdOrder!);
  });

  // 10. Del cart cache SAU KHI transaction đã commit thành công.
  // Bọc try/catch để Redis down KHÔNG làm fail checkout đã ghi vào DB.
  try {
    await cartCache.delCart(userId);
  } catch {
    /* cache best-effort — bỏ qua lỗi Redis */
  }

  return result;
}

// ── listOrders ────────────────────────────────────────────────────────────────

export async function listOrders(
  userId: number,
  page: number,
  limit: number,
  status?: string,
): Promise<{ data: OrderSummaryDTO[]; pagination: PaginationMeta }> {
  const { rows, count } = await repo.listOrders(userId, page, limit, status);
  return {
    data: rows.map(repo.mapOrderSummaryDTO),
    pagination: repo.buildPaginationMeta(page, limit, count),
  };
}

// ── getOrder ──────────────────────────────────────────────────────────────────

export async function getOrder(userId: number, code: string): Promise<OrderDetailDTO> {
  const order = await repo.findOrderByCode(code, userId);
  if (!order) {
    throw AppError.from('ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng');
  }
  return repo.mapOrderDetailDTO(order);
}

// ── cancelOrder ───────────────────────────────────────────────────────────────

export async function cancelOrder(userId: number, code: string): Promise<OrderDetailDTO> {
  return sequelize.transaction(async (t) => {
    const order = await repo.findOrderByCode(code, userId, { transaction: t });
    if (!order) {
      throw AppError.from('ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng');
    }

    if (order.status !== 'NEW') {
      throw AppError.from('ORDER_NOT_CANCELLABLE', 'Đơn hàng không thể hủy ở trạng thái hiện tại');
    }

    // Cập nhật order → CANCELLED
    await order.update(
      { status: 'CANCELLED', cancelledAt: new Date() },
      { transaction: t },
    );

    // Refund loyalty points
    if (Number(order.pointsUsed) > 0) {
      await LoyaltyAccount.increment('balancePoints', {
        by: Number(order.pointsUsed),
        where: { userId },
        transaction: t,
      });
      await LoyaltyTransaction.create(
        { userId, type: 'earn', points: Number(order.pointsUsed), orderId: Number(order.id), note: 'Hoàn điểm do hủy đơn' },
        { transaction: t }
      );
    }
    // Delete CouponRedemption
    if (order.couponId) {
      await CouponRedemption.destroy({ where: { orderId: Number(order.id) }, transaction: t });
    }

    // Cập nhật tất cả payment PENDING → FAILED
    await Payment.update(
      { status: 'FAILED' },
      { where: { orderId: order.id, status: 'PENDING' }, transaction: t },
    );

    // Reload để trả DTO mới nhất
    const updated = await repo.findOrderByCode(code, userId, { transaction: t });
    return repo.mapOrderDetailDTO(updated!);
  });
}

// ── recreatePayment ───────────────────────────────────────────────────────────

export async function recreatePayment(userId: number, code: string): Promise<PaymentDTO> {
  return sequelize.transaction(async (t) => {
    const order = await repo.findOrderByCode(code, userId, { transaction: t });
    if (!order) {
      throw AppError.from('ORDER_NOT_FOUND', 'Không tìm thấy đơn hàng');
    }

    if (order.status !== 'NEW') {
      throw AppError.from('ORDER_NOT_PAYABLE', 'Đơn hàng không ở trạng thái chờ thanh toán');
    }

    // Guard I1: Chỉ tạo lại QR khi KHÔNG còn payment PENDING hợp lệ (chưa hết hạn).
    // Nếu vẫn còn payment PENDING với expires_at > now → từ chối tạo thêm.
    const now = new Date();
    const payments = ((order as any).payments as Payment[]) ?? [];
    const hasValidPending = payments.some(
      (p) => p.status === 'PENDING' && p.expiresAt != null && new Date(p.expiresAt) > now,
    );
    if (hasValidPending) {
      throw AppError.from(
        'ORDER_NOT_PAYABLE',
        'Đơn hàng đang có QR hợp lệ, chưa cần tạo lại',
      );
    }

    // Tạo payment intent PENDING mới (now đã khai báo ở trên)
    const qrPayload = generateQrPayload(order.code, Number(order.total));
    const payment = await Payment.create(
      {
        orderId: Number(order.id),
        provider: 'sepay',
        amount: Number(order.total),
        currency: 'VND',
        status: 'PENDING',
        referenceCode: order.code,
        qrPayload,
        expiresAt: addMinutes(now, PAYMENT_TTL_MINUTES),
      },
      { transaction: t },
    );

    return repo.mapPaymentDTO(payment);
  });
}
