const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const Category = require('./Category.model');

const Symbol = sequelize.define('Symbol', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  symbol: {
    type: DataTypes.STRING(20),
    allowNull: false,
    unique: true,
    validate: {
      notEmpty: true,
      len: [1, 20]
    }
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 100]
    }
  },
  displayName: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  categoryId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'categories',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('forex', 'commodity', 'crypto', 'stock', 'index'),
    allowNull: false,
    defaultValue: 'forex'
  },
  baseCurrency: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  quoteCurrency: {
    type: DataTypes.STRING(10),
    allowNull: true
  },
  pipValue: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 10.00
  },
  minLotSize: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.01
  },
  maxLotSize: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 100.00
  },
  defaultSpread: {
    type: DataTypes.DECIMAL(10, 5),
    allowNull: false,
    defaultValue: 0.00010
  },
  minSpread: {
    type: DataTypes.DECIMAL(10, 5),
    allowNull: false,
    defaultValue: 0.00005
  },
  maxSpread: {
    type: DataTypes.DECIMAL(10, 5),
    allowNull: false,
    defaultValue: 0.00100
  },
  pricePrecision: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5
  },
  volumePrecision: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 2
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  isTradable: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  isPopular: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  externalSymbol: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'External symbol for data providers (e.g., OANDA:XAU_USD)'
  },
  dataProvider: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: 'OANDA',
    comment: 'Data provider for this symbol'
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'symbols',
  timestamps: true,
  paranoid: true, // This enables soft deletes
  indexes: [
    {
      unique: true,
      fields: ['symbol']
    },
    {
      fields: ['categoryId']
    },
    {
      fields: ['type']
    },
    {
      fields: ['isActive']
    },
    {
      fields: ['isTradable']
    },
    {
      fields: ['isPopular']
    },
    {
      fields: ['sortOrder']
    },
    {
      fields: ['externalSymbol']
    }
  ]
});
// Category and Symbol associations
Category.hasMany(Symbol, { foreignKey: 'categoryId', as: 'symbols' });
Symbol.belongsTo(Category, { foreignKey: 'categoryId', as: 'category' });

module.exports = Symbol;
  