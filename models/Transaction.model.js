const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

const TradeTransaction = sequelize.define(
  'Transaction',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    walletId: { type: DataTypes.INTEGER, allowNull: false },
    type: { type: DataTypes.ENUM("deposit", "withdraw", "transfer") },
    amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    status: { type: DataTypes.ENUM("pending", "approved", "rejected"), defaultValue: "pending" }
  },
  { timestamps: true }
);
module.exports = Transaction;
