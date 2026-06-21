import { Op, Transaction } from 'sequelize';
import { Order, OrderItem, Payment, Book } from '../../db/models';
import {
  OrderDetailDTO,
  OrderSummaryDTO,
  PaymentDTO,
  OrderItemDTO,
  PaginationMeta,
} from './orders.schema';

// ── Map helpers ───────────────────────────────────────────────────────────────

export function mapPaymentDTO(payment: Payment): PaymentDTO {
  return {
    id: Number(payment.id),
    status: payment.status,
    amount: Number(payment.amount),
    currency: payment.currency ?? 'VND',
    referenceCode: payment.referenceCode,
    qrPayload: payment.qrPayload ?? null,
    expiresAt: payment.expiresAt ?? null,
    paidAt: payment.paidAt ?? null,
    // KHÔNG map providerTxnId — bảo mật
  };
}

export function mapOrderItemDTO(item: OrderItem): OrderItemDTO {
  const book = (item as any).book as Book | null;
  return {
    bookId: Number(item.bookId),
    slug: book?.slug ?? null,
    title: item.titleSnapshot,
    coverImageUrl: book?.coverImageUrl ?? null,
    unitPrice: Number(item.unitPrice),
  };
}

export function mapOrderDetailDTO(order: Order): OrderDetailDTO {
  const items = ((order as any).items as OrderItem[]) ?? [];
  const payments = ((order as any).payments as Payment[]) ?? [];
  // Lấy payment mới nhất (by id DESC)
  const latestPayment = payments.length > 0
    ? payments.reduce((latest, p) => (Number(p.id) > Number(latest.id) ? p : latest))
    : null;

  return {
    code: order.code,
    status: order.status,
    subtotal: Number(order.subtotal),
    couponDiscount: Number(order.couponDiscount ?? 0),
    loyaltyDiscount: Number(order.loyaltyDiscount ?? 0),
    total: Number(order.total),
    currency: order.currency ?? 'VND',
    items: items.map(mapOrderItemDTO),
    payment: latestPayment ? mapPaymentDTO(latestPayment) : null,
    createdAt: order.created_at,
    completedAt: order.completedAt ?? null,
    cancelledAt: order.cancelledAt ?? null,
  };
}

// ── Includes ──────────────────────────────────────────────────────────────────

const orderItemIncludes = [
  {
    model: Book,
    as: 'book',
    attributes: ['id', 'slug', 'coverImageUrl'],
  },
];

// ── Tìm order theo code và userId ─────────────────────────────────────────────

export async function findOrderByCode(
  code: string,
  userId: number,
  options?: { transaction?: Transaction },
): Promise<Order | null> {
  return Order.findOne({
    where: { code, userId },
    include: [
      {
        model: OrderItem,
        as: 'items',
        include: orderItemIncludes,
      },
      {
        model: Payment,
        as: 'payments',
        // I3: Sắp xếp payment theo id DESC để intent mới nhất luôn đứng đầu,
        // đảm bảo mapOrderDetailDTO chọn tất định payment mới nhất khi reduce.
        separate: true,
        order: [['id', 'DESC']],
      },
    ],
    ...(options?.transaction ? { transaction: options.transaction } : {}),
  });
}

// ── List orders với pagination + filter ──────────────────────────────────────

export async function listOrders(
  userId: number,
  page: number,
  limit: number,
  status?: string,
): Promise<{ rows: Order[]; count: number }> {
  const where: any = { userId };
  if (status) where.status = status;

  const { rows, count } = await Order.findAndCountAll({
    where,
    include: [
      {
        model: OrderItem,
        as: 'items',
        attributes: ['id'],
      },
    ],
    order: [['created_at', 'DESC']],
    limit,
    offset: (page - 1) * limit,
    distinct: true,
  });

  return { rows, count };
}

export function mapOrderSummaryDTO(order: Order): OrderSummaryDTO {
  const items = ((order as any).items as OrderItem[]) ?? [];
  return {
    code: order.code,
    status: order.status,
    itemCount: items.length,
    total: Number(order.total),
    currency: order.currency ?? 'VND',
    createdAt: order.created_at,
    completedAt: order.completedAt ?? null,
    cancelledAt: order.cancelledAt ?? null,
  };
}

export function buildPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
