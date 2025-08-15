const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');
const Wallet = require('./Wallet.model');

const WalletTransaction  = sequelize.define(
  'walletTransaction ',
  {
    type: { type: DataTypes.ENUM('deposit', 'withdrawal'), allowNull: false },
    amount: { type: DataTypes.DECIMAL(18, 2), allowNull: false },
    status: {
      type: DataTypes.ENUM('pending', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    reference: DataTypes.STRING,
    // proofImage: DataTypes.STRING,
  },
  { timestamps: true }
);
WalletTransaction.belongsTo(Wallet, { foreignKey: 'walletId' });



// WalletTransaction.associate = (models) => {
//   WalletTransaction.belongsTo(models.User, { foreignKey: 'userId' });
// };
module.exports = WalletTransaction ;
