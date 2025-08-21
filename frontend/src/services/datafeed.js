// This datafeed is compatible with TradingView's UDF interface.
// It provides methods for chart widget integration and fetching historical bars using Finnhub APIs.

import { getSocket } from './socket';
import api from '../utils/api';

// Enhanced caching for bars requests
const barsCache = new Map();
const CACHE_TTL = 2 * 60 * 1000; // 2 minutes cache for bars
const REQUEST_DEBOUNCE = 1000; // 1 second debounce

// Prevent infinite getBars calls by caching last request and result
let lastBarsRequest = null;
let lastBarsResult = null;
let lastBarsPromise = null;
let pendingRequests = new Map();

// Subscription management
const subscriptions = new Map(); // Map<subscriberId, {symbolInfo, resolution, onTick, socket}>

// Track last bar time for each subscription to prevent time violations
const lastBarTimes = new Map(); // Map<subscriberId, {time, resolution}>

// Helper function to get the correct bar time based on resolution
const getBarTime = (timestamp, resolution) => {
  const date = new Date(timestamp);
  const originalTime = date.getTime();

  switch (resolution) {
    case '1':
      // 1 minute - round to nearest minute
      date.setSeconds(0, 0);
      break;
    case '5':
      // 5 minutes - round to nearest 5-minute interval
      const minutes = date.getMinutes();
      const roundedMinutes = Math.floor(minutes / 5) * 5;
      date.setMinutes(roundedMinutes, 0, 0);
      break;
    case '15':
      // 15 minutes - round to nearest 15-minute interval
      const minutes15 = date.getMinutes();
      const roundedMinutes15 = Math.floor(minutes15 / 15) * 15;
      date.setMinutes(roundedMinutes15, 0, 0);
      break;
    case '30':
      // 30 minutes - round to nearest 30-minute interval
      const minutes30 = date.getMinutes();
      const roundedMinutes30 = Math.floor(minutes30 / 30) * 30;
      date.setMinutes(roundedMinutes30, 0, 0);
      break;
    case '60':
    case '1H':
      // 1 hour - round to nearest hour
      date.setMinutes(0, 0, 0);
      break;
    case '240':
    case '4H':
      // 4 hours - round to nearest 4-hour interval
      const hours = date.getHours();
      const roundedHours = Math.floor(hours / 4) * 4;
      date.setHours(roundedHours, 0, 0, 0);
      break;
    case '1D':
    case 'D':
      // Daily - round to start of day
      date.setHours(0, 0, 0, 0);
      break;
    case '1W':
    case 'W':
      // Weekly - round to start of week (Monday)
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
      date.setDate(diff);
      date.setHours(0, 0, 0, 0);
      break;
    case '1M':
    case 'M':
      // Monthly - round to start of month
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      break;
    default:
      // Default to 1 minute
      date.setSeconds(0, 0);
  }

  return date.getTime();
};

// Helper function to validate and correct bar time ordering
const validateBarTime = (subscriberId, barTime, resolution) => {
  const lastBarInfo = lastBarTimes.get(subscriberId);
  
  if (!lastBarInfo) {
    // First bar for this subscription
    lastBarTimes.set(subscriberId, { time: barTime, resolution });
    return barTime;
  }

  // Check if resolution changed
  if (lastBarInfo.resolution !== resolution) {
    // Resolution changed, reset the last bar time
    lastBarTimes.set(subscriberId, { time: barTime, resolution });
    return barTime;
  }

  // Check if the new bar time is greater than or equal to the last bar time
  if (barTime >= lastBarInfo.time) {
    // Valid time progression
    lastBarTimes.set(subscriberId, { time: barTime, resolution });
    return barTime;
  } else {
    // Time violation - use the last valid time plus one interval
    const intervalMs = getIntervalMilliseconds(resolution);
    const correctedTime = lastBarInfo.time + intervalMs;
    lastBarTimes.set(subscriberId, { time: correctedTime, resolution });
    console.warn(`[Datafeed] Time violation corrected: ${barTime} -> ${correctedTime} for resolution ${resolution}`);
    return correctedTime;
  }
};

// Helper function to get interval in milliseconds
const getIntervalMilliseconds = (resolution) => {
  switch (resolution) {
    case '1': return 60 * 1000; // 1 minute
    case '5': return 5 * 60 * 1000; // 5 minutes
    case '15': return 15 * 60 * 1000; // 15 minutes
    case '30': return 30 * 60 * 1000; // 30 minutes
    case '60':
    case '1H': return 60 * 60 * 1000; // 1 hour
    case '240':
    case '4H': return 4 * 60 * 60 * 1000; // 4 hours
    case '1D':
    case 'D': return 24 * 60 * 60 * 1000; // 1 day
    case '1W':
    case 'W': return 7 * 24 * 60 * 60 * 1000; // 1 week
    case '1M':
    case 'M': return 30 * 24 * 60 * 60 * 1000; // 1 month (approximate)
    default: return 60 * 1000; // Default to 1 minute
  }
};

// Helper to generate cache key for bars
function generateBarsCacheKey(symbolInfo, resolution, from, to) {
  return `${symbolInfo.name}:${resolution}:${from}:${to}`;
}

// Helper to check if cache is valid
function isCacheValid(timestamp) {
  return Date.now() - timestamp < CACHE_TTL;
}

// Helper to debounce requests
function debounceRequest(key, fn, delay) {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key);
  }

  const promise = new Promise((resolve, reject) => {
    setTimeout(async () => {
      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      } finally {
        pendingRequests.delete(key);
      }
    }, delay);
  });

  pendingRequests.set(key, promise);
  return promise;
}

// Helper function to handle API errors gracefully
const handleApiError = (error, endpoint) => {
  console.error(`[Datafeed] Error calling ${endpoint}:`, error);
  
  // Check if we received HTML instead of JSON (backend not running)
  if (
    error.response?.data &&
    typeof error.response.data === 'string' &&
    error.response.data.includes('<!doctype')
  ) {
    console.error(
      '[Datafeed] Backend server not responding - received HTML instead of JSON'
    );
    console.error(
      '[Datafeed] Please ensure the backend server is running on http://localhost:4000'
    );
    return { error: 'Backend server not available' };
  }
  
  return { error: error.message || 'API request failed' };
};

export function UDFCompatibleDatafeed() {
  return {
    onReady: async (cb) => {
      try {
        const res = await api.get('/config');
        cb(res.data);
      } catch (err) {
        console.warn(
          '[Datafeed] Config endpoint failed, using fallback config'
        );
        cb({
          supported_resolutions: ['1', '5', '15', '30', '60', 'D', 'W', 'M'],
          supports_search: true,
          supports_group_request: false,
          supports_timescale_marks: false,
          supports_time: true,
          supports_marks: true,
        });
      }
    },

    // Implements TradingView's searchSymbols method for symbol search/autocomplete
    searchSymbols: async (userInput, exchange, symbolType, onResult) => {
      try {
        // Use backend endpoint that proxies Finnhub's symbol search
        const url = `/symbols?symbol=${encodeURIComponent(userInput)}`;
        const res = await api.get(url);
        const data = res.data;
        // TradingView expects an array of symbol objects
        // If backend returns a single symbol, wrap in array
        const results = Array.isArray(data) ? data : [data];
        // Map to TradingView's expected format
        const mapped = results.map((item) => ({
          symbol: item.ticker || item.symbol || item.name,
          full_name: item.name || item.ticker || item.symbol,
          description: item.description || item.name || item.ticker,
          exchange: item.exchange || 'Finnhub',
          ticker: item.ticker || item.symbol || item.name,
          type: item.type || 'stock',
        }));
        onResult(mapped);
      } catch (err) {
        console.warn('[Datafeed] Search symbols error:', err);
        // Return default symbols if backend is not available
        const defaultSymbols = [
          {
            symbol: 'XAU/USD',
            full_name: 'Gold / US Dollar',
            description: 'Gold / US Dollar',
            exchange: 'Finnhub',
            ticker: 'XAU/USD',
            type: 'forex',
          },
          {
            symbol: 'EUR/USD',
            full_name: 'Euro / US Dollar',
            description: 'Euro / US Dollar',
            exchange: 'Finnhub',
            ticker: 'EUR/USD',
            type: 'forex',
          },
          {
            symbol: 'GBP/USD',
            full_name: 'British Pound / US Dollar',
            description: 'British Pound / US Dollar',
            exchange: 'Finnhub',
            ticker: 'GBP/USD',
            type: 'forex',
          },
        ];
        onResult(defaultSymbols);
      }
    },

    resolveSymbol: async (symbolName, onResolve, onError) => {
      // Use backend endpoint that proxies Finnhub's symbol search
      try {
        const url = `/symbols?symbol=${encodeURIComponent(symbolName)}`;
        const res = await api.get(url);
        const data = res.data;
        onResolve({
          name: data.name,
          ticker: data.ticker,
          description: data.description,
          session: data.session,
          timezone: data.timezone,
          type: data.type,
          pricescale: data.pricescale,
          minmov: data.minmov,
          supported_resolutions: data.supported_resolutions,
          exchange: data.exchange,
          listed_exchange: data.listed_exchange,
          has_intraday: data.has_intraday,
          intraday_multipliers: data.intraday_multipliers,
          volume_precision: data.volume_precision,
        });
      } catch (err) {
        console.warn('[Datafeed] Resolve symbol error:', err);
        // Provide fallback symbol info
        onResolve({
          name: symbolName,
          ticker: symbolName,
          description: symbolName,
          session: '24x7',
          timezone: 'Etc/UTC',
          type: 'forex',
          pricescale: 100,
          minmov: 1,
          supported_resolutions: ['1', '5', '15', '30', '60', 'D'],
          exchange: 'Finnhub',
          listed_exchange: 'Finnhub',
          has_intraday: true,
          intraday_multipliers: ['1', '5', '15', '30', '60'],
          volume_precision: 2,
        });
      }
    },

    getBars: async (symbolInfo, resolution, date, onResult) => {
      // Generate cache key
      const cacheKey = generateBarsCacheKey(
        symbolInfo.name,
        resolution,
        date.from,
        date.to
      );

      // Check cache first
      if (barsCache.has(cacheKey)) {
        const cached = barsCache.get(cacheKey);
        if (isCacheValid(cached.timestamp)) {
          onResult(cached.bars, cached.meta);
          return;
        } else {
          barsCache.delete(cacheKey);
        }
      }

      // Prevent infinite loop by caching last request and result
      const barsRequestKey = JSON.stringify({
        symbol: symbolInfo.name,
        resolution,
        from: date.from,
        to: date.to,
        countBack: date.countBack, // Include countBack in cache key
      });

      // If the same request is made, return the cached result
      if (lastBarsRequest === barsRequestKey && lastBarsResult) {
        onResult(lastBarsResult.bars, lastBarsResult.meta);
        return;
      }

      // If a request is in progress for the same params, wait for it
      if (lastBarsRequest === barsRequestKey && lastBarsPromise) {
        lastBarsPromise
          .then(({ bars, meta }) => {
            onResult(bars, meta);
          })
          .catch(() => {
            onResult([], { noData: true });
          });
        return;
      }

      lastBarsRequest = barsRequestKey;
      lastBarsPromise = (async () => {
        try {
          // Debounce the request to prevent rapid successive calls
          const debouncedRequest = debounceRequest(
            cacheKey,
            async () => {
              // Include countBack in the request to help backend provide correct amount of data
              const url = `/history?symbol=${encodeURIComponent(
                symbolInfo.name
              )}&resolution=${resolution}&from=${date.from}&to=${date.to}&countBack=${date.countBack || 1000}`;
              const res = await api.get(url);
              return res.data;
            },
            REQUEST_DEBOUNCE
          );

          const data = await debouncedRequest;

          // Finnhub returns { s, t, o, h, l, c, v }
          if (
            data &&
            data.s === 'ok' &&
            Array.isArray(data.t) &&
            Array.isArray(data.o) &&
            Array.isArray(data.h) &&
            Array.isArray(data.l) &&
            Array.isArray(data.c)
          ) {
            const hasVolume = Array.isArray(data.v);

            // Create bars array with proper timestamp conversion
            const bars = data.t.map((time, i) => ({
              time: time * 1000, // Convert to milliseconds
              open: data.o[i],
              high: data.h[i],
              low: data.l[i],
              close: data.c[i],
              volume: hasVolume ? data.v[i] : 0,
            }));

            // Ensure bars are in ascending chronological order (required by TradingView)
            bars.sort((a, b) => a.time - b.time);

            // Handle countBack requirement
            let meta = { noData: bars.length === 0 };

            // If we have fewer bars than requested, try to get more data
            if (
              bars.length > 0 &&
              date.countBack &&
              bars.length < date.countBack
            ) {
              // Try to get more historical data
              try {
                const earliestTime = bars[0].time;
                const extendedFrom =
                  earliestTime -
                  (date.countBack - bars.length) * 24 * 60 * 60 * 1000; // Approximate

                const extendedUrl = `/history?symbol=${encodeURIComponent(
                  symbolInfo.name
                )}&resolution=${resolution}&from=${Math.floor(extendedFrom / 1000)}&to=${Math.floor(earliestTime / 1000)}&countBack=${date.countBack - bars.length}`;

                const extendedRes = await api.get(extendedUrl);
                const extendedData = extendedRes.data;

                if (
                  extendedData &&
                  extendedData.s === 'ok' &&
                  Array.isArray(extendedData.t)
                ) {
                  const extendedBars = extendedData.t.map((time, i) => ({
                    time: time * 1000,
                    open: extendedData.o[i],
                    high: extendedData.h[i],
                    low: extendedData.l[i],
                    close: extendedData.c[i],
                    volume: Array.isArray(extendedData.v)
                      ? extendedData.v[i]
                      : 0,
                  }));

                  // Combine and sort all bars
                  const allBars = [...extendedBars, ...bars].sort(
                    (a, b) => a.time - b.time
                  );

                  // Remove duplicates (bars with same timestamp)
                  const uniqueBars = allBars.filter(
                    (bar, index, self) =>
                      index === 0 || bar.time !== self[index - 1].time
                  );

                  bars.length = 0;
                  bars.push(...uniqueBars);
                }
              } catch (error) {
                console.warn('[Datafeed] Failed to get extended data:', error);
              }
            }

            // Ensure we have at least 2 bars (TradingView requirement)
            if (bars.length === 1) {
              console.warn(
                '[Datafeed] Only 1 bar returned. This may cause issues with TradingView.'
              );
            }

            // Cache the result
            barsCache.set(cacheKey, {
              bars,
              meta,
              timestamp: Date.now(),
            });

            lastBarsResult = { bars, meta };
            return { bars, meta };
          } else {
            const result = { bars: [], meta: { noData: true } };
            barsCache.set(cacheKey, {
              ...result,
              timestamp: Date.now(),
            });
            lastBarsResult = result;
            return result;
          }
        } catch (error) {
          console.error('[Datafeed] getBars error:', error);
          const result = { bars: [], meta: { noData: true } };
          lastBarsResult = result;
          return result;
        }
      })();

      lastBarsPromise
        .then(({ bars, meta }) => {
          onResult(bars, meta);
        })
        .catch(() => {
          onResult([], { noData: true });
        });
    },

    subscribeBars: (
      symbolInfo,
      resolution,
      onTick,
      subscriberId,
      onResetCacheNeededCallback
    ) => {
      // Store subscription info
      const subscription = {
        symbolInfo,
        resolution,
        onTick,
        onResetCacheNeededCallback,
        lastBar: null,
        socket: null,
      };

      subscriptions.set(subscriberId, subscription);

      // Get socket connection
      const socket = getSocket();
      subscription.socket = socket;

      // Create unique event name for this subscription
      const eventName = `price:update:${symbolInfo.name}:${resolution}`;

      // Listen for price updates specific to this symbol and resolution
      const priceListener = (data) => {
        try {
          const { price, timestamp, symbol, market_status } = data;

          // Only process updates for the correct symbol
          if (symbol && symbol !== symbolInfo.name) {
            return;
          }

          // Handle market closed status
          if (market_status === 'closed' || price === 'Market Closed') {
            console.log(`[Datafeed] Market closed for ${symbolInfo.name}`);
            return;
          }

          const currentTime = timestamp || Date.now();
          const rawBarTime = getBarTime(currentTime, resolution);
          
          // Validate and correct bar time to prevent time violations
          const validatedBarTime = validateBarTime(subscriberId, rawBarTime, resolution);

          // Check if this is an update to the current bar or a new bar
          if (subscription.lastBar && subscription.lastBar.time === validatedBarTime) {
            // Update the current bar
            const updatedBar = {
              ...subscription.lastBar,
              high: Math.max(subscription.lastBar.high, price),
              low: Math.min(subscription.lastBar.low, price),
              close: price,
              volume: (subscription.lastBar.volume || 0) + 1, // Increment volume
            };
            subscription.lastBar = updatedBar;
            onTick(updatedBar);
          } else {
            // Create a new bar
            const newBar = {
              time: validatedBarTime,
              open: price,
              high: price,
              low: price,
              close: price,
              volume: 1,
            };
            subscription.lastBar = newBar;
            onTick(newBar);
          }
        } catch (error) {
          console.error(
            `[Datafeed] Error in price listener for ${symbolInfo.name} ${resolution}:`,
            error
          );
        }
      };

      // Store the listener function for cleanup
      subscription.priceListener = priceListener;

      // Listen for general price updates (backend should filter by symbol)
      socket.on('price:update', priceListener);

      // Also listen for symbol-specific updates
      socket.on(eventName, priceListener);
    },

    unsubscribeBars: (subscriberId) => {
      const subscription = subscriptions.get(subscriberId);
      if (!subscription) {
        console.warn(
          `[Datafeed] No subscription found for ID: ${subscriberId}`
        );
        return;
      }

      // Remove event listeners
      if (subscription.socket) {
        const eventName = `price:update:${subscription.symbolInfo.name}:${subscription.resolution}`;

        // Remove both general and specific listeners
        subscription.socket.off('price:update', subscription.priceListener);
        subscription.socket.off(eventName, subscription.priceListener);
      }

      // Clean up subscription and last bar time tracking
      subscriptions.delete(subscriberId);
      lastBarTimes.delete(subscriberId);
    },

    // Method to reset cache when historical data changes
    resetCache: () => {
      barsCache.clear();
      lastBarsRequest = null;
      lastBarsResult = null;
      lastBarsPromise = null;
      lastBarTimes.clear(); // Also clear last bar times when resetting cache
    },

    // Method to get active subscriptions (for debugging)
    getActiveSubscriptions: () => {
      return Array.from(subscriptions.entries()).map(([id, sub]) => ({
        id,
        symbol: sub.symbolInfo.name,
        resolution: sub.resolution,
        lastBar: sub.lastBar,
      }));
    },

    // Method to check connection status
    isConnected: () => {
      const socket = getSocket();
      return socket && socket.connected;
    },

    // Method to get connection info
    getConnectionInfo: () => {
      const socket = getSocket();
      return {
        connected: socket ? socket.connected : false,
        id: socket ? socket.id : null,
        subscriptions: subscriptions.size,
      };
    },

    // Method to reconnect socket
    reconnect: () => {
      // The original code had a disconnectSocket() call here, but it's not defined.
      // Assuming it's a placeholder for a function that actually disconnects the socket.
      // For now, we'll just re-subscribe all active subscriptions.
      const newSocket = getSocket();

      // Re-subscribe all active subscriptions
      subscriptions.forEach((subscription, subscriberId) => {
        if (subscription.socket && subscription.priceListener) {
          const eventName = `price:update:${subscription.symbolInfo.name}:${subscription.resolution}`;
          newSocket.on('price:update', subscription.priceListener);
          newSocket.on(eventName, subscription.priceListener);
          subscription.socket = newSocket;
        }
      });

      return newSocket;
    },

    getMarks: async (symbolInfo, from, to, onResult, onError) => {
      // Fetch marks from backend (if you have Finnhub event/marks data, otherwise return empty)
      // try {
      //   const url = `/marks?symbol=${encodeURIComponent(
      //     symbolInfo.name
      //   )}&from=${from}&to=${to}`;
      //   const res = await api.get(url);
      //   const data = res.data;
      //   if (Array.isArray(data)) {
      //     onResult(data);
      //   } else {
      //     onResult([]);
      //   }
      // } catch (err) {
      //   console.warn('[Datafeed] Marks fetch error:', err);
      //   if (err.response && err.response.status === 429) {
      //     console.error('[Datafeed] Rate limit exceeded for marks');
      //     // Show user-friendly message
      //     if (typeof window !== 'undefined' && window.toast) {
      //       window.toast.error('Data temporarily unavailable due to high demand. Please try again in a moment.');
      //     }
      //   }
      //   if (onError) onError('Marks fetch error');
      //   else onResult([]);
      // }
    },
  };
}
