const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Spread = sequelize.define(
  'Spread',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    symbol: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Trading symbol (e.g., XAUUSD, EURUSD)',
      index: true,
    },
    spread: {
      type: DataTypes.DECIMAL(10, 5),
      allowNull: false,
      defaultValue: 0.1,
      comment: 'Spread value in pips/points',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Whether this spread setting is active',
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Optional description for the spread setting',
    },
    updatedBy: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'User ID who last updated this spread',
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['symbol'],
        name: 'spread_symbol_unique',
      },
      {
        fields: ['isActive'],
        name: 'spread_is_active_idx',
      },
    ],
  }
);

// Instance methods
Spread.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  return values;
};

// Static methods
Spread.findBySymbol = function(symbol) {
  return this.findOne({
    where: { symbol, isActive: true },
  });
};

Spread.getAllActive = function() {
  return this.findAll({
    where: { isActive: true },
    order: [['symbol', 'ASC']],
  });
};

Spread.updateSpread = function(symbol, spread, updatedBy = null) {
  return this.upsert({
    symbol,
    spread,
    updatedBy,
    isActive: true,
  });
};

module.exports = Spread;
