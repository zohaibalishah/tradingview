const express = require('express');
const router = express.Router();
const withdrawalController = require('../../controller/admin/withdrawal.controller');
const adminMiddleware = require('../../middlewares/admin');

// router.use(adminMiddleware);

router.post('/create', withdrawalController.createWithdrawalRequest);
router.get('/', withdrawalController.getAllWithdrawalRequests);
router.get('/:id', withdrawalController.getWithdrawalRequestById);
router.put('/:id/approve', withdrawalController.approveWithdrawalRequest);
router.put('/:id/reject', withdrawalController.rejectWithdrawalRequest);
router.delete('/:id', withdrawalController.deleteWithdrawalRequest);
router.get('/stats/summary', withdrawalController.getWithdrawalStatistics);

module.exports = router;
