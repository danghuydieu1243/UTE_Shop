/** walletApi.test.ts — through-transform test.
 *  Kiểm tra transformWalletResponse: camelCase fields, monthlySeries/transactions là arrays, pagination.
 */
import { describe, it, expect } from 'vitest';
import { transformWalletResponse } from '../walletApi';
import type { EnvelopeMeta } from '../../../shared/api/baseApi';

const RAW_DATA = {
  availableBalance: 3_500_000,
  pendingBalance: 500_000,
  totalWithdrawn: 1_000_000,
  monthlySeries: [
    { month: '2026-04', value: 800_000 },
    { month: '2026-05', value: 1_200_000 },
    { month: '2026-06', value: 1_500_000 },
  ],
  transactions: [
    {
      id: 1,
      type: 'sale',
      amount: 90_000,
      description: 'Bán "Clean Code"',
      status: 'completed',
      createdAt: '2026-06-01T10:00:00Z',
    },
    {
      id: 2,
      type: 'withdrawal',
      amount: 500_000,
      description: 'Rút tiền về TK **** 1234',
      status: 'pending',
      createdAt: '2026-06-02T10:00:00Z',
    },
  ],
};

const META: EnvelopeMeta = {
  pagination: { page: 1, limit: 10, total: 2, totalPages: 1 },
};

describe('transformWalletResponse', () => {
  it('returns camelCase availableBalance', () => {
    const result = transformWalletResponse(RAW_DATA, META);
    expect(result.availableBalance).toBe(3_500_000);
  });

  it('returns camelCase pendingBalance', () => {
    const result = transformWalletResponse(RAW_DATA, META);
    expect(result.pendingBalance).toBe(500_000);
  });

  it('returns camelCase totalWithdrawn', () => {
    const result = transformWalletResponse(RAW_DATA, META);
    expect(result.totalWithdrawn).toBe(1_000_000);
  });

  it('monthlySeries is an array', () => {
    const result = transformWalletResponse(RAW_DATA, META);
    expect(Array.isArray(result.monthlySeries)).toBe(true);
    expect(result.monthlySeries).toHaveLength(3);
  });

  it('monthlySeries items have {month, value}', () => {
    const result = transformWalletResponse(RAW_DATA, META);
    expect(result.monthlySeries[0]).toMatchObject({ month: '2026-04', value: 800_000 });
  });

  it('transactions is an array', () => {
    const result = transformWalletResponse(RAW_DATA, META);
    expect(Array.isArray(result.transactions)).toBe(true);
    expect(result.transactions).toHaveLength(2);
  });

  it('transactions items have camelCase createdAt', () => {
    const result = transformWalletResponse(RAW_DATA, META);
    expect(result.transactions[0].createdAt).toBe('2026-06-01T10:00:00Z');
  });

  it('pagination is merged from meta', () => {
    const result = transformWalletResponse(RAW_DATA, META);
    expect(result.pagination).toMatchObject({ page: 1, limit: 10, total: 2, totalPages: 1 });
  });

  it('monthlySeries defaults to [] when undefined', () => {
    const raw = { ...RAW_DATA, monthlySeries: undefined as unknown as typeof RAW_DATA['monthlySeries'] };
    const result = transformWalletResponse(raw, META);
    expect(Array.isArray(result.monthlySeries)).toBe(true);
    expect(result.monthlySeries).toHaveLength(0);
  });

  it('transactions defaults to [] when undefined', () => {
    const raw = { ...RAW_DATA, transactions: undefined as unknown as typeof RAW_DATA['transactions'] };
    const result = transformWalletResponse(raw, META);
    expect(Array.isArray(result.transactions)).toBe(true);
    expect(result.transactions).toHaveLength(0);
  });

  it('pagination defaults when meta is undefined', () => {
    const result = transformWalletResponse(RAW_DATA, undefined as unknown as EnvelopeMeta);
    expect(result.pagination).toMatchObject({ page: 1, limit: 10, total: 0, totalPages: 0 });
  });
});
