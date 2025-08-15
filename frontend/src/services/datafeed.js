// This datafeed is compatible with TradingView's UDF interface.
// It provides methods for chart widget integration and fetching historical bars using Finnhub APIs.

import axios from 'axios';
import { getSocket } from './socket';

// Prevent infinite getBars calls by caching last request and result
let lastBarsRequest = null;
let lastBarsResult = null;
let lastBarsPromise = null;

export function UDFCompatibleDatafeed() {
  return {
    onReady: async (cb) => {
      try {
        const res = await axios.get('http://localhost:4000/api/config');
        cb(res.data);
      } catch (err) {
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
        const url = `http://localhost:4000/api/symbols?symbol=${encodeURIComponent(userInput)}`;
        const res = await axios.get(url);
        const data = res.data;
        // TradingView expects an array of symbol objects
        // If backend returns a single symbol, wrap in array
        const results = Array.isArray(data)
          ? data
          : [data];
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
        onResult([]);
      }
    },

    resolveSymbol: async (symbolName, onResolve, onError) => {
      // Use backend endpoint that proxies Finnhub's symbol search
      try {
        const url = `http://localhost:4000/api/symbols?symbol=${encodeURIComponent(
          symbolName
        )}`;
        const res = await axios.get(url);
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
        if (onError) onError('Symbol resolve error');
      }
    },

    getBars: async (symbolInfo, resolution, date, onResult) => {
      // Prevent infinite loop by caching last request and result
      const barsRequestKey = JSON.stringify({
        symbol: symbolInfo.name,
        resolution,
        from: date.from,
        to: date.to,
      });

      // If the same request is made, return the cached result
      if (lastBarsRequest === barsRequestKey && lastBarsResult) {
        onResult(lastBarsResult.bars, lastBarsResult.meta);
        return;
      }

      // If a request is in progress for the same params, wait for it
      if (lastBarsRequest === barsRequestKey && lastBarsPromise) {
        lastBarsPromise.then(({ bars, meta }) => {
          onResult(bars, meta);
        }).catch(() => {
          onResult([], { noData: true });
        });
        return;
      }

      lastBarsRequest = barsRequestKey;
      lastBarsPromise = (async () => {
        try {
          const url = `http://localhost:4000/api/history?symbol=${encodeURIComponent(
            symbolInfo.name
          )}&resolution=${resolution}&from=${date.from}&to=${date.to}`;
          const res = await axios.get(url);
          const data = res.data;
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
            const bars = data.t.map((time, i) => ({
              time: time * 1000,
              open: data.o[i],
              high: data.h[i],
              low: data.l[i],
              close: data.c[i],
              volume: hasVolume ? data.v[i] : 0,
            }));
            const meta = { noData: bars.length === 0 };
            lastBarsResult = { bars, meta };
            return { bars, meta };
          } else {
            lastBarsResult = { bars: [], meta: { noData: true } };
            return { bars: [], meta: { noData: true } };
          }
        } catch (error) {
          lastBarsResult = { bars: [], meta: { noData: true } };
          return { bars: [], meta: { noData: true } };
        }
      })();

      lastBarsPromise.then(({ bars, meta }) => {
        onResult(bars, meta);
      }).catch(() => {
        onResult([], { noData: true });
      });
    },

    subscribeBars: (symbolInfo, resolution, onTick) => {
      // Use socket.io for real-time price updates from backend (which should use Finnhub websocket or polling)
      const socket = getSocket();

      socket.on('price:update', ({ price }) => {
        console.log('[Datafeed] price:update', price);
        onTick({
          time: Date.now(),
          open: price,
          high: price,
          low: price,
          close: price,
          volume: 1,
        });
      });
    },

    unsubscribeBars: () => {
      // Unsubscribe logic for socket.io (if implemented)
      // You may want to remove the event listener for 'price:update'
      // For now, just disconnect the socket if needed
      // (Assumes getSocket() returns a singleton)
      // If you use window._tvSocket, you can keep this logic
      if (window._tvSocket) {
        window._tvSocket.disconnect();
        delete window._tvSocket;
      }
    },

    getMarks: async (symbolInfo, from, to, onResult, onError) => {
      // Fetch marks from backend (if you have Finnhub event/marks data, otherwise return empty)
      try {
        const url = `http://localhost:4000/api/marks?symbol=${encodeURIComponent(
          symbolInfo.name
        )}&from=${from}&to=${to}`;
        const res = await axios.get(url);
        const data = res.data;
        if (Array.isArray(data)) {
          onResult(data);
        } else {
          onResult([]);
        }
      } catch (err) {
        if (onError) onError('Marks fetch error');
        else onResult([]);
      }
    },
  };
}
