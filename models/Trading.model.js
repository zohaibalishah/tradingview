const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

const Trade = sequelize.define(
  'Trade',
  {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    accountId: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
    symbol: { type: DataTypes.STRING, allowNull: false },
    side: { type: DataTypes.ENUM('BUY', 'SELL'), allowNull: false },
    volume: { type: DataTypes.FLOAT, allowNull: false }, // lot size
    entryPrice: { type: DataTypes.FLOAT, allowNull: false }, //openPrice
    openTime: { type: DataTypes.DATE },
    stopLoss: { type: DataTypes.DECIMAL(10, 5) },
    takeProfit: { type: DataTypes.DECIMAL(10, 5) },
    status: {
      type: DataTypes.ENUM('open', 'closed', 'stopped', 'tp_hit', 'sl_hit'),
      defaultValue: 'open',
    },
    closePrice: { type: DataTypes.DECIMAL(10, 5) },
    closeTime: { type: DataTypes.DATE }, //exitPrice
    profitLoss: { type: DataTypes.DECIMAL(10, 5), defaultValue: 0 },


    // leverage: { type: DataTypes.INTEGER, defaultValue: 1 },

    // brokerOrderId: { type: DataTypes.STRING },
    // partialClosedAmount: { type: DataTypes.DECIMAL(10, 2) },
    // trailingStop: { type: DataTypes.DECIMAL(10, 5) },
    // strategyId: { type: DataTypes.INTEGER },
  },
  { timestamps: true }
);


module.exports = Trade;
