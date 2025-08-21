const Category = require('../../models/Category.model');
const { Op } = require('sequelize');

// Get all categories
exports.getAllCategories = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', sortBy = 'sortOrder', sortOrder = 'ASC' } = req.query;
    
    const offset = (page - 1) * limit;
    
    const whereClause = {
      isDeleted: false
    };
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    const categories = await Category.findAndCountAll({
      where: whereClause,
      order: [[sortBy, sortOrder.toUpperCase()]],
      limit: parseInt(limit),
      offset: parseInt(offset),
      attributes: ['id', 'name', 'description', 'icon', 'color', 'isActive', 'sortOrder', 'createdAt', 'updatedAt']
    });
    
    const totalPages = Math.ceil(categories.count / limit);
    
    res.json({
      status: 1,
      message: 'Categories retrieved successfully',
      data: {
        categories: categories.rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: categories.count,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to retrieve categories',
      error: error.message
    });
  }
};

// Get category by ID
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await Category.findOne({
      where: {
        id,
        isDeleted: false
      },
      attributes: ['id', 'name', 'description', 'icon', 'color', 'isActive', 'sortOrder', 'createdAt', 'updatedAt']
    });
    
    if (!category) {
      return res.status(404).json({
        status: 0,
        message: 'Category not found'
      });
    }
    
    res.json({
      status: 1,
      message: 'Category retrieved successfully',
      data: category
    });
  } catch (error) {
    console.error('Error getting category by ID:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to retrieve category',
      error: error.message
    });
  }
};

// Create new category
exports.createCategory = async (req, res) => {
  try {
    const { name, description, icon, color, isActive, sortOrder } = req.body;
    
    // Check if category with same name already exists
    const existingCategory = await Category.findOne({
      where: {
        name,
        isDeleted: false
      }
    });
    
    if (existingCategory) {
      return res.status(400).json({
        status: 0,
        message: 'Category with this name already exists'
      });
    }
    
    const category = await Category.create({
      name,
      description,
      icon: icon || 'default',
      color: color || '#6B7280',
      isActive: isActive !== undefined ? isActive : true,
      sortOrder: sortOrder || 0
    });
    
    res.status(201).json({
      status: 1,
      message: 'Category created successfully',
      data: category
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to create category',
      error: error.message
    });
  }
};

// Update category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, icon, color, isActive, sortOrder } = req.body;
    
    const category = await Category.findByPk(id);
    
    if (!category) {
      return res.status(404).json({
        status: 0,
        message: 'Category not found'
      });
    }
    
    // Check if name is being changed and if it conflicts with existing category
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({
        where: {
          name,
          id: { [Op.ne]: id },
          isDeleted: false
        }
      });
      
      if (existingCategory) {
        return res.status(400).json({
          status: 0,
          message: 'Category with this name already exists'
        });
      }
    }
    
    // Update fields
    if (name !== undefined) category.name = name;
    if (description !== undefined) category.description = description;
    if (icon !== undefined) category.icon = icon;
    if (color !== undefined) category.color = color;
    if (isActive !== undefined) category.isActive = isActive;
    if (sortOrder !== undefined) category.sortOrder = sortOrder;
    
    await category.save();
    
    res.json({
      status: 1,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to update category',
      error: error.message
    });
  }
};

// Delete category (soft delete)
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await Category.findByPk(id);
    
    if (!category) {
      return res.status(404).json({
        status: 0,
        message: 'Category not found'
      });
    }
    
    // Check if category has associated symbols
    const symbolCount = await category.countSymbols();
    if (symbolCount > 0) {
      return res.status(400).json({
        status: 0,
        message: `Cannot delete category. It has ${symbolCount} associated symbols.`
      });
    }
    
    category.isDeleted = true;
    await category.save();
    
    res.json({
      status: 1,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to delete category',
      error: error.message
    });
  }
};

// Get active categories (for dropdowns)
exports.getActiveCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({
      where: {
        isActive: true,
        isDeleted: false
      },
      order: [['sortOrder', 'ASC'], ['name', 'ASC']],
      attributes: ['id', 'name', 'description', 'icon', 'color']
    });
    
    res.json({
      status: 1,
      message: 'Active categories retrieved successfully',
      data: categories
    });
  } catch (error) {
    console.error('Error getting active categories:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to retrieve active categories',
      error: error.message
    });
  }
};

// Toggle category status
exports.toggleCategoryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    
    const category = await Category.findByPk(id);
    
    if (!category) {
      return res.status(404).json({
        status: 0,
        message: 'Category not found'
      });
    }
    
    category.isActive = !category.isActive;
    await category.save();
    
    res.json({
      status: 1,
      message: `Category ${category.isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        id: category.id,
        isActive: category.isActive
      }
    });
  } catch (error) {
    console.error('Error toggling category status:', error);
    res.status(500).json({
      status: 0,
      message: 'Failed to toggle category status',
      error: error.message
    });
  }
};
