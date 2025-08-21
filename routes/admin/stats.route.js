const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/auth');
const adminMiddleware = require('../../middlewares/admin');
const User = require('../../models/User.model');
const Trading = require('../../models/Trading.model');
const DepositRequest = require('../../models/DepositRequest.model');
const WithdrawRequest = require('../../models/WithdrawalRequest.model');

// // Apply authentication and admin middleware to all routes
// router.use(authMiddleware);
// router.use(adminMiddleware);

// Get admin dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    // Get total users
    const totalUsers = await User.count({
      where: { isDeleted: false, }
    });

    // Get total trades
    const totalTrades = await Trading.count();

    // Get total volume (sum of all trade amounts)
    const totalVolume = await Trading.sum('volume') || 0;

    // Get active users (users who logged in within last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const activeUsers = await User.count({
      where: {
        isDeleted: false,
        lastLogin: {
          [require('sequelize').Op.gte]: sevenDaysAgo
        }
      }
    });

    // Get pending deposits
    const pendingDeposits = await DepositRequest.count({
      where: { status: 'PENDING' }
    });

    // Get pending withdrawals
    const pendingWithdrawals = await WithdrawRequest.count({
      where: { status: 'PENDING' }
    });

    res.json({
      status: 1,
      message: 'Statistics retrieved successfully',
      data: {
        totalUsers,
        totalTrades,
        totalVolume,
        activeUsers,
        pendingDeposits,
        pendingWithdrawals
      }
    });
  } catch (error) {
    console.error('Error getting statistics:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to retrieve statistics',
      error: error.message
    });
  }
});

// Get recent activity
router.get('/recent-activity', async (req, res) => {
  try {
    const recentTrades = await Trading.findAll({
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 10
    });

    const recentUsers = await User.findAll({
      where: { isDeleted: false },
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    const activities = [];

    // Add recent trades
    recentTrades.forEach(trade => {
      activities.push({
        type: 'trade',
        title: `New ${trade.type} trade`,
        description: `${trade.user?.name || 'User'} placed a ${trade.type} trade for $${trade.amount} on ${trade.symbol}`,
        time: trade.createdAt
      });
    });

    // Add recent user registrations
    recentUsers.forEach(user => {
      activities.push({
        type: 'user',
        title: 'New user registered',
        description: `${user.name} (${user.email}) joined the platform`,
        time: user.createdAt
      });
    });

    // Sort by time and limit to 15 most recent
    activities.sort((a, b) => new Date(b.time) - new Date(a.time));
    activities.splice(15);

    res.json({
      status: 1,
      message: 'Recent activity retrieved successfully',
      data: activities
    });
  } catch (error) {
    console.error('Error getting recent activity:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to retrieve recent activity',
      error: error.message
    });
  }
});

module.exports = router;
