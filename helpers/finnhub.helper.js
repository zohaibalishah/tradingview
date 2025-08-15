const axios= require("axios");

// Setup Finnhub API key
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

// Helper to fetch from Finnhub REST API using axios
async function fetchFinnhub(endpoint, params = {}) {
  const url = `https://finnhub.io/api/v1/${endpoint}`;
  const fullParams = { ...params, token: FINNHUB_API_KEY };
  const resp = await axios.get(url, { params: fullParams });
  return resp.data;
}


/**
 * Normalize a TradingView-style symbol to Finnhub forex symbol.
 * Examples:
 *  - "XAU/USD" => "OANDA:XAU_USD"
 *  - "OANDA:XAU_USD" => "OANDA:XAU_USD" (unchanged)
 */
function toFinnhubSymbol(symbol) {
  if (!symbol) return null;
  // if already contains colon assume user passed provider prefix
  if (symbol.includes(':')) return symbol;
  // TradingView uses slash, Finnhub forex uses underscore with prefix (OANDA)
  const s = symbol.replace('/', '_');
  return `OANDA:${s}`;
}
/** Reverse mapping: Finnhub symbol -> TV-style (remove provider & underscore) */
function fromFinnhubSymbol(finn) {
  if (!finn) return null;
  // e.g. "OANDA:XAU_USD" -> "XAU/USD"
  const parts = finn.split(':');
  const sym = parts.length > 1 ? parts[1] : parts[0];
  return sym.replace('_', '/');
}
function resolutionToFinnhub(res) {
  // Finnhub expects resolution like "1", "5", "15", "60", "D"
  // We simply pass through common TradingView resolutions
  if (
    res === '1' ||
    res === '5' ||
    res === '15' ||
    res === '30' ||
    res === '60' ||
    res === '240' ||
    res === 'D'
  ) {
    return res;
  }
  // fallback: try to strip possible "1" etc.
  return res;
}

module.exports = {
  fetchFinnhub,
  toFinnhubSymbol,
  fromFinnhubSymbol,
  resolutionToFinnhub,
};
