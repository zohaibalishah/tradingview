const express = require('express');
const Trade = require('../models/Trading.model');
const Wallet = require('../models/Wallet.model');
const Account = require('../models/Account.model');
const { getLatestPrice } = require('../helpers/getLivePrice');
const { authenticate } = require('../helpers/auth.helper');
const { applyBrokerSpread } = require('../helpers/finnhub.helper');

const tradesController = {
  getAllTrades: async (req, res) => {
    try {
      const status = req.query.status || 'open';
      const trades = await Trade.findAll({
        where: { userId: req.user.id, status },
        order: [['createdAt', 'DESC']],
      });
      res.json(trades);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  },

  getOpenTrades: async (req, res) => {
    try {
      // Filter trades by user ID for security
      const trades = await Trade.findAll({ 
        where: { 
          status: 'open',
          userId: req.user.id // Add user ID filter
        },
        order: [['createdAt', 'DESC']]
      });

      const result = await Promise.all(
        trades.map(async (trade) => {
          const currentPrice = await getLatestPrice(trade.symbol);
          if (!currentPrice) {
            return { ...trade.toJSON(), floatingProfit: null };
          }
          const { ask, bid } =await  applyBrokerSpread(Number(currentPrice));
          let exitPrice = trade.side === 'BUY' ? bid : ask;

          const profit = trade.side === 'BUY'
            ? (exitPrice - trade.entryPrice) * trade.volume
            : (trade.entryPrice - exitPrice) * trade.volume;
          return {
            ...trade.toJSON(),
            currentPrice,
            bid,
            ask,
            floatingProfit: profit,
          };
        })
      );

      res.json(result);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  createTrade: async (req, res) => {
    try {
      const { symbol, side, leverage, stopLoss, takeProfit, volume } = req.body;
      if (!symbol || !side || !volume) {
        return res.status(400).json({ message: 'Missing required fields' });
      }
      const currentPrice = await getLatestPrice(symbol);
      if (currentPrice === null) {
        return res.status(400).json({ message: 'Price not available' });
      }
      const { ask, bid } =await  applyBrokerSpread(Number(currentPrice),symbol);

      const entryPrice = side === 'BUY' ? ask : bid;
      const account = await Account.findByPk(req.user.activeAccountId);
      if (!account) {
        return res.status(404).json({ message: 'Account not found' });
      }

      const tradeCost = entryPrice * volume;
      if (account.balance < tradeCost) {
        return res.status(400).json({ message: 'Insufficient balance' });
      }

      await account.update({
        balance: parseFloat((account.balance - tradeCost).toFixed(5)),
      });
      const trade = await Trade.create({
        userId: req.user.id,
        accountId: account.id,
        symbol,
        side,
        volume,
        entryPrice,
        openTime: new Date(),
        stopLoss,
        takeProfit,
        status: 'open',
      });

      res.json({ success: true, trade,message:'' });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },

  closeTrade: async (req, res) => {
    try {
      const trade = await Trade.findOne({
        where: { id: req.params.id, userId: req.user.id },
      });

      if (!trade || trade.status !== 'open') {
        return res
          .status(404)
          .json({ status: 0, message: 'Trade not found or already closed' });
      }

      const currentPrice = await getLatestPrice(trade.symbol);
      console.log('currentPricecurrentPricecurrentPrice', currentPrice);
      if (currentPrice === null) {
        return res.status(500).json({ status: 0, message: 'Price unavailable' });
      }

      const { ask, bid } = await applyBrokerSpread(Number(currentPrice));
      const closePrice = trade.side === 'BUY' ? bid : ask;
      let pnl = trade.side === 'BUY'
        ? (closePrice - trade.entryPrice) * trade.volume
        : (trade.entryPrice - closePrice) * trade.volume;

      trade.closePrice = closePrice;
      trade.closeTime = new Date();
      trade.status = 'closed';
      trade.profitLoss = pnl;
      await trade.save();

      const account = await Account.findByPk(trade.accountId);
      const newBalance = parseFloat(
        (
          parseFloat(account.balance) +
          (pnl + trade.entryPrice * trade.volume)
        ).toFixed(5)
      );
      await account.update({ balance: newBalance });

      res.json({ message: 'Trade closed', trade });
    } catch (error) {
      console.error('Error closing trade:', error);
      res.status(500).json({ status: 0, message: 'Internal server error' });
    }
  },

  getTradeDetail: async (req, res) => {
    try {
      const trade = await Trade.findOne({
        where: { id: req.params.id },
      });

      if (!trade) {
        return res
          .status(404)
          .json({ success: false, message: 'Trade not found' });
      }

      res.json({ success: true, trade });
    } catch (error) {
      console.error('Error fetching trade details:', error);
      res.status(500).json({ success: false, message: 'Internal server error' });
    }
  },
};

module.exports = tradesController;
