const express = require('express');
const router = express.Router();
const symbolController = require('../../controller/admin/symbol.controller');
const authMiddleware = require('../../middlewares/auth');
const adminMiddleware = require('../../middlewares/admin');

// Apply authentication and admin middleware to all symbol routes
// router.use(authMiddleware);
// router.use(adminMiddleware);

// Symbol management routes
router.get('/', symbolController.getAllSymbols);
router.get('/active', symbolController.getActiveSymbols);
router.get('/category/:categoryId', symbolController.getSymbolsByCategory);

router.post('/', symbolController.createSymbol);
router.put('/:id', symbolController.updateSymbol);
router.delete('/:id', symbolController.deleteSymbol);
router.patch('/:id/toggle', symbolController.toggleSymbolStatus);

// Manual subscription refresh route
router.post('/refresh-subscriptions', symbolController.refreshSubscriptions);
router.get('/subscription-status', symbolController.getSubscriptionStatus);

module.exports = router;
