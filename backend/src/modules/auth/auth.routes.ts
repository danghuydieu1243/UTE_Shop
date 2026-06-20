import { Router } from 'express';
import { validate } from '../../shared/middleware/validate';
import { authRateLimit } from '../../shared/middleware/rateLimit';
import { auth } from '../../shared/middleware/auth';
import * as c from './auth.controller';
import {
  registerSchema, verifyOtpSchema, resendOtpSchema, loginSchema,
  refreshSchema, forgotSchema, resetSchema,
} from './auth.schema';

export const authRouter = Router();

authRouter.post('/register', authRateLimit, validate(registerSchema), c.register);
authRouter.post('/verify-otp', authRateLimit, validate(verifyOtpSchema), c.verifyOtp);
authRouter.post('/resend-otp', authRateLimit, validate(resendOtpSchema), c.resendOtp);
authRouter.post('/login', authRateLimit, validate(loginSchema), c.login);
authRouter.post('/refresh', validate(refreshSchema), c.refresh);
authRouter.post('/logout', validate(refreshSchema), c.logout);
authRouter.post('/forgot-password', authRateLimit, validate(forgotSchema), c.forgotPassword);
authRouter.post('/reset-password', authRateLimit, validate(resetSchema), c.resetPassword);
authRouter.get('/me', auth, c.me);
