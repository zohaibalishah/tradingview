const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/db');

const Trade = sequelize.define(
  'Trade',
  {
    userId: { type: DataTypes.INTEGER, allowNull: false },
    symbol: { type: DataTypes.STRING, allowNull: false },
    side: { type: DataTypes.ENUM('buy', 'sell'), allowNull: false },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false }, // in base currency
    leverage: { type: DataTypes.INTEGER, defaultValue: 1 },
    openPrice: { type: DataTypes.DECIMAL(10, 5) }, // entry price
    openTime: { type: DataTypes.DATE },

    status: {
      type: DataTypes.ENUM('open', 'closed', 'stopped', 'tp_hit', 'sl_hit'),
      defaultValue: 'open',
    },

    closePrice: { type: DataTypes.DECIMAL(10, 5) },
    closeTime: { type: DataTypes.DATE },

    profitLoss: { type: DataTypes.DECIMAL(10, 5) },

    stopLoss: { type: DataTypes.DECIMAL(10, 5) },
    takeProfit: { type: DataTypes.DECIMAL(10, 5) },

    // price: { type: DataTypes.FLOAT, allowNull: false },
    volume: { type: DataTypes.FLOAT, allowNull: false },
    // Optional Future Fields
    brokerOrderId: { type: DataTypes.STRING },
    partialClosedAmount: { type: DataTypes.DECIMAL(10, 2) },
    trailingStop: { type: DataTypes.DECIMAL(10, 5) },
    strategyId: { type: DataTypes.INTEGER },
  },
  { timestamps: true }
);
module.exports = Trade;
