const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

const Wallet = sequelize.define(
  'Wallet',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true, // Each user can have only one wallet
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    balance: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0, // Balance cannot be negative
      }
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: 'USD',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
    }
  },
  {
    tableName: 'Wallets',
    timestamps: true,
    indexes: [
      { unique: true, fields: ['userId'] }, // Ensure one wallet per user
      { fields: ['currency'] },
      { fields: ['isActive'] }
    ],
    validate: {
      // Model-level validation to ensure only one wallet per user
      oneWalletPerUser() {
        if (this.userId) {
          return Wallet.findOne({ where: { userId: this.userId } })
            .then(wallet => {
              if (wallet && wallet.id !== this.id) {
                throw new Error('User already has a wallet');
              }
            });
        }
      }
    }
  }
);

module.exports = Wallet;
