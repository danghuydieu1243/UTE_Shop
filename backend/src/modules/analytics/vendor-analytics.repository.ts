import { Op } from 'sequelize';
import { Book, Order, OrderItem, Review, Author } from '../../db/models';

const COMPLETED = 'COMPLETED';

/** order_items COMPLETED của vendor trong [from,to] kèm completedAt (cho revenue/series/topBooks). */
export async function completedItemsForVendor(vendorUserId: number, from: Date, to: Date) {
  return OrderItem.findAll({
    where: { vendorUserId },
    include: [
      {
        model: Order, as: 'order', required: true,
        where: { status: COMPLETED, completedAt: { [Op.between]: [from, to] } },
        attributes: ['id', 'completedAt'],
      },
      { model: Book, as: 'book', attributes: ['id', 'title'], include: [{ model: Author, as: 'author', attributes: ['name'] }] },
    ],
    attributes: ['id', 'bookId', 'unitPrice', 'titleSnapshot'],
  });
}

export async function productsOnSale(vendorUserId: number): Promise<number> {
  return Book.count({ where: { vendorUserId, status: 'published' } });
}

export async function avgRatingForVendor(vendorUserId: number): Promise<number> {
  const books = await Book.findAll({ where: { vendorUserId }, attributes: ['id'] });
  const ids = books.map((b) => Number(b.id));
  if (ids.length === 0) return 0;
  const reviews = await Review.findAll({ where: { bookId: { [Op.in]: ids } }, attributes: ['rating'] });
  if (reviews.length === 0) return 0;
  const sum = reviews.reduce((s, r) => s + Number((r as any).rating), 0);
  return Math.round((sum / reviews.length) * 10) / 10;
}

/** Đơn NEW gần đây có item của vendor (read-only). */
export async function recentNewOrdersForVendor(vendorUserId: number, limit = 5) {
  const items = await OrderItem.findAll({
    where: { vendorUserId },
    include: [{ model: Order, as: 'order', required: true, where: { status: 'NEW' }, attributes: ['id', 'code', 'total', 'created_at'] }],
    attributes: ['titleSnapshot', 'orderId'],
    order: [[{ model: Order, as: 'order' }, 'id', 'DESC']],
  });
  // gom theo order, lấy title item đầu, tối đa `limit`
  const seen = new Set<number>();
  const out: { code: string; title: string; total: number }[] = [];
  for (const it of items) {
    const o = (it as any).order;
    if (!o || seen.has(Number(o.id))) continue;
    seen.add(Number(o.id));
    out.push({ code: o.code, title: it.titleSnapshot, total: Number(o.total) });
    if (out.length >= limit) break;
  }
  return out;
}
