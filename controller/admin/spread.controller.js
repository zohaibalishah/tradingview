


const Spread = require('../../models/Spread.model');

// Get all spreads for admin dashboard
exports.getAllSpreads = async (req, res) => {
  try {
    const spreads = await Spread.findAll({
      order: [['symbol', 'ASC']],
    });

    res.json({
      success: true,
      data: spreads,
    });
  } catch (error) {
    console.error('Error fetching spreads:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Get active spreads only
exports.getActiveSpreads = async (req, res) => {
  try {
    const spreads = await Spread.getAllActive();
    
    res.json({
      success: true,
      data: spreads,
    });
  } catch (error) {
    console.error('Error fetching active spreads:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Create or update a spread
exports.createOrUpdateSpread = async (req, res) => {
  try {
    const { symbol, spread, description } = req.body;
    const updatedBy = req.user.id; // From auth middleware

    // Validation
    if (!symbol || !spread) {
      return res.status(400).json({
        success: false,
        error: 'Symbol and spread are required',
      });
    }

    if (typeof spread !== 'number' || spread < 0) {
      return res.status(400).json({
        success: false,
        error: 'Spread must be a positive number',
      });
    }

    // Create or update spread
    const [spreadRecord, created] = await Spread.updateSpread(
      symbol.toUpperCase(),
      spread,
      updatedBy
    );

    // Update description if provided
    if (description !== undefined) {
      await spreadRecord.update({ description });
    }

    // Fetch the updated record with user info
    const updatedSpread = await Spread.findByPk(spreadRecord.id, {
    });

    res.json({
      success: true,
      data: updatedSpread,
      message: created ? 'Spread created successfully' : 'Spread updated successfully',
    });
  } catch (error) {
    console.error('Error creating/updating spread:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Toggle spread active status
exports.toggleSpreadStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBy = req.user.id;

    const spread = await Spread.findByPk(id);
    if (!spread) {
      return res.status(404).json({
        success: false,
        error: 'Spread not found',
      });
    }

    // Toggle status
    await spread.update({
      isActive: !spread.isActive,
      updatedBy,
    });

    // Fetch updated record with user info
    const updatedSpread = await Spread.findByPk(id, {
      include: [
        {
          model: User,
          as: 'updatedByUser',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    res.json({
      success: true,
      data: updatedSpread,
      message: `Spread ${updatedSpread.isActive ? 'activated' : 'deactivated'} successfully`,
    });
  } catch (error) {
    console.error('Error toggling spread status:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Delete a spread (soft delete by setting isActive to false)
exports.deleteSpread = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedBy = req.user.id;

    const spread = await Spread.findByPk(id);
    if (!spread) {
      return res.status(404).json({
        success: false,
        error: 'Spread not found',
      });
    }

    // Soft delete by setting isActive to false
    await spread.update({
      isActive: false,
      updatedBy,
    });

    res.json({
      success: true,
      message: 'Spread deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting spread:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};

// Get spread statistics for admin dashboard
exports.getSpreadStatistics = async (req, res) => {
  try {
    const totalSpreads = await Spread.count();
    const activeSpreads = await Spread.count({ where: { isActive: true } });
    const inactiveSpreads = totalSpreads - activeSpreads;

    // Get most recently updated spreads
    const recentUpdates = await Spread.findAll({
      where: { isActive: true },
      include: [
        {
          model: User,
          as: 'updatedByUser',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order: [['updatedAt', 'DESC']],
      limit: 5,
    });

    res.json({
      success: true,
      data: {
        totalSpreads,
        activeSpreads,
        inactiveSpreads,
        recentUpdates,
      },
    });
  } catch (error) {
    console.error('Error fetching spread statistics:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Internal server error' 
    });
  }
};