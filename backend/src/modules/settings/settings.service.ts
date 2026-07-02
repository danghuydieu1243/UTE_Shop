import * as repo from './settings.repository';

export const DEFAULT_COMMISSION_RATE_BPS = 1000; // 10.00%
const COMMISSION_KEY = 'commission_rate_bps';

export function computeCommission(gross: number, bps: number): { fee: number; net: number } {
  const fee = Math.floor((gross * bps) / 10000);
  return { fee, net: gross - fee };
}

export async function getCommissionRateBps(): Promise<number> {
  const raw = await repo.get(COMMISSION_KEY);
  const n = raw == null ? NaN : parseInt(raw, 10);
  return Number.isInteger(n) && n >= 0 ? n : DEFAULT_COMMISSION_RATE_BPS;
}

export async function setCommissionRateBps(bps: number): Promise<void> {
  await repo.set(COMMISSION_KEY, String(bps));
}
