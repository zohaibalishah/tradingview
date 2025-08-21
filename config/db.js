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
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    
    // Connection pooling for better performance
    pool: {
      max: 20, // Maximum number of connection instances
      min: 5,  // Minimum number of connection instances
      acquire: 30000, // Maximum time, in milliseconds, that pool will try to get connection before throwing error
      idle: 10000, // Maximum time, in milliseconds, that a connection can be idle before being released
    },
    
    // Query timeout
    query: {
      timeout: 30000, // 30 seconds
    },
    
    // Retry configuration
    retry: {
      max: 3, // Maximum number of retries
      timeout: 10000, // Timeout between retries
    },
    
    // Additional security settings
    dialectOptions: {
      // SSL configuration for production
      ...(process.env.NODE_ENV === 'production' && {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }),
      
      // Connection timeout
      connectTimeout: 60000,
    },
  }
);

const databaseLoader = async () => {
  let retries = 3;
  
  while (retries > 0) {
    try {
      console.log('🔄 Attempting to connect to database...');
      
      // Test the connection
      await sequelize.authenticate();
      console.log('✅ Database connection has been established successfully');
      
      // Sync models with database
      console.log('🔄 Syncing database models...');
      await sequelize.sync({ alter: true });
      console.log('✅ Database models synced successfully');
      
      // Initialize admin user
      await initializeAdminUser();
      
      // Test a simple query
      await sequelize.query('SELECT 1');
      console.log('✅ Database is ready for queries');
      
      return;
    } catch (error) {
      retries--;
      console.error(`❌ Database connection attempt failed (${3 - retries}/3):`, error.message);
      
      if (retries === 0) {
        console.error('❌ Failed to connect to database after 3 attempts');
        
        // Provide specific error messages for common issues
        switch (true) {
          case error.message.includes('getaddrinfo ENOTFOUND'):
            console.error('💡 Unable to resolve database host. Please check your DB_HOST configuration.');
            break;
          case error.message.includes('ECONNREFUSED'):
            console.error('💡 Database server is not running or not accessible. Please check if the database server is running.');
            break;
          case error.message.includes('ER_ACCESS_DENIED_ERROR'):
            console.error('💡 Access denied. Please check your database username and password.');
            break;
          case error.message.includes('ER_BAD_DB_ERROR'):
            console.error('💡 Database does not exist. Please create the database first.');
            break;
          case error.message.includes('Too many keys specified; max 64 keys allowed'):
            console.error('💡 Too many keys specified. This is usually a MySQL configuration issue.');
            break;
          default:
            console.error('💡 Please check your database configuration and ensure the database server is running.');
        }
        
        // In production, you might want to exit the process
        if (process.env.NODE_ENV === 'production') {
          process.exit(1);
        }
      } else {
        console.log(`⏳ Retrying in 5 seconds... (${retries} attempts remaining)`);
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
  }
};

// Function to initialize admin user
const initializeAdminUser = async () => {
  try {
    console.log('🔄 Checking for admin user...');
    
    const User = require('../models/User.model');
    const constants = require('./constants');
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({
      where: {
        role: constants.USER_ROLES.SUPER_ADMIN,
        isDeleted: false
      }
    });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      return;
    }
    
    // Create admin user if it doesn't exist
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    const adminName = process.env.ADMIN_NAME || 'Super Admin';
    
    const adminUser = await User.create({
      email: adminEmail,
      name: adminName,
      password: adminPassword,
      role: constants.USER_ROLES.SUPER_ADMIN,
      emailVerified: true,
      accountStatus: constants.ACCOUNT_STATUSES.ACTIVATED,
      isDeleted: false
    });
    
    console.log('✅ Admin user created successfully');
    console.log(`📧 Admin Email: ${adminEmail}`);
    console.log(`🔑 Admin Password: ${adminPassword}`);
    console.log('⚠️  Please change the admin password after first login!');
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    // Don't throw error here as it's not critical for the app to start
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('🔄 Closing database connections...');
  try {
    await sequelize.close();
    console.log('✅ Database connections closed successfully');
  } catch (error) {
    console.error('❌ Error closing database connections:', error);
  }
};

// Handle process termination
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

const db = {
  sequelize,
  Sequelize,
  databaseLoader,
  gracefulShutdown,
};

module.exports = db;
