const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

const Wallet = sequelize.define(
  'wallet',
  {
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    balance: {
      type: DataTypes.FLOAT,
      allowNull: false,
      defaultValue: 0,
    },
    currency: {
      type: DataTypes.STRING,
      defaultValue: 'PKR',
    },
  },
  { timestamps: true }
);

module.exports = Wallet;
