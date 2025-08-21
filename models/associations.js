const User = require('./User.model');
const Spread = require('./Spread.model');
const Category = require('./Category.model');
const Symbol = require('./Symbol.model');
const DepositRequest = require('./DepositRequest.model');
const WithdrawalRequest = require('./WithdrawalRequest.model');
const Wallet = require('./Wallet.model');
const WalletTransaction = require('./WalletTransaction.model');

// Spread associations
Spread.belongsTo(User, { foreignKey: 'updatedBy', as: 'updatedByUser' });
User.hasMany(Spread, { foreignKey: 'updatedBy' });

// Category associations
Category.hasMany(Symbol, { foreignKey: 'categoryId', as: 'symbols' });
Symbol.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

// Deposit Request associations
DepositRequest.belongsTo(User, { foreignKey: 'userId', as: 'user' });
DepositRequest.belongsTo(User, { foreignKey: 'adminId', as: 'admin' });
DepositRequest.belongsTo(User, { foreignKey: 'processedBy', as: 'processedByUser' });

User.hasMany(DepositRequest, { foreignKey: 'userId', as: 'depositRequests' });
User.hasMany(DepositRequest, { foreignKey: 'adminId', as: 'adminDepositRequests' });
User.hasMany(DepositRequest, { foreignKey: 'processedBy', as: 'processedDepositRequests' });


// Wallet associations
Wallet.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Wallet, { foreignKey: 'userId', as: 'wallets' });

// Wallet Transaction associations
WalletTransaction.belongsTo(Wallet, { foreignKey: 'walletId', as: 'wallet' });
WalletTransaction.belongsTo(User, { foreignKey: 'userId', as: 'user' });

Wallet.hasMany(WalletTransaction, { foreignKey: 'walletId', as: 'transactions' });
User.hasMany(WalletTransaction, { foreignKey: 'userId', as: 'walletTransactions' });

module.exports = {
  User,
  Spread,
  Category,
  Symbol,
  DepositRequest,
  WithdrawalRequest,
  Wallet,
  WalletTransaction
};
