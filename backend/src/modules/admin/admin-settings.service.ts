import * as settings from '../settings/settings.service';
import { CommissionDTO } from './admin.schema';

export async function getCommission(): Promise<CommissionDTO> {
  const rateBps = await settings.getCommissionRateBps();
  return { rateBps, ratePercent: rateBps / 100 };
}

export async function updateCommission(ratePercent: number): Promise<CommissionDTO> {
  const rateBps = Math.round(ratePercent * 100);
  await settings.setCommissionRateBps(rateBps);
  return { rateBps, ratePercent: rateBps / 100 };
}
