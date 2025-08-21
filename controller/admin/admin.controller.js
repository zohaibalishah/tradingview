const User = require('../../models/User.model');
const constants = require('../../config/constants');
const { getHashValue } = require('../../helpers/hash.helper');

/**
 * Admin User Management Controller
 * Handles all admin-specific operations
 */

// Get all admin users
exports.getAllAdmins = async (req, res) => {
  try {
    const admins = await User.findAll({
      where: {
        role: constants.USER_ROLES.SUPER_ADMIN,
        isDeleted: false
      },
      attributes: ['id', 'name', 'email', 'role', 'accountStatus', 'createdAt', 'lastLogin'],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      status: 1,
      message: 'Admins retrieved successfully',
      data: admins
    });
  } catch (error) {
    console.error('Error getting admins:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to retrieve admins',
      error: error.message
    });
  }
};

// Create a new admin user
exports.createAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        status: 0,
        message: 'Name, email, and password are required'
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({
      where: { email, isDeleted: false }
    });

    if (existingUser) {
      return res.status(400).json({
        status: 0,
        message: 'Email already exists'
      });
    }

    // Create admin user
    const adminUser = await User.create({
      name,
      email,
      password,
      role: constants.USER_ROLES.SUPER_ADMIN,
      emailVerified: true,
      accountStatus: constants.ACCOUNT_STATUSES.ACTIVATED,
      isDeleted: false
    });

    res.status(201).json({
      status: 1,
      message: 'Admin user created successfully',
      data: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        createdAt: adminUser.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating admin:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to create admin user',
      error: error.message
    });
  }
};

// Update admin user
exports.updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, accountStatus } = req.body;

    // Find admin user
    const adminUser = await User.findOne({
      where: {
        id,
        role: constants.USER_ROLES.SUPER_ADMIN,
        isDeleted: false
      }
    });

    if (!adminUser) {
      return res.status(404).json({
        status: 0,
        message: 'Admin user not found'
      });
    }

    // Update fields
    if (name) adminUser.name = name;
    if (email) adminUser.email = email;
    if (accountStatus) adminUser.accountStatus = accountStatus;

    // Handle password update
    if (password) {
      adminUser.password = await getHashValue(password);
    }

    await adminUser.save();

    res.json({
      status: 1,
      message: 'Admin user updated successfully',
      data: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        accountStatus: adminUser.accountStatus,
        updatedAt: adminUser.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating admin:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to update admin user',
      error: error.message
    });
  }
};

// Delete admin user (soft delete)
exports.deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    // Find admin user
    const adminUser = await User.findOne({
      where: {
        id,
        role: constants.USER_ROLES.SUPER_ADMIN,
        isDeleted: false
      }
    });

    if (!adminUser) {
      return res.status(404).json({
        status: 0,
        message: 'Admin user not found'
      });
    }

    // Prevent deleting the last admin
    const adminCount = await User.count({
      where: {
        role: constants.USER_ROLES.SUPER_ADMIN,
        isDeleted: false
      }
    });

    if (adminCount <= 1) {
      return res.status(400).json({
        status: 0,
        message: 'Cannot delete the last admin user'
      });
    }

    // Soft delete
    adminUser.isDeleted = true;
    adminUser.deletedDate = new Date();
    await adminUser.save();

    res.json({
      status: 1,
      message: 'Admin user deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting admin:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to delete admin user',
      error: error.message
    });
  }
};

// Get admin user by ID
exports.getAdminById = async (req, res) => {
  try {
    const { id } = req.params;

    const adminUser = await User.findOne({
      where: {
        id,
        role: constants.USER_ROLES.SUPER_ADMIN,
        isDeleted: false
      },
      attributes: ['id', 'name', 'email', 'role', 'accountStatus', 'createdAt', 'lastLogin', 'updatedAt']
    });

    if (!adminUser) {
      return res.status(404).json({
        status: 0,
        message: 'Admin user not found'
      });
    }

    res.json({
      status: 1,
      message: 'Admin user retrieved successfully',
      data: adminUser
    });
  } catch (error) {
    console.error('Error getting admin by ID:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to retrieve admin user',
      error: error.message
    });
  }
};

// Check if admin user exists
exports.checkAdminExists = async (req, res) => {
  try {
    const adminCount = await User.count({
      where: {
        role: constants.USER_ROLES.SUPER_ADMIN,
        isDeleted: false
      }
    });

    res.json({
      status: 1,
      message: 'Admin check completed',
      data: {
        exists: adminCount > 0,
        count: adminCount
      }
    });
  } catch (error) {
    console.error('Error checking admin existence:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to check admin existence',
      error: error.message
    });
  }
};
