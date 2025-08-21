const Trade = require('../models/Trading.model');

const {
  toFinnhubSymbol,
  fetchFinnhub,
  adjustDates,
  applyBrokerSpread,
  getRateLimitStatus,
} = require('../helpers/finnhub.helper');
const { getLatestPrice } = require('../helpers/getLivePrice');
const { isMarketOpen } = require('../helpers/marketStatus');
const candleDataService = require('../services/candleData.service');

module.exports.getSymbols = async (req, res) => {
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
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports.configuration = async (req, res) => {
  try {
    const config = {
      supported_resolutions: ['1', '5', '15', '30', '60', '240', 'D'],
      supports_marks: false,
      supports_timescale_marks: false,
      supports_time: true,
    };
    res.json(config);
  } catch (error) {
    console.error('[Config] Error:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
};

module.exports.getQuotes = async (req, res) => {
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
        if (error.response && error.response.status === 429) {
          return res.status(429).json({
            error: 'Rate limit exceeded',
            message: 'Finnhub API rate limit exceeded. Please try again later.',
          });
        }
        // Skip this symbol
      }
    }
    res.json({ s: 'ok', data: results });
  } catch (err) {
    console.error(err);
    if (err.response && err.response.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Finnhub API rate limit exceeded. Please try again later.',
      });
    }
    res.json({ s: 'error', errmsg: 'Failed to fetch quotes' });
  }
};

module.exports.getPrice = async (req, res) => {
  const symbol = req.query.symbol || 'OANDA:XAU_USD';
  try {
    const price = await getLatestPrice('OANDA:XAU_USD');
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
    if (err.response && err.response.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Finnhub API rate limit exceeded. Please try again later.',
      });
    }
    res.status(500).json({ error: 'Failed to fetch price' });
  }
};

module.exports.getMarketPrice = async (req, res) => {
  const symbol = req.query.symbol || 'OANDA:XAU_USD';
  try {
    let midPrice = global.latestPrices[symbol];
    console.log(midPrice);
    if (!midPrice) {
      midPrice = await getLatestPrice(symbol);
      global.latestPrices[symbol] = midPrice;
    }
    const withSpread = await applyBrokerSpread(Number(midPrice));
    res.json({ symbol, withSpread });
  } catch (err) {
    console.error('Price fetch error:', err);
    if (err.response && err.response.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Finnhub API rate limit exceeded. Please try again later.',
      });
    }
    res.status(500).json({ error: 'Failed to fetch market price' });
  }
};

module.exports.getMarketStatus = async (req, res) => {
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
    console.error('Error etching market stats:', e);
    if (e.response && e.response.status === 429) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: 'Finnhub API rate limit exceeded. Please try again later.',
      });
    }
    res.status(500).json({ message: 'Failed to fetch market stats' });
  }
};

module.exports.getHistoryData = async (req, res) => {
  const symbol = req.query.symbol || 'OANDA:XAU_USD';
  const resolution = req.query.resolution || '1';
  const from = req.query.from ? parseInt(req.query.from, 10) : undefined;
  const to = req.query.to ? parseInt(req.query.to, 10) : undefined;
  const countBack = req.query.countBack
    ? parseInt(req.query.countBack, 10)
    : undefined;

  try {
    // Use the new candle data service
    const data = await candleDataService.getHistoricalData(
      symbol,
      resolution,
      from,
      to,
      countBack
    );

    console.log(
      `[History] Returning ${
        data.s === 'ok' ? data.t?.length || 0 : 0
      } candles for ${symbol} ${resolution}`
    );
    res.json(data);
  } catch (error) {
    console.error('[History] Error:', error);
    res
      .status(500)
      .json({ s: 'error', error: 'Failed to fetch historical data' });
  }
};
