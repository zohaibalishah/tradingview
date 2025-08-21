const candleDataService = require('./candleData.service');

class SocketCandleHandler {
  constructor() {
    this.candles = {}; // In-memory candles being built
    this.lastCandleTime = {}; // Track last candle time per symbol
    this.intervals = ['1m', '5m', '15m', '30m', '1h', '4h']; // Supported intervals
    this.isShuttingDown = false; // Flag to prevent new operations during shutdown
    this.cleanupIntervals = []; // Store interval IDs for cleanup
  }

  // Get interval duration in milliseconds
  getIntervalDuration(interval) {
    const durationMap = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
    };
    return durationMap[interval] || 60 * 1000;
  }

  // Get candle start time for a given timestamp and interval
  getCandleStartTime(timestamp, interval) {
    const duration = this.getIntervalDuration(interval);
    return Math.floor(timestamp / duration) * duration;
  }

  // Handle incoming tick data
  async handleTick(tick) {
    // Don't process new ticks if shutting down
    if (this.isShuttingDown) {
      return;
    }

    const { symbol = 'OANDA:XAU_USD', price, timestamp } = tick;
    
    if (!price || !timestamp) {
      console.warn('[SocketCandle] Invalid tick data:', tick);
      return;
    }

    // Validate price value
    const numPrice = Number(price);
    if (isNaN(numPrice) || numPrice <= 0) {
      console.warn('[SocketCandle] Invalid price value:', price, 'for symbol:', symbol);
      return;
    }

    // Check if price is within reasonable bounds (0.01 to 1,000,000)
    if (numPrice < 0.01 || numPrice > 1000000) {
      console.warn('[SocketCandle] Price out of reasonable bounds:', numPrice, 'for symbol:', symbol);
      return;
    }

    try {
      // Process for all intervals
      for (const interval of this.intervals) {
        await this.processTickForInterval(symbol, numPrice, timestamp, interval);
      }
    } catch (error) {
      // Only log if not shutting down
      if (!this.isShuttingDown) {
        console.error('[SocketCandle] Error handling tick:', error);
      }
    }
  }

  // Process tick for a specific interval
  async processTickForInterval(symbol, price, timestamp, interval) {
    // Don't process if shutting down
    if (this.isShuttingDown) {
      return;
    }

    const candleTime = this.getCandleStartTime(timestamp, interval);
    const key = `${symbol}_${interval}`;

    // Check if we need to complete the previous candle
    if (this.lastCandleTime[key] && candleTime !== this.lastCandleTime[key]) {
      await this.completeCandle(symbol, interval, this.lastCandleTime[key]);
    }

    // Update last candle time
    this.lastCandleTime[key] = candleTime;

    // Get or create candle for current interval
    if (!this.candles[key]) {
      this.candles[key] = {
        symbol,
        interval,
        time: candleTime,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: 1,
      };
    } else {
      // Update existing candle
      const candle = this.candles[key];
      candle.high = Math.max(candle.high, price);
      candle.low = Math.min(candle.low, price);
      candle.close = price;
      candle.volume += 1;
    }

    // Store the updated candle
    await this.storeCandle(this.candles[key]);
  }

  // Store candle in database
  async storeCandle(candleData) {
    // Don't store if shutting down
    if (this.isShuttingDown) {
      return;
    }

    try {
      await candleDataService.storeSocketCandle(candleData);
    } catch (error) {
      // Only log if not shutting down and it's not a connection closed error
      if (!this.isShuttingDown && !error.message.includes('ConnectionManager.getConnection was called after the connection manager was closed')) {
        console.error('[SocketCandle] Error storing candle:', error);
      }
    }
  }

  // Complete a candle (mark as finished)
  async completeCandle(symbol, interval, candleTime) {
    // Don't complete if shutting down
    if (this.isShuttingDown) {
      return;
    }

    const key = `${symbol}_${interval}`;
    
    if (this.candles[key] && this.candles[key].time === candleTime) {
      try {
        // Mark candle as complete in database
        await candleDataService.completeCandle(symbol, interval, candleTime);
        
        // Remove from memory
        delete this.candles[key];
        
        console.log(`[SocketCandle] Completed candle for ${symbol} ${interval} at ${new Date(candleTime).toISOString()}`);
      } catch (error) {
        // Only log if not shutting down and it's not a connection closed error
        if (!this.isShuttingDown && !error.message.includes('ConnectionManager.getConnection was called after the connection manager was closed')) {
          console.error('[SocketCandle] Error completing candle:', error);
        }
      }
    }
  }

  // Complete all current candles (called on shutdown or interval)
  async completeAllCandles() {
    const promises = Object.keys(this.candles).map(key => {
      const [symbol, interval] = key.split('_');
      const candle = this.candles[key];
      return this.completeCandle(symbol, interval, candle.time);
    });

    await Promise.all(promises);
  }

  // Get current incomplete candles
  getCurrentCandles() {
    return Object.values(this.candles);
  }

  // Clean up old data periodically
  async cleanupOldData() {
    // Don't cleanup if shutting down
    if (this.isShuttingDown) {
      return;
    }

    try {
      await candleDataService.cleanupOldData(30); // Keep 30 days
    } catch (error) {
      // Only log if not shutting down and it's not a connection closed error
      if (!this.isShuttingDown && !error.message.includes('ConnectionManager.getConnection was called after the connection manager was closed')) {
        console.error('[SocketCandle] Error cleaning up old data:', error);
      }
    }
  }

  // Initialize handler
  async initialize() {
    console.log('[SocketCandle] Initializing socket candle handler...');
    
    // Set up periodic cleanup
    const cleanupInterval = setInterval(() => {
      this.cleanupOldData();
    }, 24 * 60 * 60 * 1000); // Daily cleanup
    this.cleanupIntervals.push(cleanupInterval);

    // Set up candle completion check
    const completionInterval = setInterval(() => {
      this.checkAndCompleteCandles();
    }, 10000); // Check every 10 seconds
    this.cleanupIntervals.push(completionInterval);
  }

  // Check and complete candles that should be finished
  async checkAndCompleteCandles() {
    // Don't check if shutting down
    if (this.isShuttingDown) {
      return;
    }

    const now = Date.now();
    
    for (const key of Object.keys(this.candles)) {
      const [symbol, interval] = key.split('_');
      const candle = this.candles[key];
      const duration = this.getIntervalDuration(interval);
      
      // If the candle time is older than the interval duration, complete it
      if (now - candle.time >= duration) {
        await this.completeCandle(symbol, interval, candle.time);
      }
    }
  }

  // Get statistics
  async getStats() {
    try {
      const dbStats = await candleDataService.getStats();
      const currentCandles = this.getCurrentCandles();
      
      return {
        ...dbStats,
        currentIncompleteCandles: currentCandles.length,
        supportedIntervals: this.intervals,
        lastCandleTimes: this.lastCandleTime,
      };
    } catch (error) {
      console.error('[SocketCandle] Error getting stats:', error);
      throw error;
    }
  }

  // Cleanup method for graceful shutdown
  async cleanup() {
    console.log('[SocketCandle] Starting cleanup...');
    
    // Set shutdown flag to prevent new operations
    this.isShuttingDown = true;
    
    // Clear all intervals
    this.cleanupIntervals.forEach(intervalId => {
      clearInterval(intervalId);
    });
    this.cleanupIntervals = [];
    
    // Complete all current candles
    console.log('[SocketCandle] Completing all current candles...');
    await this.completeAllCandles();
    
    // Clear memory
    this.candles = {};
    this.lastCandleTime = {};
    
    console.log('[SocketCandle] Cleanup completed');
  }
}

module.exports = new SocketCandleHandler();
