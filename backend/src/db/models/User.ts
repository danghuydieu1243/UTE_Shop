import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
  declare id: CreationOptional<number>;
  declare email: string;
  declare passwordHash: string;
  declare role: string;
  declare fullName: string;
  declare phone: CreationOptional<string | null>;
  declare status: CreationOptional<string>;
  declare emailVerifiedAt: CreationOptional<Date | null>;
  declare lastLoginAt: CreationOptional<Date | null>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

User.init(
  {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
    passwordHash: { type: DataTypes.STRING(255), allowNull: false, field: 'password_hash' },
    role: { type: DataTypes.STRING(16), allowNull: false },
    fullName: { type: DataTypes.STRING(120), allowNull: false, field: 'full_name' },
    phone: { type: DataTypes.STRING(20), allowNull: true },
    status: { type: DataTypes.STRING(16), allowNull: false, defaultValue: 'pending' },
    emailVerifiedAt: { type: DataTypes.DATE, allowNull: true, field: 'email_verified_at' },
    lastLoginAt: { type: DataTypes.DATE, allowNull: true, field: 'last_login_at' },
    created_at: DataTypes.DATE,
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'users',
    defaultScope: { attributes: { exclude: ['passwordHash'] } },
    scopes: { withSecret: { attributes: { include: ['passwordHash'] } } },
  },
);
