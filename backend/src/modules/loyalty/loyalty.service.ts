import * as repo from './loyalty.repository';
import { LoyaltyDTO } from './loyalty.schema';

export async function getLoyalty(
  userId: number,
  page: number,
  limit: number,
): Promise<LoyaltyDTO> {
  const account = await repo.findOrCreateAccount(userId);
  const { rows, count } = await repo.listTransactions(userId, page, limit);
  return {
    balance: Number(account.balancePoints),
    transactions: rows.map(repo.mapTxDTO),
    pagination: repo.buildPaginationMeta(page, limit, count),
  };
}
