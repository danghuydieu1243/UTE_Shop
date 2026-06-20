import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import { logger } from '../logger';

const transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
});

export const sendOtpEmail = async (email: string, code: string, purpose: string): Promise<void> => {
  const subject = purpose === 'register' ? 'Xác thực tài khoản Athena' : 'Đặt lại mật khẩu Athena';
  try {
    await transporter.sendMail({
      from: env.SMTP_FROM,
      to: email,
      subject,
      text: `Mã xác thực của bạn là: ${code} (hết hạn sau 10 phút).`,
    });
  } catch (e) {
    logger.warn({ err: e, email }, 'sendOtpEmail failed');
  }
};
