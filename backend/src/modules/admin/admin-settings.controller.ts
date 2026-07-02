import { Request, Response } from 'express';
import { ok } from '../../shared/http/response';
import { asyncHandler } from '../../shared/http/asyncHandler';
import * as service from './admin-settings.service';
import { PatchCommissionBody } from './admin.schema';

export const getCommission = asyncHandler(async (_req: Request, res: Response) => {
  ok(res, await service.getCommission());
});

export const updateCommission = asyncHandler(async (req: Request, res: Response) => {
  const { ratePercent } = req.body as PatchCommissionBody;
  ok(res, await service.updateCommission(ratePercent));
});
