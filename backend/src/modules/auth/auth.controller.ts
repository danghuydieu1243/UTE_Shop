import { Request } from 'express';
import { asyncHandler } from '../../shared/http/asyncHandler';
import { ok, created } from '../../shared/http/response';
import * as authService from './auth.service';

const metaOf = (req: Request) => ({
  userAgent: (req.headers['user-agent'] as string) ?? null,
  ip: req.ip ?? null,
});

export const register = asyncHandler(async (req, res) => {
  created(res, await authService.register(req.body));
});

export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, purpose, code } = req.body;
  if (purpose === 'register') {
    return void ok(res, await authService.verifyOtpRegister({ email, code }, metaOf(req)));
  }
  ok(res, await authService.verifyOtpReset({ email, code }));
});

export const resendOtp = asyncHandler(async (req, res) => {
  ok(res, await authService.resendOtp(req.body));
});

export const login = asyncHandler(async (req, res) => {
  ok(res, await authService.login(req.body, metaOf(req)));
});

export const refresh = asyncHandler(async (req, res) => {
  ok(res, await authService.refresh(req.body.refreshToken, metaOf(req)));
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.body.refreshToken);
  res.status(204).send();
});

export const forgotPassword = asyncHandler(async (req, res) => {
  ok(res, await authService.forgotPassword(req.body));
});

export const resetPassword = asyncHandler(async (req, res) => {
  ok(res, await authService.resetPassword(req.body));
});

export const me = asyncHandler(async (req, res) => {
  ok(res, await authService.getMe(req.user!.id));
});
