const Symbol = require('../../models/Symbol.model');
const Category = require('../../models/Category.model');
const { Op } = require('sequelize');
const symbolSubscriptionManager = require('../../services/symbolSubscriptionManager.service');

// Get all symbols
exports.getAllSymbols = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      search = '', 
      categoryId = '',
      type = '',
      isActive = '',
      sortBy = 'sortOrder', 
      sortOrder = 'ASC' 
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    const whereClause = {
      isDeleted: false
    };
    
    if (search) {
      whereClause[Op.or] = [
        { symbol: { [Op.like]: `%${search}%` } },
        { name: { [Op.like]: `%${search}%` } },
        { displayName: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }
    
    if (type) {
      whereClause.type = type;
    }
    
    if (isActive !== '') {
      whereClause.isActive = isActive === 'true';
    }
    
    const symbols = await Symbol.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'color', 'icon']
        }
      ],
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: [
        'id', 'symbol', 'name', 'displayName', 'categoryId', 'type', 
        'baseCurrency', 'quoteCurrency', 'pipValue', 'minLotSize', 'maxLotSize',
        'defaultSpread', 'minSpread', 'maxSpread', 'pricePrecision', 'volumePrecision',
        'isActive', 'isTradable', 'isPopular', 'sortOrder', 'externalSymbol', 
        'dataProvider', 'createdAt', 'updatedAt'
      ]
    });
    
    const totalPages = Math.ceil(symbols.count / limit);
    
    res.json({
      status: 1,
      message: 'Symbols retrieved successfully',
      data: {
        symbols: symbols.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: symbols.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting symbols:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to retrieve symbols',
      error: error.message
    });
  }
};

// Get symbol by ID
exports.getSymbolById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const symbol = await Symbol.findOne({
      where: {
        id,
        isDeleted: false
      },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'color', 'icon']
        }
      ],
      attributes: [
        'id', 'symbol', 'name', 'displayName', 'categoryId', 'type', 
        'baseCurrency', 'quoteCurrency', 'pipValue', 'minLotSize', 'maxLotSize',
        'defaultSpread', 'minSpread', 'maxSpread', 'pricePrecision', 'volumePrecision',
        'isActive', 'isTradable', 'isPopular', 'sortOrder', 'externalSymbol', 
        'dataProvider', 'createdAt', 'updatedAt'
      ]
    });
    
    if (!symbol) {
      return res.status(404).json({
        status: 0,
        message: 'Symbol not found'
      });
    }
    
    res.json({
      status: 1,
      message: 'Symbol retrieved successfully',
      data: symbol
    });
  } catch (error) {
    console.error('Error getting symbol by ID:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to retrieve symbol',
      error: error.message
    });
  }
};

// Create new symbol
exports.createSymbol = async (req, res) => {
  try {
    const {
      symbol,
      name,
      displayName,
      categoryId,
      type,
      baseCurrency,
      quoteCurrency,
      pipValue,
      minLotSize,
      maxLotSize,
      defaultSpread,
      minSpread,
      maxSpread,
      pricePrecision,
      volumePrecision,
      isActive,
      isTradable,
      isPopular,
      sortOrder,
      externalSymbol,
      dataProvider
    } = req.body;
    
    // Check if symbol already exists
    const existingSymbol = await Symbol.findOne({
      where: {
        symbol,
        isDeleted: false
      }
    });
    
    if (existingSymbol) {
      return res.status(400).json({
        status: 0,
        message: 'Symbol with this code already exists'
      });
    }
    
    // Verify category exists
    const category = await Category.findByPk(categoryId);
    if (!category) {
      return res.status(400).json({
        status: 0,
        message: 'Category not found'
      });
    }
    
    const newSymbol = await Symbol.create({
      symbol,
      name,
      displayName,
      categoryId,
      type: type || 'forex',
      baseCurrency,
      quoteCurrency,
      pipValue: pipValue || 10.00,
      minLotSize: minLotSize || 0.01,
      maxLotSize: maxLotSize || 100.00,
      defaultSpread: defaultSpread || 0.00010,
      minSpread: minSpread || 0.00005,
      maxSpread: maxSpread || 0.00100,
      pricePrecision: pricePrecision || 5,
      volumePrecision: volumePrecision || 2,
      isActive: isActive !== undefined ? isActive : true,
      isTradable: isTradable !== undefined ? isTradable : true,
      isPopular: isPopular !== undefined ? isPopular : false,
      sortOrder: sortOrder || 0,
      externalSymbol,
      dataProvider: dataProvider || 'OANDA'
    });
    
    // Fetch the created symbol with category info
    const createdSymbol = await Symbol.findByPk(newSymbol.id, {
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'color', 'icon']
        }
      ]
    });
    
    // Trigger subscription update if this is a gold symbol
    try {
      await symbolSubscriptionManager.handleSymbolCreated(createdSymbol.toJSON());
    } catch (error) {
      console.error('Error updating subscriptions after symbol creation:', error);
    }
    
    res.status(201).json({
      status: 1,
      message: 'Symbol created successfully',
      data: createdSymbol
    });
  } catch (error) {
    console.error('Error creating symbol:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to create symbol',
      error: error.message
    });
  }
};

// Update symbol
exports.updateSymbol = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      symbol: symbolCode,
      name,
      displayName,
      categoryId,
      type,
      baseCurrency,
      quoteCurrency,
      pipValue,
      minLotSize,
      maxLotSize,
      defaultSpread,
      minSpread,
      maxSpread,
      pricePrecision,
      volumePrecision,
      isActive,
      isTradable,
      isPopular,
      sortOrder,
      externalSymbol,
      dataProvider
    } = req.body;
    
    const symbol = await Symbol.findByPk(id);
    
    if (!symbol) {
      return res.status(404).json({
        status: 0,
        message: 'Symbol not found'
      });
    }
    
    // Check if symbol code is being changed and if it conflicts with existing symbol
    if (symbolCode && symbolCode !== symbol.symbol) {
      const existingSymbol = await Symbol.findOne({
        where: {
          symbol: symbolCode,
          id: { [Op.ne]: id },
          isDeleted: false
        }
      });
      
      if (existingSymbol) {
        return res.status(400).json({
          status: 0,
          message: 'Symbol with this code already exists'
        });
      }
    }
    
    // Verify category exists if being changed
    if (categoryId && categoryId !== symbol.categoryId) {
      const category = await Category.findByPk(categoryId);
      if (!category) {
        return res.status(400).json({
          status: 0,
          message: 'Category not found'
        });
      }
    }
    
    // Update fields
    if (symbolCode !== undefined) symbol.symbol = symbolCode;
    if (name !== undefined) symbol.name = name;
    if (displayName !== undefined) symbol.displayName = displayName;
    if (categoryId !== undefined) symbol.categoryId = categoryId;
    if (type !== undefined) symbol.type = type;
    if (baseCurrency !== undefined) symbol.baseCurrency = baseCurrency;
    if (quoteCurrency !== undefined) symbol.quoteCurrency = quoteCurrency;
    if (pipValue !== undefined) symbol.pipValue = pipValue;
    if (minLotSize !== undefined) symbol.minLotSize = minLotSize;
    if (maxLotSize !== undefined) symbol.maxLotSize = maxLotSize;
    if (defaultSpread !== undefined) symbol.defaultSpread = defaultSpread;
    if (minSpread !== undefined) symbol.minSpread = minSpread;
    if (maxSpread !== undefined) symbol.maxSpread = maxSpread;
    if (pricePrecision !== undefined) symbol.pricePrecision = pricePrecision;
    if (volumePrecision !== undefined) symbol.volumePrecision = volumePrecision;
    if (isActive !== undefined) symbol.isActive = isActive;
    if (isTradable !== undefined) symbol.isTradable = isTradable;
    if (isPopular !== undefined) symbol.isPopular = isPopular;
    if (sortOrder !== undefined) symbol.sortOrder = sortOrder;
    if (externalSymbol !== undefined) symbol.externalSymbol = externalSymbol;
    if (dataProvider !== undefined) symbol.dataProvider = dataProvider;
    
    await symbol.save();
    
    // Fetch updated symbol with category info
    const updatedSymbol = await Symbol.findByPk(id, {
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'color', 'icon']
        }
      ]
    });
    
    // Trigger subscription update if this is a gold symbol
    try {
      await symbolSubscriptionManager.handleSymbolUpdated(updatedSymbol.toJSON());
    } catch (error) {
      console.error('Error updating subscriptions after symbol update:', error);
    }
    
    res.json({
      status: 1,
      message: 'Symbol updated successfully',
      data: updatedSymbol
    });
  } catch (error) {
    console.error('Error updating symbol:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to update symbol',
      error: error.message
    });
  }
};

// Delete symbol (soft delete)
exports.deleteSymbol = async (req, res) => {
  try {
    const { id } = req.params;
    
    const symbol = await Symbol.findByPk(id);
    
    if (!symbol) {
      return res.status(404).json({
        status: 0,
        message: 'Symbol not found'
      });
    }
    
    symbol.isDeleted = true;
    await symbol.save();
    
    // Trigger subscription update if this is a gold symbol
    try {
      await symbolSubscriptionManager.handleSymbolDeleted(symbol.toJSON());
    } catch (error) {
      console.error('Error updating subscriptions after symbol deletion:', error);
    }
    
    res.json({
      status: 1,
      message: 'Symbol deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting symbol:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to delete symbol',
      error: error.message
    });
  }
};

// Get active symbols (for dropdowns)
exports.getActiveSymbols = async (req, res) => {
  try {
    const { categoryId = '', type = '' } = req.query;
    
    const whereClause = {
      isActive: true,
      isTradable: true,
      isDeleted: false
    };
    
    if (categoryId) {
      whereClause.categoryId = categoryId;
    }
    
    if (type) {
      whereClause.type = type;
    }
    
    const symbols = await Symbol.findAll({
      where: whereClause,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'color', 'icon']
        }
      ],
      order: [['sortOrder', 'ASC'], ['name', 'ASC']],
      attributes: [
        'id', 'symbol', 'name', 'displayName', 'type', 'baseCurrency', 
        'quoteCurrency', 'pipValue', 'externalSymbol', 'dataProvider'
      ]
    });
    
    res.json({
      status: 1,
      message: 'Active symbols retrieved successfully',
      data: symbols
    });
  } catch (error) {
    console.error('Error getting active symbols:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to retrieve active symbols',
      error: error.message
    });
  }
};

// Toggle symbol status
exports.toggleSymbolStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { field = 'isActive' } = req.body;
    
    const symbol = await Symbol.findByPk(id);
    
    if (!symbol) {
      return res.status(404).json({
        status: 0,
        message: 'Symbol not found'
      });
    }
    
    if (!['isActive', 'isTradable', 'isPopular'].includes(field)) {
      return res.status(400).json({
        status: 0,
        message: 'Invalid field to toggle'
      });
    }
    
    symbol[field] = !symbol[field];
    await symbol.save();
    
    // Trigger subscription update if this is a gold symbol
    try {
      await symbolSubscriptionManager.handleSymbolStatusChanged(symbol.toJSON());
    } catch (error) {
      console.error('Error updating subscriptions after symbol status change:', error);
    }
    
    res.json({
      status: 1,
      message: `Symbol ${field} ${symbol[field] ? 'enabled' : 'disabled'} successfully`,
      data: {
        id: symbol.id,
        [field]: symbol[field]
      }
    });
  } catch (error) {
    console.error('Error toggling symbol status:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to toggle symbol status',
      error: error.message
    });
  }
};

// Get symbols by category
exports.getSymbolsByCategory = async (req, res) => {
  try {
    const { categoryId } = req.params;
    
    const symbols = await Symbol.findAll({
      where: {
        categoryId,
        isActive: true,
        isDeleted: false
      },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'color', 'icon']
        }
      ],
      order: [['sortOrder', 'ASC'], ['name', 'ASC']],
      attributes: [
        'id', 'symbol', 'name', 'displayName', 'type', 'baseCurrency', 
        'quoteCurrency', 'pipValue', 'isActive', 'isTradable', 'isPopular'
      ]
    });
    
    res.json({
      status: 1,
      message: 'Symbols by category retrieved successfully',
      data: symbols
    });
  } catch (error) {
    console.error('Error getting symbols by category:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to retrieve symbols by category',
      error: error.message
    });
  }
};

// Manual subscription refresh
exports.refreshSubscriptions = async (req, res) => {
  try {
    console.log('🔄 Manual subscription refresh requested by admin');
    
    const result = await symbolSubscriptionManager.refreshSubscriptions();
    
    if (result) {
      const status = symbolSubscriptionManager.getSubscriptionStatus();
      res.json({
        status: 1,
        message: 'Symbol subscriptions refreshed successfully',
        data: status
      });
    } else {
      res.status(500).json({
        status: 0,
        message: 'Failed to refresh symbol subscriptions'
      });
    }
  } catch (error) {
    console.error('Error refreshing subscriptions:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to refresh symbol subscriptions',
      error: error.message
    });
  }
};

// Get subscription status
exports.getSubscriptionStatus = async (req, res) => {
  try {
    const status = symbolSubscriptionManager.getSubscriptionStatus();
    
    res.json({
      status: 1,
      message: 'Subscription status retrieved successfully',
      data: status
    });
  } catch (error) {
    console.error('Error getting subscription status:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to get subscription status',
      error: error.message
    });
  }
};

// Get public symbols for client watchlist
exports.getPublicSymbols = async (req, res) => {
  try {
    const { 
      category = '',
      isActive = 'true',
      limit = 50,
      popular = 'false'
    } = req.query;
    
    const whereClause = {
      isDeleted: false,
      isActive: isActive === 'true'
    };
    
    if (category) {
      whereClause.baseCurrency = category;
    }
    
    if (popular === 'true') {
      whereClause.isPopular = true;
    }
    
    const symbols = await Symbol.findAll({
      where: whereClause,
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name', 'color', 'icon']
        }
      ],
      order: [
        ['isPopular', 'DESC'],
        ['sortOrder', 'ASC'],
        ['name', 'ASC']
      ],
      limit: parseInt(limit),
      attributes: [
        'id', 'symbol', 'name', 'displayName', 'type', 'baseCurrency', 
        'quoteCurrency', 'pipValue', 'minLotSize', 'maxLotSize',
        'defaultSpread', 'minSpread', 'maxSpread', 'pricePrecision', 'volumePrecision',
        'isActive', 'isTradable', 'isPopular', 'externalSymbol', 'dataProvider'
      ]
    });
    
    // Transform symbols for client consumption
    const transformedSymbols = symbols.map(symbol => {
      const symbolData = symbol.toJSON();
      
      // Generate realistic market data for display
      const basePrice = symbolData.baseCurrency === 'XAU' ? 
        (2000 + Math.random() * 500) : 
        (symbolData.baseCurrency === 'EUR' ? 1.08 + Math.random() * 0.04 : 1.0 + Math.random() * 0.1);
      
      const spread = symbolData.defaultSpread || 0.5;
      const bid = basePrice;
      const ask = bid + spread;
      const previousClose = bid - (Math.random() * 10 - 5);
      const change = bid - previousClose;
      const changePercent = (change / previousClose) * 100;
      
      return {
        ...symbolData,
        bid: bid,
        ask: ask,
        previousClose: previousClose,
        change: change,
        changePercent: changePercent,
        spread: spread,
        isLive: false, // Will be updated by live data
        lastUpdate: new Date().toISOString()
      };
    });
    
    res.json({
      status: 1,
      message: 'Public symbols retrieved successfully',
      data: {
        symbols: transformedSymbols,
        total: transformedSymbols.length
      }
    });
  } catch (error) {
    console.error('Error getting public symbols:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to retrieve public symbols',
      error: error.message
    });
  }
};
