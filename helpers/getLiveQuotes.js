const axios = require('axios');

async function getLiveQuotes(symbols = ['XAU/USD']) {
	try {
		if (!Array.isArray(symbols)) {
			symbols = [symbols];
		}
		const quotes = await Promise.all(
			symbols.map(async (symbol) => {
				const response = await axios.get(`${process.env.BASE_URL}/quote`, {
					params: { symbol, apikey: process.env.API_KEY },
				});
				const q = response.data;
				return {
					s: symbol,
					p: parseFloat(q.price),
					o: parseFloat(q.open),
					h: parseFloat(q.high),
					l: parseFloat(q.low),
					c: parseFloat(q.close),
				};
			})
		);

		// const responses = await Promise.all(
		//   symbols.map(symbol =>
		//     axios.get(`${BASE_URL}/quote`, {
		//       params: { symbol, apikey: API_KEY }
		//     })
		//   )
		// );

		// const quotes = responses.map((res, i) => {
		//   const q = res.data;
		//   return {
		//     symbol: symbols[i],
		//     price: parseFloat(q.price),
		//     open: parseFloat(q.open),
		//     high: parseFloat(q.high),
		//     low: parseFloat(q.low),
		//     close: parseFloat(q.close),
		//   };
		// });

		return quotes;
	} catch (error) {
		console.error('Error fetching quotes:', error.message);
		return [];
	}
}

module.exports = getLiveQuotes;
