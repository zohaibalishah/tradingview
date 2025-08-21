const express = require('express');
const router = express.Router();
const spreadController = require('../../controller/admin/spread.controller');
const { authenticate } = require('../../helpers/auth.helper');


// Get all spreads (admin only)
router.get('/spreads', spreadController.getAllSpreads);

// Get active spreads only
router.get('/spreads/active', spreadController.getActiveSpreads);

// Get spread statistics
router.get('/spreads/statistics', spreadController.getSpreadStatistics);

// Create or update a spread
router.post('/spreads', spreadController.createOrUpdateSpread);

// Toggle spread status
router.patch('/spreads/:id/toggle', spreadController.toggleSpreadStatus);

// Delete a spread (soft delete)
router.delete('/spreads/:id', spreadController.deleteSpread);

module.exports = router;
