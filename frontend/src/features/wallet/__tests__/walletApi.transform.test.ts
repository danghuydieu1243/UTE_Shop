/** walletApi.transform.test.ts — through-transform test cho breakdown gross/fee/net (Task 7). */
import { describe, it, expect } from 'vitest';
import { transformWalletResponse } from '../walletApi';

describe('transformWalletResponse — breakdown', () => {
  it('giữ nguyên grossAmount/feeAmount/commissionRateBps của sale_credit', () => {
    const raw = {
      availableBalance: 90000, pendingBalance: 0, totalWithdrawn: 0,
      monthlySeries: [],
      transactions: [{
        id: 1, type: 'sale_credit', amount: 90000,
        description: 'Doanh thu đơn hàng', status: 'credited',
        createdAt: '2026-07-02T00:00:00.000Z',
        grossAmount: 100000, feeAmount: 10000, commissionRateBps: 1000,
      }],
    };
    const out = transformWalletResponse(raw as any, { pagination: { page: 1, limit: 10, total: 1, totalPages: 1 } } as any);
    expect(out.transactions[0].grossAmount).toBe(100000);
    expect(out.transactions[0].feeAmount).toBe(10000);
    expect(out.transactions[0].commissionRateBps).toBe(1000);
  });
});
