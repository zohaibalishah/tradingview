const Candle = require('../models/Candle.model');
const { fetchFinnhub } = require('../helpers/finnhub.helper');
const { Op } = require('sequelize');

class CandleDataService {
  constructor() {
    this.cache = new Map(); // In-memory cache for recent candles
    this.cacheTimeout = 30000; // 30 seconds cache timeout
  }

  // Convert resolution to interval string
  resolutionToInterval(resolution) {
    const intervalMap = {
      '1': '1m',
      '5': '5m',
      '15': '15m',
      '30': '30m',
      '60': '1h',
      '240': '4h',
      'D': '1d',
      '1D': '1d',
    };
    return intervalMap[resolution] || '1m';
  }

  // Convert interval string to resolution
  intervalToResolution(interval) {
    const resolutionMap = {
      '1m': '1',
      '5m': '5',
      '15m': '15',
      '30m': '30',
      '1h': '60',
      '4h': '240',
      '1d': 'D',
    };
    return resolutionMap[interval] || '1';
  }

  // Get cache key
  getCacheKey(symbol, interval, from, to) {
    return `${symbol}_${interval}_${from}_${to}`;
  }

  // Get data from cache
  getFromCache(symbol, interval, from, to) {
    const key = this.getCacheKey(symbol, interval, from, to);
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    
    if (cached) {
      this.cache.delete(key);
    }
    
    return null;
  }

  // Set data in cache
  setCache(symbol, interval, from, to, data) {
    const key = this.getCacheKey(symbol, interval, from, to);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  // Store candle data from socket
  async storeSocketCandle(candleData) {
    try {
      const candle = {
        symbol: candleData.symbol || 'OANDA:XAU_USD',
        interval: candleData.interval || '1m',
        time: candleData.time,
        open: candleData.open,
        high: candleData.high,
        low: candleData.low,
        close: candleData.close,
        volume: candleData.volume || 0,
        source: 'socket',
        isComplete: false, // Socket candles are initially incomplete
      };

      await Candle.upsertCandle(candle);
      
      // Update cache
      this.clearCacheForSymbol(candle.symbol, candle.interval);
      
      return candle;
    } catch (error) {
      console.error('Error storing socket candle:', error);
      throw error;
    }
  }

  // Complete a candle (mark as finished)
  async completeCandle(symbol, interval, time) {
    try {
      await Candle.update(
        { isComplete: true },
        {
          where: {
            symbol,
            interval,
            time,
            isComplete: false,
          },
        }
      );
    } catch (error) {
      console.error('Error completing candle:', error);
      throw error;
    }
  }

  // Get historical data from database first, then API if needed
  async getHistoricalData(symbol, resolution, from, to, countBack = null) {
    const interval = this.resolutionToInterval(resolution);
    
    try {
      // Try to get data from cache first
      const cachedData = this.getFromCache(symbol, interval, from, to);
      if (cachedData) {
        console.log(`[CandleData] Returning cached data for ${symbol} ${interval}`);
        return cachedData;
      }

      // Check if market is closed and adjust request accordingly
      const { isMarketOpen } = require('../helpers/marketStatus');
      const marketClosed = !isMarketOpen();
      
      if (marketClosed) {
        console.log(`[CandleData] Market is closed. Providing last closed market data for ${symbol} ${interval}`);
        
        // Get the last closed market data
        const lastClosedData = await this.getLastClosedMarketData(symbol, interval, from, to, countBack);
        if (lastClosedData && lastClosedData.length > 0) {
          const result = this.formatForChart(lastClosedData);
          this.setCache(symbol, interval, from, to, result);
          return result;
        }
      }

      // Get data from database
      const dbData = await this.getFromDatabase(symbol, interval, from, to);
      
      if (dbData && dbData.length > 0) {
        console.log(`[CandleData] Found ${dbData.length} candles in database for ${symbol} ${interval}`);
        
        // Check if we have enough data
        if (!countBack || dbData.length >= countBack) {
          const result = this.formatForChart(dbData);
          this.setCache(symbol, interval, from, to, result);
          return result;
        }
        
        // If we need more data, try to get from API
        console.log(`[CandleData] Need ${countBack} candles, have ${dbData.length}. Fetching from API...`);
      }

      // Get data from API
      const apiData = await this.getFromAPI(symbol, resolution, from, to);
      
      if (apiData && apiData.length > 0) {
        console.log(`[CandleData] Got ${apiData.length} candles from API for ${symbol} ${resolution}`);
        
        // Store API data in database
        await this.storeAPIData(symbol, interval, apiData);
        
        const result = this.formatForChart(apiData);
        this.setCache(symbol, interval, from, to, result);
        return result;
      }

      // If no data from either source, return empty result
      console.log(`[CandleData] No data available for ${symbol} ${interval}`);
      return { s: 'no_data' };

    } catch (error) {
      console.error('Error getting historical data:', error);
      throw error;
    }
  }

  // Get data from database
  async getFromDatabase(symbol, interval, from, to) {
    try {
      const candles = await Candle.findByTimeRange(symbol, interval, from, to);
      return candles.map(candle => candle.toBarFormat());
    } catch (error) {
      console.error('Error getting data from database:', error);
      return [];
    }
  }

  // Get data from API
  async getFromAPI(symbol, resolution, from, to) {
    try {
      const data = await fetchFinnhub('stock/candle', {
        symbol,
        resolution,
        from,
        to,
      });

      if (!data || data.s !== 'ok' || !Array.isArray(data.t)) {
        console.log('[CandleData] No data returned from API');
        return [];
      }

      // Convert API response to candle format
      const candles = data.t.map((time, i) => ({
        time: data.t[i],
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i],
        volume: Array.isArray(data.v) ? data.v[i] : 0,
      }));

      return candles;
    } catch (error) {
      console.error('Error getting data from API:', error);
      return [];
    }
  }

  // Store API data in database
  async storeAPIData(symbol, interval, apiData) {
    try {
      const candles = apiData.map(candle => ({
        symbol,
        interval,
        time: candle.time,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        source: 'api',
        isComplete: true, // API data is always complete
      }));

      // Use bulk upsert for better performance
      for (const candle of candles) {
        await Candle.upsertCandle(candle);
      }

      console.log(`[CandleData] Stored ${candles.length} candles in database`);
    } catch (error) {
      console.error('Error storing API data:', error);
      throw error;
    }
  }

  // Format data for chart response
  formatForChart(candles) {
    if (!candles || candles.length === 0) {
      return { s: 'no_data' };
    }

    // Sort by time to ensure chronological order
    candles.sort((a, b) => a.time - b.time);

    return {
      s: 'ok',
      t: candles.map(c => c.time),
      o: candles.map(c => c.open),
      h: candles.map(c => c.high),
      l: candles.map(c => c.low),
      c: candles.map(c => c.close),
      v: candles.map(c => c.volume),
    };
  }

  // Get latest candle
  async getLatestCandle(symbol, interval) {
    try {
      const candles = await Candle.findLatest(symbol, interval, 1);
      return candles.length > 0 ? candles[0].toBarFormat() : null;
    } catch (error) {
      console.error('Error getting latest candle:', error);
      return null;
    }
  }

  // Get incomplete candle (current candle being updated)
  async getIncompleteCandle(symbol, interval) {
    try {
      const candle = await Candle.findIncomplete(symbol, interval);
      return candle ? candle.toBarFormat() : null;
    } catch (error) {
      console.error('Error getting incomplete candle:', error);
      return null;
    }
  }

  // Get last closed market data when market is closed
  async getLastClosedMarketData(symbol, interval, from, to, countBack = null) {
    try {
      const dayjs = require('dayjs');
      const utc = require('dayjs/plugin/utc');
      dayjs.extend(utc);

      // Calculate the last market close time
      const now = dayjs().utc();
      let lastMarketClose = now;

      // If it's weekend, go back to Friday 22:00 UTC
      if (now.day() === 6) { // Saturday
        lastMarketClose = now.subtract(1, 'day').hour(22).minute(0).second(0);
      } else if (now.day() === 0) { // Sunday
        lastMarketClose = now.subtract(2, 'day').hour(22).minute(0).second(0);
      } else if (now.day() === 5 && now.hour() >= 22) { // Friday after close
        lastMarketClose = now.hour(22).minute(0).second(0);
      } else {
        // For other days, go back to previous Friday 22:00 UTC
        const daysToSubtract = now.day() === 5 ? 7 : now.day() + 2;
        lastMarketClose = now.subtract(daysToSubtract, 'day').hour(22).minute(0).second(0);
      }

      console.log(`[CandleData] Last market close: ${lastMarketClose.format('YYYY-MM-DD HH:mm:ss UTC')}`);

      // Calculate the start time for the last trading session (previous market open)
      let lastMarketOpen = lastMarketClose.subtract(1, 'day').hour(22).minute(0).second(0);
      
      // If last market close was Friday, the open was Monday
      if (lastMarketClose.day() === 5) {
        lastMarketOpen = lastMarketClose.subtract(4, 'day').hour(22).minute(0).second(0);
      }

      console.log(`[CandleData] Last market open: ${lastMarketOpen.format('YYYY-MM-DD HH:mm:ss UTC')}`);

      // Convert to Unix timestamps
      const lastOpenTimestamp = Math.floor(lastMarketOpen.valueOf() / 1000);
      const lastCloseTimestamp = Math.floor(lastMarketClose.valueOf() / 1000);

      // Adjust the requested time range to the last trading session
      const adjustedFrom = Math.max(from || lastOpenTimestamp, lastOpenTimestamp);
      const adjustedTo = Math.min(to || lastCloseTimestamp, lastCloseTimestamp);

      console.log(`[CandleData] Adjusted time range: ${adjustedFrom} to ${adjustedTo}`);

      // Try to get data from database first
      const dbData = await this.getFromDatabase(symbol, interval, adjustedFrom, adjustedTo);
      
      if (dbData && dbData.length > 0) {
        console.log(`[CandleData] Found ${dbData.length} candles from last trading session in database`);
        return dbData;
      }

      // If no database data, try to get from API for the last trading session
      const resolution = this.intervalToResolution(interval);
      const apiData = await this.getFromAPI(symbol, resolution, adjustedFrom, adjustedTo);
      
      if (apiData && apiData.length > 0) {
        console.log(`[CandleData] Got ${apiData.length} candles from API for last trading session`);
        
        // Store API data in database
        await this.storeAPIData(symbol, interval, apiData);
        return apiData;
      }

      // If still no data, try to get the most recent available data
      console.log(`[CandleData] No last trading session data available, getting most recent data`);
      const recentData = await this.getMostRecentData(symbol, interval, countBack);
      
      return recentData;

    } catch (error) {
      console.error('Error getting last closed market data:', error);
      return [];
    }
  }

  // Get most recent available data when no specific session data is available
  async getMostRecentData(symbol, interval, countBack = 1000) {
    try {
      // Get the most recent candles from database
      const candles = await Candle.findAll({
        where: { symbol, interval },
        order: [['time', 'DESC']],
        limit: countBack,
      });

      if (candles && candles.length > 0) {
        console.log(`[CandleData] Found ${candles.length} most recent candles in database`);
        return candles.map(candle => candle.toBarFormat()).reverse(); // Reverse to get chronological order
      }

      // If no database data, try to get recent data from API
      const resolution = this.intervalToResolution(interval);
      const now = Math.floor(Date.now() / 1000);
      const oneWeekAgo = now - (7 * 24 * 60 * 60); // 1 week ago
      
      const apiData = await this.getFromAPI(symbol, resolution, oneWeekAgo, now);
      
      if (apiData && apiData.length > 0) {
        console.log(`[CandleData] Got ${apiData.length} recent candles from API`);
        await this.storeAPIData(symbol, interval, apiData);
        return apiData;
      }

      return [];

    } catch (error) {
      console.error('Error getting most recent data:', error);
      return [];
    }
  }

  // Clear cache for specific symbol and interval
  clearCacheForSymbol(symbol, interval) {
    for (const [key] of this.cache.entries()) {
      if (key.startsWith(`${symbol}_${interval}_`)) {
        this.cache.delete(key);
      }
    }
  }

  // Clean up old data (keep last 30 days)
  async cleanupOldData(daysToKeep = 30) {
    try {
      const cutoffTime = Math.floor(Date.now() / 1000) - (daysToKeep * 24 * 60 * 60);
      
      const deletedCount = await Candle.destroy({
        where: {
          time: {
            [Op.lt]: cutoffTime,
          },
        },
      });

      console.log(`[CandleData] Cleaned up ${deletedCount} old candles`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old data:', error);
      throw error;
    }
  }

  // Get database statistics
  async getStats() {
    try {
      const { sequelize } = require('../config/db');
      const totalCandles = await Candle.count();
      const symbols = await Candle.findAll({
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('symbol')), 'symbol']],
        raw: true,
      });
      
      const intervals = await Candle.findAll({
        attributes: [[sequelize.fn('DISTINCT', sequelize.col('interval')), 'interval']],
        raw: true,
      });

      const latestCandle = await Candle.findOne({
        order: [['time', 'DESC']],
        attributes: ['symbol', 'interval', 'time'],
      });

      return {
        totalCandles,
        symbols: symbols.map(s => s.symbol),
        intervals: intervals.map(i => i.interval),
        latestCandle: latestCandle ? {
          symbol: latestCandle.symbol,
          interval: latestCandle.interval,
          time: latestCandle.time,
        } : null,
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }
}

module.exports = new CandleDataService();
