const cron = require("node-cron");
const { Trade, Wallet } = require("../models");
const axios = require("axios");

const SYMBOL = "XAU/USD";
const BASE_URL = "https://your-quote-source.com";
const API_KEY = "your_api_key";

async function checkPrice() {
  const response = await axios.get(`${BASE_URL}/quote`, {
    params: { symbol: SYMBOL, apikey: API_KEY }
  });
  return parseFloat(response.data.price); // live price
}

async function autoCloseTrades() {
  const price = await checkPrice();

  const trades = await Trade.findAll({ where: { status: "open" } });

  for (let trade of trades) {
    const { sl, tp, side, entryPrice, volume } = trade;

    let shouldClose = false;
    let closeType = "";

    if (sl && ((side === "buy" && price <= sl) || (side === "sell" && price >= sl))) {
      shouldClose = true;
      closeType = "SL";
    }

    if (tp && ((side === "buy" && price >= tp) || (side === "sell" && price <= tp))) {
      shouldClose = true;
      closeType = "TP";
    }

    if (shouldClose) {
      trade.status = "closed";
      trade.closePrice = price;
      trade.closedAt = new Date();
      await trade.save();

      // Optional: update wallet
      const wallet = await Wallet.findOne({ where: { userId: trade.userId } });
      const value = volume * price;
      if (side === "buy") {
        wallet.balance += value;
      } else {
        wallet.balance -= value;
      }
      await wallet.save();

      console.log(`Trade ${trade.id} closed at ${price} via ${closeType}`);
    }
  }
}

cron.schedule("*/10 * * * * *", autoCloseTrades); // Every 10 seconds
