const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_DATABASE,
  process.env.DB_USERNAME,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: false,
  }
);

const databaseLoader = async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log('DB connection has been established successfully');
  } catch (error) {
    switch (true) {
      case error.message.includes('getaddrinfo ENOTFOUND'):
        console.error('Unable to connect to the database');
        break;
      case error.message.includes(
        'Too many keys specified; max 64 keys allowed'
      ):
        console.error(
          'Unable to connect to the database: Too many keys specified; max 64 keys allowed'
        );
        break;
      default:
        console.error('Unable to connect to the database:', error.message);
    }
  }
};

const db = {
  sequelize,
  Sequelize,
  databaseLoader,
};

module.exports = db;
