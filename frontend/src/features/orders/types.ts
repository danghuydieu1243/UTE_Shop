/** Một item trong đơn hàng */
export interface OrderItem {
  bookId: number;
  slug: string;
  title: string;
  coverImageUrl: string | null;
  unitPrice: number;
}

/** Thông tin payment QR */
export interface Payment {
  id: number;
  /** Trạng thái payment theo backend enum: PENDING | PAID | FAILED | REFUNDED */
  status: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  amount: number;
  currency: string;
  referenceCode: string;
  qrPayload: string;       // JSON placeholder, P3 không render thật
  expiresAt: string;       // ISO datetime
  paidAt: string | null;
}

/** Chi tiết đơn hàng */
export interface OrderDetail {
  code: string;           // "ATHENA123456"
  /** Trạng thái đơn hàng theo backend enum: NEW | COMPLETED | CANCELLED */
  status: 'NEW' | 'COMPLETED' | 'CANCELLED';
  subtotal: number;
  couponDiscount: number;
  loyaltyDiscount: number;
  total: number;
  currency: string;
  items: OrderItem[];
  payment: Payment | null;
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
}

/** Tóm tắt đơn hàng cho danh sách */
export interface OrderSummary {
  code: string;
  status: 'NEW' | 'COMPLETED' | 'CANCELLED';
  itemCount: number;
  total: number;
  currency: string;
  createdAt: string;
  completedAt: string | null;
  cancelledAt: string | null;
}

/** Params cho getOrders */
export interface GetOrdersParams {
  status?: 'NEW' | 'COMPLETED' | 'CANCELLED';
  page?: number;
  limit?: number;
}

/** Response cho getOrders */
export interface OrdersResult {
  orders: OrderSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
