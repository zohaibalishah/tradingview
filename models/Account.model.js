const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Wallet = require('../models/Wallet.model');
const Trade = require('./Trading.model');

const WalletTransaction = require('./WalletTransaction.model');

const Account = sequelize.define(
  'account',
  {
    type: { type: DataTypes.ENUM('demo', 'real'), allowNull: false },
    balance: { type: DataTypes.DECIMAL(18, 2), defaultValue: 0.0 },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: false },
    status: {
      type: DataTypes.ENUM('active', 'pending_verification', 'suspended'),
      defaultValue: 'active'
    }
  },
  {
    timestamps: true,
  }
);



// WalletTransaction
Account.hasMany(WalletTransaction, { foreignKey: 'accountId' });
WalletTransaction.belongsTo(Account, { foreignKey: 'accountId' });


// trade
Account.hasMany(Trade, { foreignKey: 'accountId' });
Trade.belongsTo(Account, { foreignKey: 'accountId' });


Wallet.hasMany(WalletTransaction, { foreignKey: 'walletId' });


module.exports = Account;

// brokerId: FK,       // Admin who owns this account (if broker-controlled)


// balance: DECIMAL,               // Current tradable balance
// equity: DECIMAL,                // balance + open trade P&L
// marginUsed: DECIMAL,            // For margin-based trading (optional)
// freeMargin: DECIMAL,            // equity - marginUsed (optional)

// depositTotal: DECIMAL,          // Sum of all user funding
// withdrawalTotal: DECIMAL,       // If you ever allow user withdrawals
// totalProfitLoss: DECIMAL,       // Historical P&L (trading only)

// leverage: INT,                  // e.g., 100 for 1:100

