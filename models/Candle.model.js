const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/db');

const Candle = sequelize.define(
  'Candle',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    symbol: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'OANDA:XAU_USD',
      index: true,
    },
    interval: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '1m',
      comment: 'Time interval: 1m, 5m, 15m, 30m, 1h, 4h, 1d',
    },
    time: {
      type: DataTypes.BIGINT,
      allowNull: false,
      comment: 'Unix timestamp in seconds',
      index: true,
    },
    open: {
      type: DataTypes.DECIMAL(15, 5),
      allowNull: false,
    },
    high: {
      type: DataTypes.DECIMAL(15, 5),
      allowNull: false,
    },
    low: {
      type: DataTypes.DECIMAL(15, 5),
      allowNull: false,
    },
    close: {
      type: DataTypes.DECIMAL(15, 5),
      allowNull: false,
    },
    volume: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
    },
    source: {
      type: DataTypes.ENUM('socket', 'api', 'calculated'),
      allowNull: false,
      defaultValue: 'socket',
      comment: 'Data source: socket (real-time), api (historical), calculated (derived)',
    },
    isComplete: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether this candle is complete (closed) or still updating',
    },
  },
  {
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ['symbol', 'interval', 'time'],
        name: 'candle_unique_symbol_interval_time',
      },
      {
        fields: ['symbol', 'interval', 'time'],
        name: 'candle_symbol_interval_time_idx',
      },
      {
        fields: ['time'],
        name: 'candle_time_idx',
      },
      {
        fields: ['symbol'],
        name: 'candle_symbol_idx',
      },
      {
        fields: ['isComplete'],
        name: 'candle_is_complete_idx',
      },
    ],
  }
);

// Instance methods
Candle.prototype.toBarFormat = function() {
  return {
    time: this.time,
    open: parseFloat(this.open),
    high: parseFloat(this.high),
    low: parseFloat(this.low),
    close: parseFloat(this.close),
    volume: parseFloat(this.volume),
  };
};

// Static methods
Candle.findBySymbolAndInterval = function(symbol, interval, limit = 1000, offset = 0) {
  return this.findAll({
    where: { symbol, interval },
    order: [['time', 'ASC']],
    limit,
    offset,
  });
};

Candle.findByTimeRange = function(symbol, interval, from, to, limit = 1000) {
  return this.findAll({
    where: {
      symbol,
      interval,
      time: {
        [Op.gte]: from,
        [Op.lte]: to,
      },
    },
    order: [['time', 'ASC']],
    limit,
  });
};

Candle.findLatest = function(symbol, interval, limit = 1) {
  return this.findAll({
    where: { symbol, interval },
    order: [['time', 'DESC']],
    limit,
  });
};

Candle.findIncomplete = function(symbol, interval) {
  return this.findOne({
    where: { symbol, interval, isComplete: false },
    order: [['time', 'DESC']],
  });
};

Candle.upsertCandle = function(candleData) {
  return this.upsert(candleData, {
    where: {
      symbol: candleData.symbol,
      interval: candleData.interval,
      time: candleData.time,
    },
  });
};

module.exports = Candle;
