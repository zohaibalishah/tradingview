const axios = require('axios');
const dayjs = require('dayjs');
const Spread = require('../models/Spread.model');
const Symbol = require('../models/Symbol.model');

// Setup Finnhub API key
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

// Rate limiting configuration - Updated to 150 requests per minute
const RATE_LIMIT = {
  requestsPerMinute: 150, // Updated to 150 requests per minute
  requestsPerSecond: 2.5, // Conservative limit (150/60 = 2.5 requests per second)
  windowMs: 60000, // 1 minute window
};

// Cache for API responses with different TTLs based on data type
const cache = new Map();
const CACHE_TTL = {
  price: 30 * 1000, // 30 seconds for price data
  candle: 5 * 60 * 1000, // 5 minutes for candle data
  quote: 10 * 1000, // 10 seconds for quote data
  default: 5 * 60 * 1000, // 5 minutes default
};

// Request tracking for rate limiting
let requestCount = 0;
let lastRequestTime = 0;
let lastMinuteReset = Date.now();
const requestQueue = [];

// Monitoring and logging
let totalRequests = 0;
let cacheHits = 0;
let rateLimitHits = 0;
let errors429 = 0;

// Log monitoring stats periodically
setInterval(() => {
  const now = Date.now();
  const cacheSize = cache.size;
  const cacheHitRate = totalRequests > 0 ? ((cacheHits/totalRequests)*100).toFixed(1) : 0;
  // Reset counters for new minute
  if (now - lastMinuteReset >= RATE_LIMIT.windowMs) {
    requestCount = 0;
    lastMinuteReset = now;
    console.log(`[Finnhub] Rate limit window reset`);
  }
}, 60000); // Log every minute

// Clean up old cache entries periodically
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [key, entry] of cache.entries()) {
    const ttl = CACHE_TTL[entry.type] || CACHE_TTL.default;
    if (now - entry.timestamp > ttl) {
      cache.delete(key);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`[Finnhub] Cleaned ${cleanedCount} expired cache entries`);
  }
}, 30000); // Clean every 30 seconds

// Helper to check if we can make a request
function canMakeRequest() {
  const now = Date.now();
  
  // Reset counter if a minute has passed
  if (now - lastMinuteReset >= RATE_LIMIT.windowMs) {
    requestCount = 0;
    lastMinuteReset = now;
  }
  
  return requestCount < RATE_LIMIT.requestsPerMinute;
}

// Helper to wait for rate limit
function waitForRateLimit() {
  return new Promise((resolve) => {
    const checkAndResolve = () => {
      if (canMakeRequest()) {
        resolve();
      } else {
        rateLimitHits++;
        const waitTime = Math.ceil((RATE_LIMIT.windowMs - (Date.now() - lastMinuteReset)) / 1000);
        console.warn(`[Finnhub] Rate limit hit, waiting ${waitTime}s... (${requestCount}/${RATE_LIMIT.requestsPerMinute})`);
        setTimeout(checkAndResolve, 1000); // Check every second
      }
    };
    checkAndResolve();
  });
}

// Helper to generate cache key
function generateCacheKey(endpoint, params) {
  return `${endpoint}:${JSON.stringify(params)}`;
}

// Helper to get cache TTL based on endpoint
function getCacheTTL(endpoint) {
  if (endpoint.includes('quote')) return CACHE_TTL.quote;
  if (endpoint.includes('candle') || endpoint.includes('stock/candle')) return CACHE_TTL.candle;
  if (endpoint.includes('price')) return CACHE_TTL.price;
  return CACHE_TTL.default;
}

// Helper to check if cache is valid
function isCacheValid(cacheEntry, ttl) {
  return Date.now() - cacheEntry.timestamp < ttl;
}

// Helper to fetch from Finnhub REST API using axios with rate limiting and caching
async function fetchFinnhub(endpoint, params = {}) {
  totalRequests++;
  const cacheKey = generateCacheKey(endpoint, params);
  const cacheTTL = getCacheTTL(endpoint);
  
  // Check cache first
  if (cache.has(cacheKey)) {
    const cacheEntry = cache.get(cacheKey);
    if (isCacheValid(cacheEntry, cacheTTL)) {
      cacheHits++;
      console.log(`[Finnhub] Cache hit for ${endpoint} (${cacheHits}/${totalRequests} = ${((cacheHits/totalRequests)*100).toFixed(1)}%)`);
      return cacheEntry.data;
    } else {
      cache.delete(cacheKey);
    }
  }
  
  // Wait for rate limit if necessary
  await waitForRateLimit();
  
  try {
    const url = `https://finnhub.io/api/v1/${endpoint}`;
    const fullParams = { ...params, token: FINNHUB_API_KEY };
    
    console.log(`[Finnhub] Making request to ${endpoint} (${requestCount + 1}/${RATE_LIMIT.requestsPerMinute})`);
    const resp = await axios.get(url, { 
      params: fullParams,
      timeout: 10000 // 10 second timeout
    });
    
    // Update rate limit tracking
    requestCount++;
    lastRequestTime = Date.now();
    
    // Cache the response with type information
    cache.set(cacheKey, {
      data: resp.data,
      timestamp: Date.now(),
      type: endpoint.split('/')[0] // Extract type from endpoint
    });
    
    return resp.data;
  } catch (error) {
    if (error.response && error.response.status === 429) {
      errors429++;
      console.error(`[Finnhub] Rate limit exceeded (${errors429} times), waiting 60 seconds...`);
      // Wait 60 seconds and retry once
      await new Promise(resolve => setTimeout(resolve, 60000));
      return fetchFinnhub(endpoint, params);
    }
    
    console.error(`[Finnhub] API error for ${endpoint}:`, error.message);
    throw error;
  }
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

function adjustDates(from, to) {
  const today = dayjs();
  let f = dayjs.unix(from);
  let t = dayjs.unix(to);

  // If weekend → shift to last Friday
  if (today.day() === 6) {
    // Saturday
    f = today.subtract(1, 'day').startOf('day');
    t = today.subtract(1, 'day').endOf('day');
  } else if (today.day() === 0) {
    // Sunday
    f = today.subtract(2, 'day').startOf('day');
    t = today.subtract(2, 'day').endOf('day');
  }

  return { from: f.unix(), to: t.unix() };
}

// Update the applyBrokerSpread function to use database spreads
async function applyBrokerSpread(price, symbol = 'OANDA:XAU_USD') {
  if (typeof price !== 'number') {
    throw new Error('Invalid input: price must be a number');
  }

  try {
    // Get spread from database
    const spreadRecord = await Symbol.findOne({ where: { externalSymbol: symbol } });
    if (!spreadRecord) {
      throw new Error(`No spread record found for symbol: ${symbol}`);
    }
    const spread = parseFloat(spreadRecord.defaultSpread);

    return {
      bid: parseFloat((price - spread / 2).toFixed(5)),
      ask: parseFloat((price + spread / 2).toFixed(5)),
      mid: parseFloat(price.toFixed(5)),
    };
  } catch (error) {
    console.error('Error fetching spread from database:', error);
    // Fallback to default spread
    const defaultSpread = 0.1;
    return {
      bid: parseFloat((price - defaultSpread / 2).toFixed(5)),
      ask: parseFloat((price + defaultSpread / 2).toFixed(5)),
      mid: parseFloat(Number(price).toFixed(5)),
    };
  }
}

// Export monitoring functions for debugging
function getRateLimitStatus() {
  const now = Date.now();
  const timeUntilReset = Math.max(0, RATE_LIMIT.windowMs - (now - lastMinuteReset));
  
  return {
    currentRequests: requestCount,
    maxRequests: RATE_LIMIT.requestsPerMinute,
    remainingRequests: RATE_LIMIT.requestsPerMinute - requestCount,
    timeUntilReset: Math.ceil(timeUntilReset / 1000),
    totalRequests,
    cacheHits,
    cacheHitRate: totalRequests > 0 ? ((cacheHits/totalRequests)*100).toFixed(1) : 0,
    cacheSize: cache.size,
    rateLimitHits,
    errors429
  };
}

module.exports = {
  fetchFinnhub,
  toFinnhubSymbol,
  fromFinnhubSymbol,
  resolutionToFinnhub,
  adjustDates,
  applyBrokerSpread,
  getRateLimitStatus,
};
