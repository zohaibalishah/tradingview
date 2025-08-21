const { DataTypes } = require('sequelize');
const {sequelize} = require('../config/db');
const User = require('./User.model');

const DepositRequest = sequelize.define('DepositRequest', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  adminId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    validate: {
      min: 0.01
    }
  },
  currency: {
    type: DataTypes.STRING(10),
    allowNull: false,
    defaultValue: 'USD'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'completed'),
    allowNull: false,
    defaultValue: 'pending'
  },
  type: {
    type: DataTypes.ENUM('deposit', 'bonus', 'refund', 'adjustment'),
    allowNull: false,
    defaultValue: 'deposit'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  reference: {
    type: DataTypes.STRING(100),
    allowNull: true,
    unique: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  processedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  processedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'DepositRequests',
  timestamps: true,
  indexes: [
    {
      fields: ['userId']
    },
    {
      fields: ['adminId']
    },
    {
      fields: ['status']
    },
    {
      fields: ['type']
    },
    {
      fields: ['reference']
    }
  ]
});
// Deposit Request associations
DepositRequest.belongsTo(User, { foreignKey: 'userId', as: 'user' });
DepositRequest.belongsTo(User, { foreignKey: 'adminId', as: 'admin' });
DepositRequest.belongsTo(User, { foreignKey: 'processedBy', as: 'processedByUser' });

User.hasMany(DepositRequest, { foreignKey: 'userId', as: 'depositRequests' });
User.hasMany(DepositRequest, { foreignKey: 'adminId', as: 'adminDepositRequests' });
User.hasMany(DepositRequest, { foreignKey: 'processedBy', as: 'processedDepositRequests' });

module.exports = DepositRequest;
