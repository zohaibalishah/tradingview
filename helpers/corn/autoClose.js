// cron/autoClose.js
const cron = require("node-cron");
const  Trade = require("../../models/Trading.model");
const axios = require("axios");

cron.schedule("*/1 * * * *", async () => {
  const openTrades = await Trade.findAll({ where: { status: "open" } });

  for (let trade of openTrades) {
    const res = await axios.get(`${process.env.BASE_URL}/quote`, {
      params: { symbol: trade.symbol, apikey: API_KEY }
    });

    const price = parseFloat(res.data.price);

    const hitSL = trade.side === "buy" ? price <= trade.sl : price >= trade.sl;
    const hitTP = trade.side === "buy" ? price >= trade.tp : price <= trade.tp;

    if ((trade.sl && hitSL) || (trade.tp && hitTP)) {
      trade.closePrice = price;
      trade.status = "closed";
      trade.closeTime = new Date();
      await trade.save();
      console.log(`Auto-closed trade ID ${trade.id}`);
    }
  }
});
