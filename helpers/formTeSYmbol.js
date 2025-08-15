function normalizeSymbol(symbol) {
    if (symbol === "XAUUSD") return "XAU/USD";
    if (symbol === "BTCUSD") return "BTC/USD";
    return symbol;
  }