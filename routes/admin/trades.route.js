const express = require('express');
const router = express.Router();
const authMiddleware = require('../../middlewares/auth');
const adminMiddleware = require('../../middlewares/admin');
const Trading = require('../../models/Trading.model');
const User = require('../../models/User.model');
const { Op } = require('sequelize');

// Apply authentication and admin middleware to all routes
// router.use(authMiddleware);
// router.use(adminMiddleware);

// Get all trades with pagination and filters
router.get('/trades', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    const { status, symbol, search } = req.query;
    
    // Build where clause
    const whereClause = {};
    
    if (status && status !== 'all') {
      whereClause.status = status;
    }
    
    if (symbol && symbol !== 'all') {
      whereClause.symbol = symbol;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { symbol: { [Op.like]: `%${search}%` } },
        { '$user.name$': { [Op.like]: `%${search}%` } },
        { '$user.email$': { [Op.like]: `%${search}%` } }
      ];
    }
    
    const trades = await Trading.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });
    
    const totalPages = Math.ceil(trades.count / limit);
    
    res.json({
      status: 1,
      message: 'Trades retrieved successfully',
      data: {
        trades: trades.rows,
        totalPages,
        currentPage: page,
        totalTrades: trades.count
      }
    });
  } catch (error) {
    console.error('Error getting trades:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to retrieve trades',
      error: error.message
    });
  }
});

// Get trade by ID
router.get('/trades/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const trade = await Trading.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'name', 'email']
        }
      ]
    });
    
    if (!trade) {
      return res.status(404).json({
        status: 0,
        message: 'Trade not found'
      });
    }
    
    res.json({
      status: 1,
      message: 'Trade retrieved successfully',
      data: trade
    });
  } catch (error) {
    console.error('Error getting trade:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to retrieve trade',
      error: error.message
    });
  }
});

// Delete trade
router.delete('/trades/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const trade = await Trading.findByPk(id);
    
    if (!trade) {
      return res.status(404).json({
        status: 0,
        message: 'Trade not found'
      });
    }
    
    await trade.destroy();
    
    res.json({
      status: 1,
      message: 'Trade deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting trade:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to delete trade',
      error: error.message
    });
  }
});

// Update trade status
router.put('/trades/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const trade = await Trading.findByPk(id);
    
    if (!trade) {
      return res.status(404).json({
        status: 0,
        message: 'Trade not found'
      });
    }
    
    trade.status = status;
    await trade.save();
    
    res.json({
      status: 1,
      message: 'Trade status updated successfully',
      data: trade
    });
  } catch (error) {
    console.error('Error updating trade status:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to update trade status',
      error: error.message
    });
  }
});

module.exports = router;
