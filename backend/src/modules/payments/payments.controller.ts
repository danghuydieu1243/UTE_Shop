/**
 * Payments controller — xử lý HTTP request cho payments.
 */

import { Request, Response } from 'express';
import { ok } from '../../shared/http/response';
import { completePayment } from './payments.service';

/**
 * POST /api/v1/payments/:id/simulate
 * Giả lập thanh toán thành công cho payment có id = :id.
 */
export async function simulatePayment(req: Request, res: Response): Promise<void> {
  const paymentId = parseInt(req.params.id, 10);
  const dto = await completePayment(paymentId, { userId: req.user!.id });
  ok(res, dto);
}
