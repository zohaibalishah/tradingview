const WebSocket = require('ws');
const dayjs = require('dayjs');
const { pushRealtimeUpdate } = require('./datafeed');
const { isMarketOpen } = require('./helpers/marketStatus');
const { applyBrokerSpread } = require('./helpers/finnhub.helper');
const socketCandleHandler = require('./services/socketCandleHandler.service');
const symbolSubscriptionManager = require('./services/symbolSubscriptionManager.service');
// Import database models to get symbols dynamically
const Symbol = require('./models/Symbol.model');
const Category = require('./models/Category.model');

function getLastMarketCloseTime() {
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

  return lastMarketClose;
}

// Function to get all gold symbols from database
async function getGoldSymbols() {
  return await symbolSubscriptionManager.getActiveGoldSymbols();
}

async function startSocketStream(io) {
  // Initialize the socket candle handler
  await socketCandleHandler.initialize();
  
  const SOCKET_URL = `wss://ws.finnhub.io?token=${process.env.FINNHUB_API_KEY}`;
  let socket = null;
  let reconnectAttempts = 0;
  const MAX_RECONNECT_ATTEMPTS = 5;
  const RECONNECT_DELAY = 5000;
  let reconnectTimeout = null;
  let isShuttingDown = false;
  
  // Initialize symbol subscription manager
  symbolSubscriptionManager.onSubscriptionChange((action, symbols) => {
    console.log(`📡 Subscription change: ${action}`, symbols);
    // You can add additional logic here if needed
  });
  
  function connectWebSocket() {
    try {
      socket = new WebSocket(SOCKET_URL);
      
      socket.on('open', async () => {
        console.log('🟢 Connected to Finnhub WebSocket');
        reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        
        // Set WebSocket reference and connection status in subscription manager
        symbolSubscriptionManager.setWebSocket(socket);
        symbolSubscriptionManager.setConnectionStatus(true);
        
        if (isMarketOpen()) {
          console.log('🟢 Market is open, subscribing to symbols');
          // Get all gold symbols and subscribe using the subscription manager
          const symbols = await getGoldSymbols();
          console.log(`📊 Found ${symbols.length} symbols to subscribe to:`, symbols);
          
          // Subscribe to all gold symbols
          for (const symbol of symbols) {
            await symbolSubscriptionManager.subscribeToSymbol(symbol);
          }
        } else {
          // console.log('⚠️ Market closed, not subscribing to socket');
          
          // Get the last market close time
          const lastMarketClose = getLastMarketCloseTime();
          // console.log(`📅 Last market close: ${lastMarketClose.format('YYYY-MM-DD HH:mm:ss UTC')}`);
          
          // Get all gold symbols and emit market closed status
          const symbols = await getGoldSymbols();
          // console.log(`📊 Emitting market closed status for ${symbols.length} symbols`);
          
          symbols.forEach(symbol => {
            const marketClosedData = {
              symbol,
              price: 'Market Closed',
              last_quote_at: lastMarketClose.toISOString(),
              market_status: 'closed',
              last_market_close: lastMarketClose.toISOString(),
            };
            
            // console.log(`📡 Emitting market closed for ${symbol}:`, marketClosedData);
            io.emit('price:update', marketClosedData);
            
            // Also emit admin-specific market closed event
            io.to(`admin:symbol:${symbol}`).emit('admin:price:update', {
              ...marketClosedData,
              source: 'admin'
            });
          });
        }
      });

      socket.on('message', async(data) => {
        try {
          const msg = JSON.parse(data);
          // console.log('[SocketStream] Received message from Finnhub:', msg.type);
          
          if (msg.type === 'trade' && Array.isArray(msg.data)) {
            // console.log('[SocketStream] Processing trade data, count:', msg.data.length);

            for (const json of msg.data) {
              if (json.p) {
                // console.log('[SocketStream] Processing price for symbol:', json.s, 'price:', json.p);
                global.latestPrices[json.s] = json.p;
                const { ask, bid } =await   applyBrokerSpread(Number(json.p),json.s);
        
                // Regular price update
                const priceUpdateData = {
                  symbol: json.s,
                  price: Number(json.p).toFixed(2),
                  timestamp: json.t, // Convert to milliseconds for frontend
                  last_quote_at: json.t,
                  ask,
                  bid,
                };
                // console.log('[SocketStream] Emitting price update:', priceUpdateData);
                // Emit regular price update
                io.emit('price:update', priceUpdateData);
                
                // Emit admin-specific price update
                io.to(`admin:symbol:${json.s}`).emit('admin:price:update', {
                  ...priceUpdateData,
                  source: 'admin',
                  admin_timestamp: Date.now()
                });
                
                // Process tick for candle data
                socketCandleHandler.handleTick({
                  symbol: json.s,
                  price: json.p,
                  timestamp: json.t,
                });
              }
            }
          } else if (msg.type === 'market_status') {
            if (!isMarketOpen()) {
              const lastMarketClose = getLastMarketCloseTime();
              // Get all gold symbols and emit market closed status
              getGoldSymbols().then(symbols => {
                symbols.forEach(symbol => {
                  const marketClosedData = {
                    symbol,
                    price: 'Market Closed',
                    timestamp: lastMarketClose.valueOf(),
                    last_quote_at: lastMarketClose.toISOString(),
                    market_status: 'closed',
                    last_market_close: lastMarketClose.toISOString(),
                  };
                  
                  // Emit regular market closed event
                  io.emit('price:update', marketClosedData);
                  
                  // Emit admin-specific market closed event
                  io.to(`admin:symbol:${symbol}`).emit('admin:price:update', {
                    ...marketClosedData,
                    source: 'admin'
                  });
                });
              });
            }
          }
        } catch (error) {
          console.error('❌ Error processing WebSocket message:', error);
        }
      });

      socket.on('error', (error) => {
        console.error('❌ WebSocket error:', error);
      });

      socket.on('close', (code, reason) => {
        console.log(`🔴 WebSocket disconnected (${code}): ${reason}`);
        
        // Update connection status in subscription manager
        symbolSubscriptionManager.setConnectionStatus(false);
        symbolSubscriptionManager.setWebSocket(null);
        
        if (!isShuttingDown && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
          reconnectAttempts++;
          console.log(`🔄 Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${RECONNECT_DELAY}ms...`);
          reconnectTimeout = setTimeout(connectWebSocket, RECONNECT_DELAY);
        } else if (isShuttingDown) {
          console.log('🔄 Shutdown in progress, skipping reconnection');
        } else {
          console.error('❌ Max reconnection attempts reached. Stopping reconnection.');
        }
      });
    } catch (error) {
      console.error('❌ Error creating WebSocket connection:', error);
      
      if (!isShuttingDown && reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
        reconnectAttempts++;
        console.log(`🔄 Attempting to reconnect (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}) in ${RECONNECT_DELAY}ms...`);
        reconnectTimeout = setTimeout(connectWebSocket, RECONNECT_DELAY);
      } else if (isShuttingDown) {
        console.log('🔄 Shutdown in progress, skipping reconnection');
      }
    }
  }
  
  // Start the initial connection
  connectWebSocket();
  
  // Return cleanup function
  return {
    cleanup: async () => {
      console.log('🔄 Cleaning up socket stream...');
      isShuttingDown = true;
      
      // Clear any pending reconnection attempts
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
      }
      
      // Close WebSocket connection
      if (socket) {
        socket.close();
        socket = null;
      }
      
      // Cleanup socket candle handler
      try {
        await socketCandleHandler.cleanup();
      } catch (error) {
        console.error('Error cleaning up socket candle handler:', error);
      }
      
      // Cleanup symbol subscription manager
      try {
        symbolSubscriptionManager.cleanup();
      } catch (error) {
        console.error('Error cleaning up symbol subscription manager:', error);
      }
      
      console.log('✅ Socket stream cleanup completed');
    },
    
    // Expose subscription manager methods for external use
    refreshSubscriptions: () => symbolSubscriptionManager.refreshSubscriptions(),
    getSubscriptionStatus: () => symbolSubscriptionManager.getSubscriptionStatus(),
    subscribeToSymbol: (symbol) => symbolSubscriptionManager.subscribeToSymbol(symbol),
    unsubscribeFromSymbol: (symbol) => symbolSubscriptionManager.unsubscribeFromSymbol(symbol)
  };
}

module.exports = { startSocketStream };
