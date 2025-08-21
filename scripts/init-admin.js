#!/usr/bin/env node

/**
 * Admin User Initialization Script
 * 
 * This script checks if an admin user exists and creates one if it doesn't.
 * It can be run independently or as part of the application startup.
 * 
 * Usage:
 * - node scripts/init-admin.js
 * - npm run init-admin (if added to package.json scripts)
 */

require('dotenv').config();
const { sequelize } = require('../config/db');
const User = require('../models/User.model');
const constants = require('../config/constants');

const initializeAdminUser = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await sequelize.authenticate();
    console.log('✅ Database connection established');
    
    console.log('🔄 Checking for admin user...');
    
    // Check if admin user already exists
    const existingAdmin = await User.findOne({
      where: {
        role: constants.USER_ROLES.SUPER_ADMIN,
        isDeleted: false
      }
    });
    
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      console.log(`📧 Admin Email: ${existingAdmin.email}`);
      console.log(`👤 Admin Name: ${existingAdmin.name}`);
      console.log(`📅 Created: ${existingAdmin.createdAt}`);
      return existingAdmin;
    }
    
    // Create admin user if it doesn't exist
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
    const adminName = process.env.ADMIN_NAME || 'Super Admin';
    
    console.log('🔄 Creating admin user...');
    
    const adminUser = await User.create({
      email: adminEmail,
      name: adminName,
      password: adminPassword,
      role: constants.USER_ROLES.SUPER_ADMIN,
      emailVerified: true,
      isDeleted: false
    });
    
    console.log('✅ Admin user created successfully!');
    console.log('📋 Admin User Details:');
    console.log(`   📧 Email: ${adminEmail}`);
    console.log(`   🔑 Password: ${adminPassword}`);
    console.log(`   👤 Name: ${adminName}`);
    console.log(`   🆔 User ID: ${adminUser.id}`);
    console.log(`   🏷️  Role: ${adminUser.role}`);
    console.log(`   📅 Created: ${adminUser.createdAt}`);
    console.log('');
    console.log('⚠️  IMPORTANT: Please change the admin password after first login!');
    console.log('🔐 You can change the password through the admin dashboard or API.');
    
    return adminUser;
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    console.error('Stack trace:', error.stack);
    throw error;
  } finally {
    // Close database connection
    await sequelize.close();
    console.log('🔌 Database connection closed');
  }
};

// Run the script if called directly
if (require.main === module) {
  initializeAdminUser()
    .then(() => {
      console.log('✅ Admin initialization completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Admin initialization failed:', error.message);
      process.exit(1);
    });
}

module.exports = { initializeAdminUser };
