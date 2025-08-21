const axios = require('axios');
const { fetchFinnhub } = require('./finnhub.helper');

async function getLatestPrice(symbol = 'OANDA:XAU_USD') {
  if (global.latestPrices[symbol]) {
    return global.latestPrices[symbol];
  }
  try {
    const res = await fetchFinnhub('quote', { symbol });
    if (res?.c) {
      const price = res.c;
      global.latestPrices[symbol] = price; // cache it
      return price;
    }
  } catch (err) {
    console.error('REST price error:', err.message);
  }

  return price
}

module.exports = { getLatestPrice };
