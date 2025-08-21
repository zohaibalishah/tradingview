const express = require('express');
const router = express.Router();
const categoryController = require('../../controller/admin/category.controller');
const authMiddleware = require('../../middlewares/auth');
const adminMiddleware = require('../../middlewares/admin');

// Apply authentication and admin middleware to all category routes
// router.use(authMiddleware);
// router.use(adminMiddleware);

// Category management routes
router.get('/', categoryController.getAllCategories);
router.get('/active', categoryController.getActiveCategories);
router.get('/:id', categoryController.getCategoryById);
router.post('/', categoryController.createCategory);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);
router.patch('/:id/toggle', categoryController.toggleCategoryStatus);

module.exports = router;
