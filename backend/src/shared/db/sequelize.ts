import { Sequelize } from 'sequelize';
import { env } from '../../config/env';

export const sequelize = env.NODE_ENV === 'test'
  ? new Sequelize('sqlite::memory:', { logging: false })
  : new Sequelize(env.DB_NAME, env.DB_USER, env.DB_PASSWORD, {
      host: env.DB_HOST,
      port: env.DB_PORT,
      dialect: 'mysql',
      logging: false,
      define: { underscored: true, timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' },
    });
