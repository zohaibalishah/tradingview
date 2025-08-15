const express = require('express');
const Trade = require('../models/Trading.model');
const router = express.Router();
const axios = require('axios');
const Wallet = require('../models/Wallet.model');
const Account = require('../models/Account.model');
const getLivePrice = require('../helpers/getLivePrice');

const API_KEY = 'd992638dc32040a09edafffbed283b4c';
const BASE_URL = 'https://api.twelvedata.com';
// const user = await User.findByPk(userId);
// const cost = tradeVolume * currentPrice;

// if (user.balance < cost) {
//   return res.status(400).json({ error: "Insufficient balance" });
// }
// --- TRADE BUY ---
router.post('/', async (req, res) => {
	const { symbol, side, amount, leverage, stopLoss, takeProfit, volume } =
		req.body;
	console.log(req.body);
	const userId = 1;

	if (!['buy', 'sell'].includes(side)) {
		return res.status(400).json({ success: false, error: 'Invalid side' });
	}
	const price = await getLivePrice(symbol);
	if (!price) return res.status(400).json({ error: 'Price not available' });

	// const { symbol, volume, entryPrice, type, sl, tp } = req.body;

	// const account = await Account.findByPk(req.user.activeAccountId);
	// const required = parseFloat(volume) * parseFloat(entryPrice);

	// if (account.balance < required) {
	//   return res.status(400).json({ message: 'Insufficient account balance' });
	// }

	// account.balance -= required;
	// await account.save();

	// const trade = await Trade.create({
	//   accountId: account.id,
	//   symbol,
	//   type,
	//   volume,
	//   entryPrice,
	//   sl,
	//   tp,
	//   status: 'open'
	// });

	// const wallet = await Wallet.findOne({ where: { userId } });
	//   const cost = trade.volume * trade.price;
	// const tradeCost = price * volume;

	// if (side === 'buy' && wallet.balance < tradeCost) {
	//   return res.status(400).json({ error: 'Insufficient balance' });
	// }

	//   if (trade.side === 'buy') {
	//     if (wallet.balance < cost) {
	//       return res.status(400).json({ message: 'Insufficient wallet balance.' });
	//     }

	//     wallet.balance -= cost;
	//   } else if (trade.side === 'sell') {
	//     wallet.balance += cost;
	//   }

	// await wallet.save();

	const trade = await Trade.create({
		userId,
		symbol,
		side,
		amount: price,
		leverage,
		openPrice: price,
		openTime: new Date(),
		stopLoss,
		takeProfit,
		volume,
		status: 'open',
	});

	//   const trade = await Trade.create({
	//     userId: 1,
	//     symbol,
	//     side,
	//     price: price,
	//     volume: amount,
	//   });
	res.json({ success: true, trade });
});

router.get('/history', async (req, res) => {
	try {
		const { userId } = req.query;
		const trades = await Trade.findAll({
			where: { userId: 1 },
			order: [['createdAt', 'DESC']],
		});
		return res.json({ status: 1, trades });
	} catch (e) {
		res.status(500).json({ status: 0, message: e.message });
	}
});

// POST /api/trades/:id/close
router.post('/:id/close', async (req, res) => {
	const trade = await Trade.findOne({
		where: { id: req.params.id, userId: req.user.id },
	});
	if (!trade || trade.status !== 'open')
		return res.status(404).json({ error: 'Trade not found or already closed' });

	const price = await getLivePrice(trade.symbol);
	const pnl =
		trade.side === 'buy'
			? (price - trade.openPrice) * trade.volume
			: (trade.openPrice - price) * trade.volume;

	trade.closePrice = price;
	trade.closeTime = new Date();
	trade.status = 'closed';
	trade.profitLoss = pnl;
	await trade.save();

	const account = await Account.findByPk(trade.accountId);
	account.balance +=
		parseFloat(trade.volume) * parseFloat(trade.openPrice) + pnl;
	await account.save();

	// const wallet = await Wallet.findOne({ where: { userId: req.user.id } });
	// wallet.balance += (trade.side === 'buy' ? 0 : -trade.volume * price) + pnl;
	// await wallet.save();
	res.json({ message: 'Trade closed', trade });
});

router.get('/', async (req, res) => {
	try {
		const trades = await Trade.findAll({
			where: { userId: req.user.id },
			order: [['createdAt', 'DESC']],
		});
		res.json(trades);
	} catch (err) {
		res.status(500).json({ error: 'Failed to fetch trades' });
	}
});
router.post('/detai/:id', async (req, res) => {
	const trade = await Trade.findOne({
		where: { id: req.params.id },
	});
	res.json({ success: true, trade });
});
router.post('/sl-tp/:id', async (req, res) => {
	const { id } = req.params;
	const { sl, tp } = req.body;

	try {
		const trade = await Trade.findByPk(id);

		if (!trade) return res.status(404).json({ error: 'Trade not found' });
		if (trade.status !== 'open') {
			return res
				.status(400)
				.json({ error: 'SL/TP can only be set on open trades' });
		}

		const side = trade.side;
		const entry = trade.entryPrice;

		// === Validation Rules ===
		if (sl !== undefined) {
			if (side === 'buy' && sl >= entry)
				return res
					.status(400)
					.json({ error: 'SL must be below entry price for Buy trade' });
			if (side === 'sell' && sl <= entry)
				return res
					.status(400)
					.json({ error: 'SL must be above entry price for Sell trade' });

			if (Math.abs(entry - sl) > entry * 0.1)
				return res
					.status(400)
					.json({ error: 'SL is too far from entry price' });
		}

		if (tp !== undefined) {
			if (side === 'buy' && tp <= entry)
				return res
					.status(400)
					.json({ error: 'TP must be above entry price for Buy trade' });
			if (side === 'sell' && tp >= entry)
				return res
					.status(400)
					.json({ error: 'TP must be below entry price for Sell trade' });

			if (Math.abs(entry - tp) > entry * 0.2)
				return res
					.status(400)
					.json({ error: 'TP is too far from entry price' });
		}

		if (sl !== undefined) trade.stopLoss = sl;
		if (tp !== undefined) trade.takeProfit = tp;

		await trade.save();

		res.json({ message: 'SL/TP updated successfully', trade });
	} catch (err) {
		console.error(err);
		res.status(500).json({ error: 'Internal server error' });
	}
});

module.exports = router;
