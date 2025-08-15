const express = require('express');
const router = express.Router();
const Trade = require('../models/Trading.model');
const { toFinnhubSymbol, fetchFinnhub } = require('../helpers/finnhub.helper');

router.get('/config', (req, res) => {
  res.json({
    supports_search: true,
    supports_group_request: false,
    supports_marks: true,
    supports_timescale_marks: true,
    supports_time: true,
    exchanges: [{ value: 'OANDA', name: 'OANDA', desc: 'OANDA Forex' }],
    symbols_types: [{ name: 'Forex', value: 'forex' }],
    supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D'],
  });
});

router.get('/time', (req, res) => {
  res.json({ time: Math.floor(Date.now() / 1000) });
});

router.get('/symbols', async (req, res) => {
  try {
    const defaultSymbols = [
      { symbol: 'XAU/USD', name: 'Gold / US Dollar', type: 'commodity' },
      { symbol: 'XAU/EUR', name: 'Gold / Euro', type: 'commodity' },
      {
        symbol: 'XAU/AUD',
        name: 'Gold / Australian Dollar',
        type: 'commodity',
      },
      { symbol: 'XAU/CHF', name: 'Gold / Swiss Franc', type: 'commodity' },
      { symbol: 'XAU/GBP', name: 'Gold / British Pound', type: 'commodity' },
      { symbol: 'XAG/USD', name: 'Silver / US Dollar', type: 'commodity' },
      { symbol: 'EUR/USD', name: 'Euro / US Dollar', type: 'forex' },
      { symbol: 'GBP/USD', name: 'British Pound / US Dollar', type: 'forex' },
      { symbol: 'USD/JPY', name: 'US Dollar / Japanese Yen', type: 'forex' },
      { symbol: 'USD/CHF', name: 'US Dollar / Swiss Franc', type: 'forex' },
      {
        symbol: 'AUD/USD',
        name: 'Australian Dollar / US Dollar',
        type: 'forex',
      },
      { symbol: 'USD/CAD', name: 'US Dollar / Canadian Dollar', type: 'forex' },
    ];

    // If a symbol is provided, return info for that symbol, else return all
    const symbol = defaultSymbols.find(
      (f) =>
        f.symbol == req.query.symbol ||
        toFinnhubSymbol(f.symbol) == req.query.symbol
    );
    if (symbol) {
      res.json({
        name: toFinnhubSymbol(symbol.symbol),
        ticker: toFinnhubSymbol(symbol.symbol),
        type: 'forex',
        session: '24x7',
        timezone: 'Etc/UTC',
        minmov: 1,
        pricescale: 100,
        description: symbol?.name,
        has_intraday: true,
        supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D'],
        volume_precision: 2,
        data_status: 'streaming',
      });
    } else {
      // Return an array of supported symbols
      res.json(
        defaultSymbols.map((s) => ({
          name: toFinnhubSymbol(s.symbol),
          ticker: toFinnhubSymbol(s.symbol),
          type: s.type,
          session: '24x7',
          description: s?.name,
          timezone: 'Etc/UTC',
          minmov: 1,
          pricescale: 100,
          has_intraday: true,
          supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D'],
          volume_precision: 2,
          data_status: 'streaming',
        }))
      );
    }
    // const symbol = req.query.symbol || 'OANDA:XAU_USD';
    // console.log('symbol', symbol);
    // const data = await fetchFinnhub('search', { q: symbol });
    // if (!data || !data.result || data.result.length === 0) {
    //   return res.status(404).json({ error: 'Symbol not found in Finnhub' });
    // }
    // const info = data.result[0];
    // console.log('info', info);
    // res.json({
    //   name: info.displaySymbol || info.symbol,
    //   ticker: info.symbol,
    //   description: info.description || info.displaySymbol || info.symbol,
    //   type: info.type ? info.type.toLowerCase() : 'stock',
    //   session: '24x7',
    //   exchange: info.exchange || 'Finnhub',
    //   listed_exchange: info.exchange || 'Finnhub',
    //   timezone: 'Etc/UTC',
    //   minmov: 1,
    //   pricescale: 100,
    //   has_intraday: true,
    //   intraday_multipliers: ['1', '5', '15', '30', '60'],
    //   supported_resolutions: ['1', '5', '15', '30', '60', '1D'],
    //   volume_precision: 2,
    // });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/history', async (req, res) => {
  const symbol = req.query.symbol || 'OANDA:XAU_USD';
  const resolution = req.query.resolution || '1';
  const from = req.query.from ? parseInt(req.query.from, 10) : undefined;
  const to = req.query.to ? parseInt(req.query.to, 10) : undefined;
  const finnhubResolution = resolution === '1D' ? 'D' : resolution;
  const intervalMap = {
    1: '1',
    5: '5',
    15: '15',
    30: '30',
    60: '60',
    240: '240',
    D: 'D',
  };
  //   intervalMap[resolution]
  try {
    const data = await fetchFinnhub('stock/candle', {
      symbol,
      resolution: finnhubResolution,
      from: from,
      to: to,
    });

    if (!data || data.s !== 'ok' || !Array.isArray(data.t)) {
      return res.json({ s: 'no_data' });
    }
    res.json({
      s: data.s,
      t: data.t,
      o: data.o,
      h: data.h,
      l: data.l,
      c: data.c,
      v: data.v,
    });
  } catch (e) {
	console.log(e)
    res.status(500).json({ status: 0, message: e.message });
  }
});

// /price endpoint using finnhub quote API
router.get('/price', async (req, res) => {
  const symbol = req.query.symbol || 'OANDA:XAU_USD';
  try {
    const data = await fetchFinnhub('quote', { symbol });
    res.json({
      symbol,
      price: data.c, // current price
      open: data.o,
      high: data.h,
      low: data.l,
      prevClose: data.pc,
    });
  } catch (err) {
    console.error('Price fetch error', err);
    res.status(500).json({ error: 'Failed to fetch price' });
  }
});

// /quotes endpoint using finnhub quote API for multiple symbols
router.get('/quotes', async (req, res) => {
  const symbols = req.query.symbols?.split(',') || ['OANDA:XAU_USD'];
  try {
    // Finnhub does not support batch quote, so fetch sequentially
    const results = [];
    for (const symbol of symbols) {
      try {
        const data = await fetchFinnhub('quote', { symbol });
        if (data && typeof data.c !== 'undefined') {
          results.push({
            symbol,
            price: data.c,
            open: data.o,
            high: data.h,
            low: data.l,
            prevClose: data.pc,
          });
        }
      } catch (error) {
        console.error(`Finnhub/axios error for symbol ${symbol}:`, error);
        // Skip this symbol
      }
    }
    res.json({ s: 'ok', data: results });
  } catch (err) {
    console.error(err);
    res.json({ s: 'error', errmsg: 'Failed to fetch quotes' });
  }
});

// /marks endpoint for TradingView marks (example: from trades)
router.get('/marks', async (req, res) => {
  try {
    // You may want to filter by userId, symbol, etc.
    const trades = await Trade.findAll({ where: { userId: 1 } });
    const marks = trades.map((t) => ({
      id: t.id,
      time: Math.floor(new Date(t.createdAt).getTime() / 1000),
      color: t.side === 'buy' ? 'green' : 'red',
      label: t.side === 'buy' ? 'B' : 'S',
      tooltip: `${t.side.toUpperCase()} @ ${t.price}`,
      symbol: t.symbol,
      price: t.price,
    }));
    res.json(marks);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch marks' });
  }
});

// /market-stats endpoint using finnhub quote API
router.get('/market-stats', async (req, res) => {
  const symbol = req.query.symbol || 'OANDA:XAU_USD';
  try {
    const data = await fetchFinnhub('quote', { symbol });
    res.json({
      previousClose: data.pc,
      open: data.o,
      low: data.l,
      high: data.h,
      close: data.c,
      dailyChange: data.dp ? `${data.dp.toFixed(2)}%` : 'N/A',
      bid: 'N/A',
      ask: 'N/A',
      volume: 'N/A',
      fiftyTwoWeekLow: 'N/A',
      fiftyTwoWeekHigh: 'N/A',
    });
  } catch (e) {
    console.error('Error fetching market stats:', e);
    res.status(500).json({ message: 'Failed to fetch market stats' });
  }
});

module.exports = router;
