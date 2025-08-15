const { Trade, Wallet } = require("../models");
const getLivePrice = require("../utils/getLivePrice");

async function processTrades() {
  const trades = await Trade.findAll({ where: { status: 'open' } });

  for (const trade of trades) {
    const price = await getLivePrice(trade.symbol);
    let shouldClose = false;
    let reason = "";

    if (trade.takeProfit) {
      if (trade.side === 'buy' && price >= trade.takeProfit) {
        shouldClose = true;
        reason = 'tp_hit';
      } else if (trade.side === 'sell' && price <= trade.takeProfit) {
        shouldClose = true;
        reason = 'tp_hit';
      }
    }

    if (trade.stopLoss) {
      if (trade.side === 'buy' && price <= trade.stopLoss) {
        shouldClose = true;
        reason = 'sl_hit';
      } else if (trade.side === 'sell' && price >= trade.stopLoss) {
        shouldClose = true;
        reason = 'sl_hit';
      }
    }

    if (shouldClose) {
      const pnl = trade.side === "buy"
        ? (price - trade.openPrice) * trade.volume
        : (trade.openPrice - price) * trade.volume;

      trade.closePrice = price;
      trade.closeTime = new Date();
      trade.status = reason;
      trade.profitLoss = pnl;
      await trade.save();

      const wallet = await Wallet.findOne({ where: { userId: trade.userId } });
      wallet.balance += (trade.side === "buy" ? 0 : -trade.volume * price) + pnl;
      await wallet.save();
    }
  }
}

module.exports = { processTrades };
