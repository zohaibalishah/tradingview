const express = require('express');
const router = express.Router();
const userController = require('../../controller/admin/user.controller');
const authMiddleware = require('../../middlewares/auth');
const adminMiddleware = require('../../middlewares/admin');

// Apply authentication and admin middleware to all routes
// router.use(authMiddleware);
// router.use(adminMiddleware);

// Get all users
router.get('/users', userController.getAllUsers);

// Get user by ID
router.get('/users/:id', userController.getUserById);

// Update user
router.put('/users/:id', userController.updateUser);

// Delete user
router.delete('/users/:id', userController.deleteUser);

// Verify deposit (existing route)
router.put('/verify-deposit/:id', userController.verifyDeposit);

module.exports = router;
