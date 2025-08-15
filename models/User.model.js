const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { getHashValue } = require('../helpers/hash.helper');
const constants = require('../config/constants');
const Wallet = require('./Wallet.model');
const Account = require('./Account.model');


const User = sequelize.define(
  'user',
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    phoneVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: function () {
        if (this.email) {
          return this.email.split('@')[0];
        } else if (this.phone && !this.email) {
          return `user_${this.phone}`;
        }
        return 'User_' + Math.random().toString(36).substring(2, 15);
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null,
    },
    googleId: {
      type: DataTypes.STRING,
      defaultValue: null,
    },
    profilePic: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: constants.USER_ROLES.USER,
    },
    dob: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'Male',
    },

    isDeleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    deletedDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    accountStatus: {
      type: DataTypes.ENUM(
        'Approved',
        'Deactivated',
        'Pending',
        'Freezed',
        'Rejected'
      ),
      defaultValue: constants.ACCOUNT_STATUSES.PENDING,
    },
    deactivatedDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    mode: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'light',
    },
    language: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'english',
    },
    country: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    area: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    address: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lastLogin: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    resetToken: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    tokenVersion: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    otp: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fotgototp: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    otpGeneratedTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    otpExpirationTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    fotgototpGeneratedTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    fotgototpExpirationTime: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    defaultCountry: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'PK',
    },
    mobileTokens: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
    },
    activeAccountId: DataTypes.INTEGER
  },
  {
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          user.password = await getHashValue(user.password);
        }
      },
      afterCreate: async (user, options) => {

   // // Create demo account
      // const demoAccount = await Account.create({
      //   userId: newUser.id,
      //   type: 'demo',
      //   balance: 10000,
      //   isActive: true,
      //   status: 'active',
      // });

      // Create real account
      await Account.create({
        userId: user.id,
        type: 'real',
        balance: 0,
        isActive: true,
        status: 'pending_verification',
      });

      // Create wallet for real account
      await Wallet.create({
        userId: user.id,
        availableBalance: 0,
      });
    
      },
    },
  }
);
//user
User.hasMany(Account);
Account.belongsTo(User, { foreignKey: 'userId' });

// wallet-user
User.hasOne(Wallet, { foreignKey: 'userId',as:'wallet' });
Wallet.belongsTo(User, { foreignKey: 'userId' });
// User.hasMany(models.WalletTransaction, { foreignKey: 'userId' });

module.exports = User;
