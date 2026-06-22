import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class LoyaltyAccount extends Model<InferAttributes<LoyaltyAccount>, InferCreationAttributes<LoyaltyAccount>> {
  declare userId: number;
  declare balancePoints: CreationOptional<number>;
  declare updated_at: CreationOptional<Date>;
}

LoyaltyAccount.init(
  {
    userId: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, field: 'user_id' },
    balancePoints: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0, field: 'balance_points' },
    updated_at: DataTypes.DATE,
  },
  {
    sequelize,
    tableName: 'loyalty_accounts',
    timestamps: false,
    updatedAt: 'updated_at',
    createdAt: false,
  },
);
