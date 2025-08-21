const express = require('express');
const router = express.Router();
const tradesController = require('../controller/trades.controller');
const { authenticate } = require('../helpers/auth.helper');

router.get('/', authenticate, tradesController.getAllTrades);
router.get('/open', authenticate, tradesController.getOpenTrades);
router.post('/create', authenticate, tradesController.createTrade);
router.post('/:id/close', authenticate, tradesController.closeTrade);
router.post('/detail/:id', tradesController.getTradeDetail);

module.exports = router;
