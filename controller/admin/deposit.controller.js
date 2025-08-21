const DepositRequest = require('../../models/DepositRequest.model');
const User = require('../../models/User.model');
const Wallet = require('../../models/Wallet.model');
const WalletTransaction = require('../../models/WalletTransaction.model');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/db');

// Create deposit request
exports.createDepositRequest = async (req, res) => {
  try {
    const {
      userId,
      amount,
      currency = 'USD',
      type = 'deposit',
      description,
      notes
    } = req.body;

    const adminId = req.user.id; // Admin making the request

    // Validate required fields
    if (!userId || !amount) {
      return res.status(400).json({
        status: 0,
        message: 'User ID and amount are required'
      });
    }

    // Validate amount
    if (amount <= 0) {
      return res.status(400).json({
        status: 0,
        message: 'Amount must be greater than 0'
      });
    }

    // Check if user exists
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({
        status: 0,
        message: 'User not found'
      });
    }

    // Generate unique reference
    const reference = `DEP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Create deposit request
    const depositRequest = await DepositRequest.create({
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

    // Fetch the created request with user info
    const createdRequest = await DepositRequest.findByPk(depositRequest.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id',  'email', 'name']
        },
        {
          model: User,
          as: 'admin',
          attributes: ['id',  'email', 'name']
        }
      ]
    });

    res.status(201).json({
      status: 1,
      message: 'Deposit request created successfully',
      data: createdRequest
    });
  } catch (error) {
    console.error('Error creating deposit request:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to create deposit request',
      error: error.message
    });
  }
};

// Get all deposit requests
exports.getAllDepositRequests = async (req, res) => {
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

    const requests = await DepositRequest.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email',]
        },
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name', 'email', ]
        },
        {
          model: User,
          as: 'processedByUser',
          attributes: ['id', 'name', 'email',]
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    const totalPages = Math.ceil(requests.count / limit);

    res.json({
      status: 1,
      message: 'Deposit requests retrieved successfully',
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
    console.error('Error getting deposit requests:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to retrieve deposit requests',
      error: error.message
    });
  }
};

// Get deposit request by ID
exports.getDepositRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await DepositRequest.findOne({
      where: {
        id,
        isDeleted: false
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email', ]
        },
        {
          model: User,
          as: 'admin',
          attributes: ['id', 'name', 'email',]
        },
        {
          model: User,
          as: 'processedByUser',
          attributes: ['id', 'name', 'email',]
        }
      ]
    });

    if (!request) {
      return res.status(404).json({
        status: 0,
        message: 'Deposit request not found'
      });
    }

    res.json({
      status: 1,
      message: 'Deposit request retrieved successfully',
      data: request
    });
  } catch (error) {
    console.error('Error getting deposit request:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to retrieve deposit request',
      error: error.message
    });
  }
};

// Approve deposit request
exports.approveDepositRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.user.id;

    const request = await DepositRequest.findOne({
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
        message: 'Deposit request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        status: 0,
        message: 'Deposit request is not pending'
      });
    }

    // Start transaction
    const transaction = await sequelize.transaction();

    try {
      // Update deposit request status
      await request.update({
        status: 'approved',
        processedAt: new Date(),
        processedBy: adminId,
        notes: notes || request.notes
      }, { transaction });

      // Get or create user wallet
      let wallet = await Wallet.findOne({
        where: {
          userId: request.userId,
          currency: request.currency
        },
        transaction
      });

      if (!wallet) {
        // Check if any wallet exists for this user
        const existingWallet = await Wallet.findOne({
          where: { userId: request.userId },
          transaction
        });

        if (existingWallet) {
          // Use existing wallet if it exists
          wallet = existingWallet;
          console.log(`Using existing wallet for user ${request.userId}`);
        } else {
          // Create new wallet only if no wallet exists for this user
          try {
            wallet = await Wallet.create({
              userId: request.userId,
              currency: request.currency,
              balance: 0,
              isActive: true
            }, { transaction });
            console.log(`Created new wallet for user ${request.userId}`);
          } catch (createError) {
            console.error('Error creating wallet:', createError);
            // If creation fails, try to find existing wallet again
            wallet = await Wallet.findOne({
              where: { userId: request.userId },
              transaction
            });
            
            if (!wallet) {
              throw new Error('Failed to create or find wallet for user');
            }
          }
        }
      }

      // Update wallet balance
      const currentBalance = parseFloat(wallet.balance) || 0;
      const newBalance = currentBalance + parseFloat(request.amount);
      
      await wallet.update({
        balance: newBalance
      }, { transaction });

      // Create wallet transaction record
      await WalletTransaction.create({
        walletId: wallet.id,
        userId: request.userId,
        type: 'deposit',
        amount: request.amount,
        currency: request.currency,
        description: `Admin deposit: ${request.description || request.type}`,
        reference: request.reference,
        status: 'completed',
        balanceBefore: parseFloat(wallet.balance),
        balanceAfter: parseFloat(wallet.balance) + parseFloat(request.amount)
      }, { transaction });

      await transaction.commit();

      // Fetch updated request with user info
      const updatedRequest = await DepositRequest.findByPk(id, {
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
        message: 'Deposit request approved successfully',
        data: updatedRequest
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error approving deposit request:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to approve deposit request',
      error: error.message
    });
  }
};

// Reject deposit request
exports.rejectDepositRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const adminId = req.user.id;

    const request = await DepositRequest.findOne({
      where: {
        id,
        isDeleted: false
      }
    });

    if (!request) {
      return res.status(404).json({
        status: 0,
        message: 'Deposit request not found'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        status: 0,
        message: 'Deposit request is not pending'
      });
    }

    // Update deposit request status
    await request.update({
      status: 'rejected',
      processedAt: new Date(),
      processedBy: adminId,
      notes: notes || request.notes
    });

    // Fetch updated request with user info
    const updatedRequest = await DepositRequest.findByPk(id, {
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
      message: 'Deposit request rejected successfully',
      data: updatedRequest
    });
  } catch (error) {
    console.error('Error rejecting deposit request:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to reject deposit request',
      error: error.message
    });
  }
};

// Delete deposit request (soft delete)
exports.deleteDepositRequest = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await DepositRequest.findOne({
      where: {
        id,
        isDeleted: false
      }
    });

    if (!request) {
      return res.status(404).json({
        status: 0,
        message: 'Deposit request not found'
      });
    }

    // Only allow deletion of pending requests
    if (request.status !== 'pending') {
      return res.status(400).json({
        status: 0,
        message: 'Only pending deposit requests can be deleted'
      });
    }

    await request.update({ isDeleted: true });

    res.json({
      status: 1,
      message: 'Deposit request deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting deposit request:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to delete deposit request',
      error: error.message
    });
  }
};

// Get deposit statistics
exports.getDepositStatistics = async (req, res) => {
  try {
    const { period = '30' } = req.query; // days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    const stats = await DepositRequest.findAll({
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
      message: 'Deposit statistics retrieved successfully',
      data: {
        period: `${period} days`,
        summary,
        details: stats
      }
    });
  } catch (error) {
    console.error('Error getting deposit statistics:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to retrieve deposit statistics',
      error: error.message
    });
  }
};
