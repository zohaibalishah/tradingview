const WalletTransaction = require('../../models/WalletTransaction.model');
const Account = require('../../models/Account.model');
const User = require('../../models/User.model');
const constants = require('../../config/constants');
const { getHashValue } = require('../../helpers/hash.helper');
const { Op } = require('sequelize');

// exports.createUser = async (req, res) => {
//   const { name, email, password } = req.body;
//   const brokerId = req.user.id; // assuming logged in as broker

//   const user = await User.create({
//     name,
//     email,
//     password,
//     createdBy: brokerId
//   });

//   // Create default real account
//   const account = await Account.create({
//     userId: user.id,
//     type: 'real',
//     balance: 0,
//     isActive: true
//   });

//   user.activeAccountId = account.id;
//   await user.save();

//   res.json({ user, account });
// };

exports.verifyDeposit = async (req, res) => {
  const { id } = req.params;

  const tx = await WalletTransaction.findByPk(id);
  if (!tx || tx.status !== 'pending') {
    return res.status(400).json({ message: 'Invalid transaction' });
  }

  tx.status = 'completed';
  await tx.save();

  const account = await Account.findOne({ where: { userId: tx.userId, type: 'real' } });
  account.balance += parseFloat(tx.amount);
  await account.save();

  res.json({ message: 'Deposit approved', account });
};

// Get all users
exports.getAllUsers = async (req, res) => {
  try {
    const { limit, isActive, search } = req.query;
    
    const whereClause = { isDeleted: false ,role:'USER'};
    
    // Filter by active status if provided
    if (isActive !== undefined) {
      whereClause.accountStatus = isActive === 'true' ? 'Approved' : { [Op.ne]: 'Approved' };
    }
    
    // Add search functionality
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const queryOptions = {
      where: whereClause,
      attributes: ['id', 'name', 'email', 'role', 'accountStatus', 'createdAt', 'lastLogin'],
      order: [['createdAt', 'DESC']]
    };
    
    // Add limit if provided
    if (limit) {
      queryOptions.limit = parseInt(limit);
    }
    
    const users = await User.findAll(queryOptions);

    res.json({
      status: 1,
      message: 'Users retrieved successfully',
      data: { users }
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to retrieve users',
      error: error.message
    });
  }
};

// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findOne({
      where: {
        id,
        isDeleted: false
      },
      attributes: ['id', 'name', 'email', 'role', 'accountStatus', 'createdAt', 'lastLogin', 'updatedAt']
    });

    if (!user) {
      return res.status(404).json({
        status: 0,
        message: 'User not found'
      });
    }

    res.json({
      status: 1,
      message: 'User retrieved successfully',
      data: user
    });
  } catch (error) {
    console.error('Error getting user by ID:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to retrieve user',
      error: error.message
    });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, accountStatus } = req.body;

    // Find user
    const user = await User.findOne({
      where: {
        id,
        isDeleted: false
      }
    });

    if (!user) {
      return res.status(404).json({
        status: 0,
        message: 'User not found'
      });
    }

    // Update fields
    if (name) user.name = name;
    if (email) user.email = email;
    if (accountStatus) user.accountStatus = accountStatus;

    // Handle password update
    if (password) {
      user.password = await getHashValue(password);
    }

    await user.save();

    res.json({
      status: 1,
      message: 'User updated successfully',
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountStatus: user.accountStatus,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to update user',
      error: error.message
    });
  }
};

// Delete user (soft delete)
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Find user
    const user = await User.findOne({
      where: {
        id,
        isDeleted: false
      }
    });

    if (!user) {
      return res.status(404).json({
        status: 0,
        message: 'User not found'
      });
    }

    // Prevent deleting admin users
    if (user.role === constants.USER_ROLES.SUPER_ADMIN) {
      return res.status(400).json({
        status: 0,
        message: 'Cannot delete admin users'
      });
    }

    // Soft delete
    user.isDeleted = true;
    user.deletedDate = new Date();
    await user.save();

    res.json({
      status: 1,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};
