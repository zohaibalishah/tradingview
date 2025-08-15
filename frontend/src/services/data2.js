// This datafeed is compatible with TradingView's UDF interface.
// It provides methods for chart widget integration and fetching historical bars.

import axios from 'axios';
// import { io } from 'socket.io-client';
import { getSocket } from './socket';

export function UDFCompatibleDatafeed() {
  return {
    onReady: (cb) =>
      setTimeout(
        () =>
          cb({
            supported_resolutions: ['1', '5', '15', '30', '60', '1D'],
            supports_search: true,
            supports_group_request: false,
            supports_timescale_marks: false,
            supports_time: true,
            supports_marks: true,
          }),
        0
      ),

    resolveSymbol: (symbolName, onResolve) => {
      onResolve({
        name: symbolName,
        ticker: symbolName,
        description: 'Gold vs USD',
        session: '24x7',
        timezone: 'Etc/UTC',
        type: 'metal',
        pricescale: 100,
        minmov: 1,
        supported_resolutions: ['1', '5', '15', '30', '60', '1D'],
        exchange: 'TwelveData',
        listed_exchange: 'TwelveData',
        has_intraday: true,
        intraday_multipliers: ['1', '5', '15', '30', '60'],
        volume_precision: 2,
      });
    },

    getBars: async (symbolInfo, resolution, date, onResult) => {
      // Fetch historical bars from backend using axios
      const url = `http://localhost:4000/api/history?symbol=${symbolInfo.name}&resolution=${resolution}&from=${date.from}&to=${date.to}`;
      try {
        const res = await axios.get(url);
        const data = res.data;
        // Verify data structure
        if (
          data &&
          data.s === 'ok' &&
          Array.isArray(data.t) &&
          Array.isArray(data.o) &&
          Array.isArray(data.h) &&
          Array.isArray(data.l) &&
          Array.isArray(data.c)
        ) {
          // Some endpoints may not provide volume
          const hasVolume = Array.isArray(data.v);
          const bars = data.t.map((time, i) => ({
            time: time * 1000,
            open: data.o[i],
            high: data.h[i],
            low: data.l[i],
            close: data.c[i],
            volume: hasVolume ? data.v[i] : 0,
          }));
          onResult(bars, { noData: bars.length === 0 });
        } else {
          // If data is not valid, return noData
          onResult([], { noData: true });
        }
      } catch (error) {
        // In case of error, return noData
        onResult([], { noData: true });
      }
    },

    subscribeBars: (symbolInfo, resolution, onTick) => {

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
      // Use socket.io-client for real-time updates
      // if (!window._tvSocket) {
      //   window._tvSocket = io('http://localhost:4000');
      // }
      // const socket = window._tvSocket;
      // if (!socket) {
      //   // Socket.io-client not loaded
      //   return;
      // }
      // // Optionally, you could namespace by symbol here if needed
      // socket.on('price:update', ({ price }) => {
      //   console.log(price)
      //   onTick({
      //     time: Date.now(),
      //     open: price,
      //     high: price,
      //     low: price,
      //     close: price,
      //     volume: 1,
      //   });
      // });
    },

    unsubscribeBars: () => {
      if (window._tvSocket) {
        window._tvSocket.disconnect();
        delete window._tvSocket;
      }
    },

    // Add marks support
    getMarks: async (symbolInfo, from, to, onResult, onError) => {
      // Example: fetch marks from backend
      try {
        const url = `http://localhost:4000/api/marks?symbol=${symbolInfo.name}&from=${from}&to=${to}`;
        const res = await axios.get(url);
        const data = res.data;
        // data should be an array of marks
        // Each mark: { id, time, color, text, label, labelFontColor, minSize }
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
