const WithdrawalRequest = require('../../models/WithdrawalRequest.model');
const User = require('../../models/User.model');
const Wallet = require('../../models/Wallet.model');
const WalletTransaction = require('../../models/WalletTransaction.model');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/db');

// Create withdrawal request
exports.createWithdrawalRequest = async (req, res) => {
  try {
    console.log('Step 1: Extracting request body parameters');
    const {
      userId,
      amount,
      currency = 'USD',
      type = 'withdrawal',
      description,
      notes
    } = req.body;

    console.log('Step 2: Getting admin ID from request');
    const adminId = req.user.id; // Admin making the request

    console.log('Step 3: Validating required fields');
    if (!userId || !amount) {
      console.log('Validation failed: User ID and amount are required');
      return res.status(400).json({
        status: 0,
        message: 'User ID and amount are required'
      });
    }

    console.log('Step 4: Validating amount');
    if (amount <= 0) {
      console.log('Validation failed: Amount must be greater than 0');
      return res.status(400).json({
        status: 0,
        message: 'Amount must be greater than 0'
      });
    }

    console.log('Step 5: Checking if user exists');
    const user = await User.findByPk(userId);
    if (!user) {
      console.log('User not found');
      return res.status(404).json({
        status: 0,
        message: 'User not found'
      });
    }

    console.log('Step 6: Checking if user has sufficient balance');
    const wallet = await Wallet.findOne({
      where: {
        userId: userId,
        currency: currency
      }
    });

    if (!wallet || parseFloat(wallet.balance) < parseFloat(amount)) {
      console.log('Insufficient balance for withdrawal');
      return res.status(400).json({
        status: 0,
        message: 'Insufficient balance for withdrawal'
      });
    }

    console.log('Step 7: Generating unique reference');
    const reference = `WTH-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    console.log('Step 8: Creating withdrawal request');
    const withdrawalRequest = await WithdrawalRequest.create({
      userId,
      adminId,
      amount,
      currency,
      type,
      description,
      notes,
      reference,
      status: 'pending'
    });

    console.log('Step 9: Fetching the created request with user info');
    const createdRequest = await WithdrawalRequest.findByPk(withdrawalRequest.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    console.log('Step 10: Sending success response');
    res.status(201).json({
      status: 1,
      message: 'Withdrawal request created successfully',
      data: createdRequest
    });
  } catch (error) {
    console.error('Error creating withdrawal request:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to create withdrawal request',
      error: error.message
    });
  }
};

// Get all withdrawal requests
exports.getAllWithdrawalRequests = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status = '',
      type = '',
      userId = '',
      search = '',
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const whereClause = { isDeleted: false };

    if (status) {
      whereClause.status = status;
    }

    if (type) {
      whereClause.type = type;
    }

    if (userId) {
      whereClause.userId = userId;
    }

    const requests = await WithdrawalRequest.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'processedByUser',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalPages = Math.ceil(requests.count / limit);

    res.json({
      status: 1,
      message: 'Withdrawal requests retrieved successfully',
      data: {
        requests: requests.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: requests.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting withdrawal requests:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to retrieve withdrawal requests',
      error: error.message
    });
  }
};

// Get withdrawal request by ID
exports.getWithdrawalRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await WithdrawalRequest.findOne({
      where: {
        id,
        isDeleted: false
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'processedByUser',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!request) {
      return res.status(404).json({
        status: 0,
        message: 'Withdrawal request not found'
      });
    }

    res.json({
      status: 1,
      message: 'Withdrawal request retrieved successfully',
      data: request
    });
  } catch (error) {
    console.error('Error getting withdrawal request:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to retrieve withdrawal request',
      error: error.message
    });
  }
};

// Approve withdrawal request
exports.approveWithdrawalRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.user.id;

    const request = await WithdrawalRequest.findOne({
      where: {
        id,
        isDeleted: false
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    if (!request) {
      return res.status(404).json({
        status: 0,
        message: 'Withdrawal request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        status: 0,
        message: 'Withdrawal request is not pending'
      });
    }

    // Start transaction
    const transaction = await sequelize.transaction();

    try {
      // Update withdrawal request status
      await request.update({
        status: 'approved',
        processedAt: new Date(),
        processedBy: adminId,
        notes: notes || request.notes
      }, { transaction });

      // Get user wallet
      const wallet = await Wallet.findOne({
        where: {
          userId: request.userId,
          currency: request.currency
        },
        transaction
      });

      if (!wallet) {
        throw new Error('User wallet not found');
      }

      // Check if user has sufficient balance
      if (parseFloat(wallet.balance) < parseFloat(request.amount)) {
        throw new Error('Insufficient balance for withdrawal');
      }

      // Update wallet balance
      const balanceBefore = parseFloat(wallet.balance);
      const balanceAfter = balanceBefore - parseFloat(request.amount);
      
      await wallet.update({
        balance: balanceAfter
      }, { transaction });

      // Create wallet transaction record
      await WalletTransaction.create({
        walletId: wallet.id,
        userId: request.userId,
        type: 'withdrawal',
        amount: request.amount,
        currency: request.currency,
        description: `Admin withdrawal: ${request.description || request.type}`,
        reference: request.reference,
        status: 'completed',
        balanceBefore: balanceBefore,
        balanceAfter: balanceAfter
      }, { transaction });

      await transaction.commit();

      // Fetch updated request with user info
      const updatedRequest = await WithdrawalRequest.findByPk(id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'name', 'email']
          },
          {
            model: User,
            as: 'admin',
            attributes: ['id', 'name', 'email']
          },
          {
            model: User,
            as: 'processedByUser',
            attributes: ['id', 'name', 'email']
          }
        ]
      });

      res.json({
        status: 1,
        message: 'Withdrawal request approved successfully',
        data: updatedRequest
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error approving withdrawal request:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to approve withdrawal request',
      error: error.message
    });
  }
};

// Reject withdrawal request
exports.rejectWithdrawalRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.user.id;

    const request = await WithdrawalRequest.findOne({
      where: {
        id,
        isDeleted: false
      }
    });

    if (!request) {
      return res.status(404).json({
        status: 0,
        message: 'Withdrawal request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        status: 0,
        message: 'Withdrawal request is not pending'
      });
    }

    // Update withdrawal request status
    await request.update({
      status: 'rejected',
      processedAt: new Date(),
      processedBy: adminId,
      notes: notes || request.notes
    });

    // Fetch updated request with user info
    const updatedRequest = await WithdrawalRequest.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name', 'email']
        },
        {
          model: User,
          as: 'processedByUser',
          attributes: ['id', 'name', 'email']
        }
      ]
    });

    res.json({
      status: 1,
      message: 'Withdrawal request rejected successfully',
      data: updatedRequest
    });
  } catch (error) {
    console.error('Error rejecting withdrawal request:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to reject withdrawal request',
      error: error.message
    });
  }
};

// Delete withdrawal request (soft delete)
exports.deleteWithdrawalRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await WithdrawalRequest.findOne({
      where: {
        id,
        isDeleted: false
      }
    });

    if (!request) {
      return res.status(404).json({
        status: 0,
        message: 'Withdrawal request not found'
      });
    }

    // Only allow deletion of pending requests
    if (request.status !== 'pending') {
      return res.status(400).json({
        status: 0,
        message: 'Only pending withdrawal requests can be deleted'
      });
    }

    await request.update({ isDeleted: true });

    res.json({
      status: 1,
      message: 'Withdrawal request deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting withdrawal request:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to delete withdrawal request',
      error: error.message
    });
  }
};

// Get withdrawal statistics
exports.getWithdrawalStatistics = async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const stats = await WithdrawalRequest.findAll({
      where: {
        createdAt: {
          [Op.gte]: startDate
        },
        isDeleted: false
      },
      attributes: [
        'status',
        'type',
        'currency',
        [sequelize.fn('SUM', sequelize.col('amount')), 'totalAmount'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status', 'type', 'currency']
    });

    const summary = {
      totalRequests: 0,
      totalAmount: 0,
      pendingRequests: 0,
      approvedRequests: 0,
      rejectedRequests: 0,
      byStatus: {},
      byType: {},
      byCurrency: {}
    };

    stats.forEach(stat => {
      const amount = parseFloat(stat.dataValues.totalAmount) || 0;
      const count = parseInt(stat.dataValues.count) || 0;

      summary.totalRequests += count;
      summary.totalAmount += amount;

      // By status
      if (!summary.byStatus[stat.status]) {
        summary.byStatus[stat.status] = { count: 0, amount: 0 };
      }
      summary.byStatus[stat.status].count += count;
      summary.byStatus[stat.status].amount += amount;

      // By type
      if (!summary.byType[stat.type]) {
        summary.byType[stat.type] = { count: 0, amount: 0 };
      }
      summary.byType[stat.type].count += count;
      summary.byType[stat.type].amount += amount;

      // By currency
      if (!summary.byCurrency[stat.currency]) {
        summary.byCurrency[stat.currency] = { count: 0, amount: 0 };
      }
      summary.byCurrency[stat.currency].count += count;
      summary.byCurrency[stat.currency].amount += amount;

      // Count by status
      if (stat.status === 'pending') summary.pendingRequests += count;
      if (stat.status === 'approved') summary.approvedRequests += count;
      if (stat.status === 'rejected') summary.rejectedRequests += count;
    });

    res.json({
      status: 1,
      message: 'Withdrawal statistics retrieved successfully',
      data: {
        period: `${period} days`,
        summary,
        details: stats
      }
    });
  } catch (error) {
    console.error('Error getting withdrawal statistics:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to retrieve withdrawal statistics',
      error: error.message
    });
  }
};
