import { Op } from 'sequelize';
import { User, Vendor, Order, OrderItem, Book, WalletTransaction } from '../../db/models';

const COMPLETED = 'COMPLETED';

export async function countUsers(): Promise<number> {
  return User.count({ where: { role: 'user' } });
}

export async function countActiveVendors(): Promise<number> {
  return Vendor.count({ where: { status: 'active' } });
}

export async function countOrdersInPeriod(from: Date, to: Date): Promise<number> {
  return Order.count({ where: { created_at: { [Op.between]: [from, to] } } });
}

/** Đơn COMPLETED trong kỳ — dùng cho revenue KPI + revenueSeries. */
export async function completedOrders(from: Date, to: Date) {
  return Order.findAll({
    where: { status: COMPLETED, completedAt: { [Op.between]: [from, to] } },
    attributes: ['id', 'total', 'completedAt'],
  });
}

/** Users role 'user' tạo trong [from,to] — dùng cho newUsersSeries. */
export async function newUsers(from: Date, to: Date) {
  return User.findAll({
    where: { role: 'user', created_at: { [Op.between]: [from, to] } },
    attributes: ['id', 'created_at'],
  });
}

/** OrderItems trong đơn COMPLETED kỳ, kèm Book + vendor (User→Vendor) + fileFormat. */
export async function completedItems(from: Date, to: Date) {
  return OrderItem.findAll({
    include: [
      {
        model: Order,
        as: 'order',
        required: true,
        where: { status: COMPLETED, completedAt: { [Op.between]: [from, to] } },
        attributes: ['id'],
      },
      {
        model: Book,
        as: 'book',
        attributes: ['id', 'title', 'fileFormat'],
        include: [
          {
            model: User,
            as: 'vendor',
            attributes: ['id', 'fullName'],
            include: [
              {
                model: Vendor,
                as: 'vendor',
                attributes: ['shopName'],
                required: false,
              },
            ],
          },
        ],
      },
    ],
    attributes: ['bookId', 'unitPrice', 'titleSnapshot'],
  });
}

/** 5 đơn gần nhất (mọi trạng thái) kèm thông tin buyer. */
export async function recentOrders(limit = 5) {
  return Order.findAll({
    include: [{ model: User, as: 'user', attributes: ['fullName', 'email'] }],
    attributes: ['code', 'total', 'status', 'created_at'],
    order: [['id', 'DESC']],
    limit,
  });
}

/** Tổng phí sàn (Σ fee_amount) toàn sàn từ sale_credit trong [from,to]. */
export async function platformFeeInPeriod(from: Date, to: Date): Promise<number> {
  const total = await WalletTransaction.sum('feeAmount', {
    where: { type: 'sale_credit', created_at: { [Op.between]: [from, to] } },
  });
  return Number(total ?? 0);
}
