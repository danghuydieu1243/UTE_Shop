import { DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';
import { sequelize } from '../../shared/db/sequelize';

export class Setting extends Model<InferAttributes<Setting>, InferCreationAttributes<Setting>> {
  declare key: string;
  declare value: string;
  declare updated_at: CreationOptional<Date>;
}

Setting.init({
  key: { type: DataTypes.STRING(64), primaryKey: true },
  value: { type: DataTypes.STRING(255), allowNull: false },
  updated_at: DataTypes.DATE,
}, {
  sequelize,
  tableName: 'settings',
  timestamps: true,
  createdAt: false,
  updatedAt: 'updated_at',
});
