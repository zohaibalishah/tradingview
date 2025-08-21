const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

const WalletTransaction = sequelize.define(
  'WalletTransaction',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    walletId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Wallets',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    type: {
      type: DataTypes.ENUM('deposit', 'withdrawal', 'transfer', 'bonus', 'refund'),
      allowNull: false
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'USD'
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    reference: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
    },
    balanceBefore: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    balanceAfter: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    }
  },
  {
    tableName: 'WalletTransactions',
    timestamps: true,
    indexes: [
      { fields: ['walletId'] },
      { fields: ['userId'] },
      { fields: ['type'] },
      { fields: ['status'] },
      { fields: ['reference'] }
    ]
  }
);


module.exports = WalletTransaction;
