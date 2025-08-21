const express = require('express');
const router = express.Router();
const depositController = require('../../controller/admin/deposit.controller');
const adminMiddleware = require('../../middlewares/admin');

// Apply admin middleware to all routes
// router.use(adminMiddleware);

// Create deposit request
router.post('/create', depositController.createDepositRequest);

// Get all deposit requests
router.get('/', depositController.getAllDepositRequests);

// Get deposit request by ID
router.get('/:id', depositController.getDepositRequestById);

// Approve deposit request
router.put('/:id/approve', depositController.approveDepositRequest);

// Reject deposit request
router.put('/:id/reject', depositController.rejectDepositRequest);

// Delete deposit request
router.delete('/:id', depositController.deleteDepositRequest);

// Get deposit statistics
router.get('/stats/summary', depositController.getDepositStatistics);

module.exports = router;
