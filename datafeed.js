// server/datafeed.js
const axios = require('axios');

const lastBars = {};

const datafeed = {
  onReady: (callback) => {
    setTimeout(
      () =>
        callback({
          supported_resolutions: ['1', '5', '15', '30', '60', '1D'],
          supports_search: true,
          supports_group_request: false,
          supports_timescale_marks: false,
          supports_time: true,
          supports_marks: true,
        }),
      0
    );
  },

  resolveSymbol: (symbolName, onResolve) => {
    onResolve({
      name: symbolName,
      ticker: symbolName,
      session: '24x7',
      type: 'commodity',
      minmov: 1,
      pricescale: 100,
      has_intraday: true,
      supported_resolutions: ['1', '5', '15', '60', '1D'],
    });
  },

  getBars: async (symbol, resolution, from, to, onResult) => {
    const res = await axios.get(`${process.env.BASE_URL}/time_series`, {
      params: {
        symbol: symbol,
        interval: resolution === '1D' ? '1day' : resolution + 'min',
        start_date: new Date(from * 1000).toISOString(),
        end_date: new Date(to * 1000).toISOString(),
        apikey: process.env.API_KEY,
      },
    });
    if (res.data?.status) {
      const bars = res.data.values
        .map((bar) => {
          return {
            time: new Date(bar.datetime).getTime(),
            open: parseFloat(bar.open),
            high: parseFloat(bar.high),
            low: parseFloat(bar.low),
            close: parseFloat(bar.close),
            volume: parseFloat(bar.volume),
          };
        })
        .reverse();

      if (bars.length > 0) {
        lastBars[symbol] = bars[bars.length - 1];
      }

      onResult(bars);
    }
  },

  subscribeBars: (symbolInfo, resolution, onTick, subscriberUID) => {
    subscribers[subscriberUID] = {
      symbol: symbolInfo.name,
      resolution,
      onTick,
    };
  },

  unsubscribeBars: (subscriberUID) => {
    delete subscribers[subscriberUID];
  },
};

const subscribers = {};

const pushRealtimeUpdate = (bar) => {
  Object.values(subscribers).forEach((sub) => {
    if (sub.symbol === bar.symbol) {
      sub.onTick(bar);
    }
  });
};

module.exports = { datafeed, pushRealtimeUpdate };
