const express = require('express');
const router = express.Router();
const controller = require('../controller/chart.controller');

// Rate limiting for chart endpoints
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 120; // Increased from 30 to 120 requests per minute

// Rate limiting middleware
function rateLimit(req, res, next) {
  const clientId = req.ip || 'unknown';
  const now = Date.now();

  if (!requestCounts.has(clientId)) {
    requestCounts.set(clientId, {
      count: 0,
      resetTime: now + RATE_LIMIT_WINDOW,
    });
  }

  const client = requestCounts.get(clientId);

  // Reset counter if window has passed
  if (now > client.resetTime) {
    client.count = 0;
    client.resetTime = now + RATE_LIMIT_WINDOW;
  }

  // Log request for debugging
  console.log(
    `[Rate Limit] ${req.method} ${req.path} - Client: ${clientId}, Count: ${
      client.count + 1
    }/${MAX_REQUESTS_PER_WINDOW}`
  );

  // Check if limit exceeded
  if (client.count >= MAX_REQUESTS_PER_WINDOW) {
    console.warn(
      `[Rate Limit] Exceeded for client ${clientId} - ${client.count} requests in window`
    );
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      retryAfter: Math.ceil((client.resetTime - now) / 1000),
    });
  }

  // Increment counter
  client.count++;
  next();
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [clientId, client] of requestCounts.entries()) {
    if (now > client.resetTime) {
      requestCounts.delete(clientId);
    }
  }
}, RATE_LIMIT_WINDOW);

router.get('/symbols', rateLimit, controller.getSymbols);
router.get('/history', rateLimit, controller.getHistoryData);
// /market-stats endpoint using finnhub quote API
router.get('/market-stats', rateLimit, controller.getMarketStatus);
// first time call get selected value for trade
router.get('/market-price', rateLimit, controller.getMarketPrice);
// /price endpoint using finnhub quote API
router.get('/price', rateLimit, controller.getPrice);
// /quotes endpoint using finnhub quote API for multiple symbols
router.get('/quotes', rateLimit, controller.getQuotes);
router.get('/config', controller.configuration);

module.exports = router;
