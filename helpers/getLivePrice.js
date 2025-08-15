const axios = require('axios');

async function getLivePrice(symbol = 'XAU/USD') {
	try {
		const response = await axios.get(`${process.env.BASE_URL}/price`, {
			params: {
				symbol,
				apikey: process.env.API_KEY,
			},
		});

		if (response.data && response.data.price) {
			return parseFloat(response.data.price);
		} else {
			console.error('Invalid response from TwelveData:', response.data);
			return null;
		}
	} catch (error) {
		console.error('Error fetching price from TwelveData:', error.message);
		return null;
	}
}

module.exports = getLivePrice;

// async function getLivePrice(symbol = 'XAUUSD') {
//   // Map your symbol to Binance format if needed
//   const binanceSymbol = symbol.replace('USD', 'USDT'); // e.g., XAUUSD → XAUUSDT

//   try {
//     const response = await axios.get(`https://api.binance.com/api/v3/ticker/price?symbol=${binanceSymbol}`);
//     const price = parseFloat(response.data.price);
//     return price;
//   } catch (err) {
//     console.error(`Error fetching price for ${symbol}:`, err.message);
//     return null;
//   }
// }
