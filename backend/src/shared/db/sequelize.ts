import { Sequelize } from 'sequelize';
import { env } from '../../config/env';

export const sequelize = env.NODE_ENV === 'test'
  ? new Sequelize('sqlite::memory:', {
      logging: false,
      // Khớp mapping timestamp với MySQL prod để cột created_at/updated_at hoạt động
      // nhất quán trên cả 2 dialect (tránh created_at null trong test sqlite).
      define: { timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' },
    })
  : new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
      host: env.DB_HOST,
      port: env.DB_PORT,
      dialect: 'mysql',
      logging: false,
      define: { underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' },
    });
