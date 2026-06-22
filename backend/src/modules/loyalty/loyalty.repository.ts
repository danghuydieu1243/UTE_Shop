import { LoyaltyAccount, LoyaltyTransaction } from '../../db/models';
import { LoyaltyTxDTO, PaginationMeta } from './loyalty.schema';

export async function findOrCreateAccount(userId: number): Promise<LoyaltyAccount> {
  const [account] = await LoyaltyAccount.findOrCreate({
    where: { userId },
    defaults: { userId, balancePoints: 0 },
  });
  return account;
}

export async function listTransactions(
  userId: number,
  page: number,
  limit: number,
): Promise<{ rows: LoyaltyTransaction[]; count: number }> {
  const { rows, count } = await LoyaltyTransaction.findAndCountAll({
    where: { userId },
    order: [['created_at', 'DESC']],
    limit,
    offset: (page - 1) * limit,
  });
  return { rows, count };
}

export function mapTxDTO(tx: LoyaltyTransaction): LoyaltyTxDTO {
  return {
    type: tx.type,
    points: Number(tx.points),
    note: tx.note ?? null,
    orderId: tx.orderId != null ? Number(tx.orderId) : null,
    reviewId: tx.reviewId != null ? Number(tx.reviewId) : null,
    createdAt: tx.created_at,
  };
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}
