import 'dotenv/config';
import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(3306),
  DB_NAME: z.string().default('uteshop'),
  DB_USER: z.string().default('root'),
  DB_PASSWORD: z.string().default(''),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  SMTP_HOST: z.string().default('sandbox.smtp.mailtrap.io'),
  SMTP_PORT: z.coerce.number().default(2525),
  SMTP_USER: z.string().default(''),
  SMTP_PASS: z.string().default(''),
  SMTP_FROM: z.string().default('noreply@uteshop.com'),
  SEED_ADMIN_EMAIL: z.string().email().default('admin@uteshop.com'),
  SEED_ADMIN_PASSWORD: z.string().default('Admin@12345'),
  SEED_MANAGER_EMAIL: z.string().email().default('manager@uteshop.com'),
  SEED_MANAGER_PASSWORD: z.string().default('Manager@1234'),
  UPLOAD_DIR: z.string().default('./uploads'),
  DOWNLOAD_URL_SECRET: z.string().min(16).optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}
export const env = {
  ...parsed.data,
  // Nếu không cấu hình riêng, dùng chung JWT_ACCESS_SECRET để ký download token
  DOWNLOAD_URL_SECRET: parsed.data.DOWNLOAD_URL_SECRET ?? parsed.data.JWT_ACCESS_SECRET,
};
export type Env = z.infer<typeof schema> & { DOWNLOAD_URL_SECRET: string };
