const WebSocket = require('ws');
const { pushRealtimeUpdate } = require('./datafeed');

function startSocketStream(io) {
  // Push a dummy gold price every second
  let price = 3376; // starting dummy price for gold
  //   setInterval(() => {
  //     // Simulate price movement
  //     price += (Math.random() - 0.5) * 2; // small random walk
  //     io.emit('price:update', {
  //       symbol: 'XAU/USD',
  //       price: Number(price.toFixed(2)),
  //     });
  //   }, 1000);

const SOCKET_URL = 'wss://ws.finnhub.io?token=d2dd5b1r01qjem5k7hegd2dd5b1r01qjem5k7hf0';
// const socketTvilData=`wss://ws.twelvedata.com/v1/quotes/price?apikey=${process.env.API_KEY}`
  const socket = new WebSocket(
    SOCKET_URL
  );


  socket.on('open', () => {
  console.log('🟢 Connected to Finnhub WebSocket');
  socket.send(JSON.stringify({ type: 'subscribe', symbol: 'OANDA:XAU_USD' }));
});

socket.on('message', (data) => {
  const msg = JSON.parse(data);
  console.log(msg)
  if (msg.type === 'trade' && Array.isArray(msg.data)) {
    for (const json of msg.data) {
      console.log('tick',json)
      io.emit('price:update', { symbol: json.s, price: Number(json.p).toFixed(2) , last_quote_at: json.t,});
      // handleTick(tick);
    }
  }
});

socket.on('close', () => {
  console.log('🔴 Disconnected');
});
  // ws.onopen = () => {
  //   console.log('✅ Connected to TwelveData WebSocket');
  //   ws.send(
  //     JSON.stringify({
  //       action: 'subscribe',
  //       params: {
  //         symbols: 'XAU/USD',
  //       },
  //     })
  //   );
  //   console.log('📡 Subscribed to XAU/USD');
  //   // Send heartbeat every 10 seconds to keep connection alive
  //   setInterval(() => {
  //     ws.send(JSON.stringify({ action: 'heartbeat' }));
  //     console.log('💓 Sent heartbeat');
  //   }, 10000);
  // };

  // ws.onmessage = (event) => {
  //   const data = event.data ? event.data : event;
  //   const json = JSON.parse(data);
  //   // Only handle price update events
  //   if (json.event === 'price' && json.symbol && json.price) {
  //     pushRealtimeUpdate({
  //       symbol: json.symbol,
  //       time: Date.now(),
  //       open: json.price,
  //       high: json.price,
  //       low: json.price,
  //       close: json.price,
  //       volume: 1,
  //     });

  //     io.emit('price:update', { symbol: json.symbol, price: json.price , last_quote_at: json.timestamp,});
  //   }
  // };

  // ws.onclose = () => {
  //   console.log('🔌 WebSocket connection closed.');
  // };
  // ws.onerror = (err) => {
  //   console.error('🚨 WebSocket error:', err.message || err);
  // };
}

module.exports = { startSocketStream };
