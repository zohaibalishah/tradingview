
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const axios = require('axios');
const http = require('http');
const mongoose = require('mongoose');

const API_KEY = process.env.API_KEY;
const SOCKET_URL = 'wss://ws.finnhub.io?token=d26aj99r01qh25lmlilgd26aj99r01qh25lmlim0';
const WebSocket = require('ws');

// Store interval (in ms) for candle generation
const CANDLE_INTERVAL_MS = 60000; // 1 minute
const CANDLE_INTERVAL_LABEL = '1m';

function getMinute(ts) {
  return Math.floor(ts / CANDLE_INTERVAL_MS) * CANDLE_INTERVAL_MS;
}
// --- MongoDB Setup ---
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/finhub';
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const candleSchema = new mongoose.Schema({
  time: { type: Number, required: true, index: true },
  open: Number,
  high: Number,
  low: Number,
  close: Number,
  volume: Number,
  symbol: { type: String, default: 'OANDA:XAU_USD' },
  interval: { type: String, default: CANDLE_INTERVAL_LABEL } // e.g., '1m'
});
const Candle = mongoose.model('Candle', candleSchema);
// --- End MongoDB Setup ---

const candles = {};  // key = candle start timestamp, value = OHLCV
let lastCandleTime = null;

async function persistCandle(candle) {
  try {
    // Upsert to avoid duplicates if needed
    await Candle.updateOne(
      { time: candle.time, symbol: candle.symbol || 'OANDA:XAU_USD', interval: candle.interval || CANDLE_INTERVAL_LABEL },
      { $set: candle },
      { upsert: true }
    );
  } catch (err) {
    console.error('Error persisting candle:', err);
  }
}

function handleTick(tick) {
  const price = tick.p;
  const timestamp = tick.t;

  const candleTime = Math.floor(timestamp / CANDLE_INTERVAL_MS) * CANDLE_INTERVAL_MS; // Start of the interval

  // If a new candle has started, persist the previous one
  if (lastCandleTime !== null && candleTime !== lastCandleTime && candles[lastCandleTime]) {
    // Attach symbol and interval for DB
    const candleToPersist = { ...candles[lastCandleTime], symbol: 'OANDA:XAU_USD', interval: CANDLE_INTERVAL_LABEL };
    persistCandle(candleToPersist);
    // Optionally, you can delete old candles from memory if you want
    // delete candles[lastCandleTime];
  }

  lastCandleTime = candleTime;

  if (!candles[candleTime]) {
    // New candle
    candles[candleTime] = {
      time: candleTime,
      open: price,
      high: price,
      low: price,
      close: price,
      volume: 1,
      interval: CANDLE_INTERVAL_LABEL
    };
  } else {
    // Update existing candle
    const candle = candles[candleTime];
    candle.high = Math.max(candle.high, price);
    candle.low = Math.min(candle.low, price);
    candle.close = price;
    candle.volume += 1;
  }
}

// Persist the last candle every minute in case of no new ticks
setInterval(() => {
  if (lastCandleTime && candles[lastCandleTime]) {
    const now = Date.now();
    // If the current interval has passed, persist the last candle
    if (now - lastCandleTime > CANDLE_INTERVAL_MS) {
      const candleToPersist = { ...candles[lastCandleTime], symbol: 'OANDA:XAU_USD', interval: CANDLE_INTERVAL_LABEL };
      persistCandle(candleToPersist);
      // Optionally, delete from memory
      // delete candles[lastCandleTime];
    }
  }
}, 10000);

const socket = new WebSocket(SOCKET_URL);

socket.on('open', () => {
  console.log('🟢 Connected to Finnhub WebSocket');
  socket.send(JSON.stringify({ type: 'subscribe', symbol: 'OANDA:XAU_USD' }));
});

socket.on('message', (data) => {
  const msg = JSON.parse(data);
  console.log(msg)
  if (msg.type === 'trade' && Array.isArray(msg.data)) {
    for (const tick of msg.data) {
      handleTick(tick);
    }
  }
});

socket.on('close', () => {
  console.log('🔴 Disconnected');
});

const app = express();
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
const server = http.createServer(app);
const io = require('socket.io')(server, { cors: { origin: '*' } });

server.listen(4000, () => console.log('Server running on http://localhost:4000'));
