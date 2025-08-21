// socket.js
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Trade = require("../models/Trading.model");
const Wallet = require("../models/Wallet.model");
const Symbol = require("../models/Symbol.model");
const Category = require("../models/Category.model");
const getLiveQuotes = require("../helpers/getLiveQuotes");
const getLivePrice = require("../helpers/getLivePrice");

const axios = require("axios"); // Added missing import

let io = null;

// Function to get all gold symbols from database
async function getGoldSymbols() {
  try {
    const symbols = await Symbol.findAll({
      where: {
        baseCurrency: 'XAU',
        isActive: true,
        isDeleted: false
      },
      include: [{
        model: Category,
        as: 'category',
        attributes: ['name']
      }],
      order: [['sortOrder', 'ASC']]
    });

    // Convert symbols to Finnhub format
    const finnhubSymbols = symbols.map(symbol => {
      const quoteCurrency = symbol.quoteCurrency;
      return `OANDA:XAU_${quoteCurrency}`;
    });

    console.log(`📊 Found ${finnhubSymbols.length} gold symbols for socket subscription:`, finnhubSymbols);
    return finnhubSymbols;
  } catch (error) {
    console.error('❌ Error fetching gold symbols for socket:', error);
    // Fallback to default symbols
    return ['OANDA:XAU_USD', 'OANDA:XAU_EUR', 'OANDA:XAU_GBP'];
  }
}

function initSocket(server) {
  if (io) {
    // Prevent multiple initializations
    return io;
  }

  io = new Server(server, {
    cors: { origin: "*" },
  });

  // Middleware for JWT authentication
  // io.use((socket, next) => {
  //   const token = socket.handshake.auth?.token;
  //   if (!token) {
  //     return next(new Error("Authentication token missing"));
  //   }
  //   try {
  //     const decoded = jwt.verify(token, process.env.JWT_SECRET);
  //     socket.user = decoded;
  //     next();
  //   } catch (err) {
  //     next(new Error("Authentication error"));
  //   }
  // });

  io.on("connection", (socket) => {
    // if (!socket.user || !socket.user.id) {
    //   socket.disconnect(true);
    //   return;
    // }
    console.log("🔌 Client connected:", socket.id);

    // socket.join(`user:${socket.user.id}`);

    // ===== ADMIN-SPECIFIC SOCKET EVENTS =====

    // Admin joins admin room
    socket.on("admin:join", (data) => {
      const { adminId } = data;
      socket.join(`admin:${adminId}`);
      socket.join('admin:all');
      console.log(`👑 Admin ${adminId} joined admin room`);
      
      // Send admin-specific welcome message
      socket.emit("admin:welcome", {
        message: "Welcome to admin dashboard",
        timestamp: new Date().toISOString(),
        adminId: adminId
      });
    });

    // Admin leaves admin room
    socket.on("admin:leave", (data) => {
      const { adminId } = data;
      socket.leave(`admin:${adminId}`);
      socket.leave('admin:all');
      console.log(`👑 Admin ${adminId} left admin room`);
    });

    // Admin subscribes to admin-specific price updates
    socket.on("admin:subscribe:prices", async (data) => {
      try {
        const goldSymbols = await getGoldSymbols();
        goldSymbols.forEach(symbol => {
          socket.join(`admin:symbol:${symbol}`);
          console.log(`📡 Admin subscribed to admin symbol: ${symbol}`);
        });
        
        // Send confirmation to admin
        socket.emit("admin:subscribed:prices", {
          symbols: goldSymbols,
          count: goldSymbols.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('❌ Error subscribing admin to prices:', error);
        socket.emit("admin:subscription:error", {
          message: "Failed to subscribe to admin prices"
        });
      }
    });

    // Admin subscribes to admin dashboard updates
    socket.on("admin:subscribe:dashboard", (data) => {
      socket.join('admin:dashboard');
      console.log(`📊 Admin subscribed to dashboard updates`);
      
      // Send initial dashboard data
      socket.emit("admin:dashboard:update", {
        type: "initial",
        timestamp: new Date().toISOString(),
        data: {
          totalSymbols: 12, // This will be dynamic
          liveSymbols: 0,
          marketStatus: "open"
        }
      });
    });

    // Admin subscribes to symbol management updates
    socket.on("admin:subscribe:symbols", (data) => {
      socket.join('admin:symbols');
      console.log(`📈 Admin subscribed to symbol management updates`);
    });

    // Admin subscribes to user management updates
    socket.on("admin:subscribe:users", (data) => {
      socket.join('admin:users');
      console.log(`👥 Admin subscribed to user management updates`);
    });

    // Admin subscribes to trade management updates
    socket.on("admin:subscribe:trades", (data) => {
      socket.join('admin:trades');
      console.log(`💼 Admin subscribed to trade management updates`);
    });

    // ===== REGULAR SOCKET EVENTS =====

    // Handle symbol subscription for admin watchlist
    socket.on("subscribe:symbol", async (data) => {
      const { symbol } = data;
      if (symbol && typeof symbol === 'string') {
        socket.join(`symbol:${symbol}`);
        console.log(`📡 Client ${socket.id} subscribed to symbol: ${symbol}`);
      }
    });

    // Handle multiple symbol subscription
    socket.on("subscribe:symbols", async (data) => {
      const { symbols } = data;
      if (Array.isArray(symbols)) {
        symbols.forEach(symbol => {
          if (typeof symbol === 'string' && symbol.trim()) {
            socket.join(`symbol:${symbol}`);
            console.log(`📡 Client ${socket.id} subscribed to symbol: ${symbol}`);
          }
        });
      }
    });

    // Handle gold symbols subscription (admin watchlist)
    socket.on("subscribe:gold-symbols", async () => {
      try {
        const goldSymbols = await getGoldSymbols();
        goldSymbols.forEach(symbol => {
          socket.join(`symbol:${symbol}`);
          console.log(`📡 Client ${socket.id} subscribed to gold symbol: ${symbol}`);
        });
        
        // Send confirmation to client
        socket.emit("subscribed:gold-symbols", {
          symbols: goldSymbols,
          count: goldSymbols.length
        });
      } catch (error) {
        console.error('❌ Error subscribing to gold symbols:', error);
        socket.emit("subscription:error", {
          message: "Failed to subscribe to gold symbols"
        });
      }
    });

    // Handle symbol unsubscription
    socket.on("unsubscribe:symbol", (data) => {
      const { symbol } = data;
      if (symbol && typeof symbol === 'string') {
        socket.leave(`symbol:${symbol}`);
        console.log(`📡 Client ${socket.id} unsubscribed from symbol: ${symbol}`);
      }
    });

    // Handle multiple symbol unsubscription
    socket.on("unsubscribe:symbols", (data) => {
      const { symbols } = data;
      if (Array.isArray(symbols)) {
        symbols.forEach(symbol => {
          if (typeof symbol === 'string' && symbol.trim()) {
            socket.leave(`symbol:${symbol}`);
            console.log(`📡 Client ${socket.id} unsubscribed from symbol: ${symbol}`);
          }
        });
      }
    });

    // Legacy subscription handlers for backward compatibility
    socket.on("subscribe_quotes", (symbols) => {
      if (!Array.isArray(symbols)) return;
      symbols.forEach((symbol) => {
        if (typeof symbol === "string" && symbol.trim()) {
          socket.join(`symbol:${symbol}`);
        }
      });
    });

    socket.on("unsubscribe_quotes", (symbols) => {
      if (!Array.isArray(symbols)) return;
      symbols.forEach((symbol) => {
        if (typeof symbol === "string" && symbol.trim()) {
          socket.leave(`symbol:${symbol}`);
        }
      });
    });

    const sendLivePrice = async () => {
      try {
        const price = await getLivePrice(); // use /price or /quote
        console.log('[Socket] Live price:', price);
        
        // Send general price update (for backward compatibility)
        socket.emit("price:update", {
          price: price,
          timestamp: Date.now(),
          symbol: 'XAU/USD', // Default symbol
          last_quote_at: new Date().toISOString()
        });
        
        // Send symbol-specific update for TradingView
        socket.emit("price:update:XAU/USD:1", {
          price: price,
          timestamp: Date.now(),
          symbol: 'XAU/USD'
        });
        
        // Send updates for different resolutions
        const resolutions = ['1', '5', '15', '30', '60', '240', '1D'];
        resolutions.forEach(resolution => {
          socket.emit(`price:update:XAU/USD:${resolution}`, {
            price: price,
            timestamp: Date.now(),
            symbol: 'XAU/USD'
          });
        });
        
      } catch (error) {
        console.error('[Socket] Error fetching live price:', error);
      }
    };
  
    // Call initially and every second
    sendLivePrice();
    const interval = setInterval(sendLivePrice, 10000);
    socket.on("disconnect", (reason) => {
      clearInterval(interval)
      console.log('[Socket] Client disconnected:', reason)
      // console.log(`User disconnected: ${socket.user.id} (${reason})`);
    });
  });

  // Periodically emit live quotes to all clients
//   setInterval(async () => {
//     try {
//       // You may want to fetch all subscribed symbols dynamically
//       const quotes = await getLiveQuotes(['XAU/USD']);
//       io.emit('quote_update', quotes);
//     } catch (err) {
//       console.error('Error fetching live quotes:', err.message);
//     }
//   }, 3000);

//   // Periodically emit live price for XAU/USD
//   setInterval(async () => {
//     try {
//       const res = await axios.get(`${process.env.BASE_URL}/price`, {
//         params: {
//           symbol: 'XAU/USD',
//           apikey: process.env.API_KEY,
//         },
//       });
//       const price = parseFloat(res.data.price);
//       if (!isNaN(price)) {
//         io.emit('livePrice', {
//           symbol: 'XAU/USD',
//           price: price,
//           timestamp: Date.now(),
//         });
//       } else {
//         console.error('Received invalid price:', res.data.price);
//       }
//     } catch (err) {
//       console.error('Live price error:', err.message);
//     }
//   }, 10000);

  return io;
}

function emitQuoteUpdate(symbol, quote) {
  if (!io) return;
  io.to(`symbol:${symbol}`).emit("quote_update", { symbol, ...quote });
}

function emitWalletUpdate(userId, wallet) {
  if (!io) return;
  io.to(`user:${userId}`).emit("wallet_update", wallet);
}

function emitTradeClosed(userId, trade) {
  if (!io) return;
  io.to(`user:${userId}`).emit("trade_closed", trade);
}

function emitTradePlaced(userId, trade) {
  if (!io) return;
  io.to(`user:${userId}`).emit("trade_placed", trade);
}

function emitTradeMarkers(userId, markers) {
  if (!io) return;
  io.to(`user:${userId}`).emit("mark_update", markers);
}

// New function to emit price updates for TradingView subscriptions
function emitPriceUpdate(symbol, price, resolution = '1') {
  if (!io) return;
  
  const updateData = {
    price: price,
    timestamp: Date.now(),
    symbol: symbol
  };
  
  // Emit to all connected clients
  io.emit("price:update", updateData);
  io.emit(`price:update:${symbol}:${resolution}`, updateData);
  
  console.log(`[Socket] Emitted price update for ${symbol}:${resolution} - ${price}`);
}

// New function to emit price updates to specific symbol rooms
function emitSymbolPriceUpdate(symbol, priceData) {
  if (!io) return;
  
  const updateData = {
    ...priceData,
    symbol: symbol,
    timestamp: Date.now()
  };
  
  // Emit to clients subscribed to this specific symbol
  io.to(`symbol:${symbol}`).emit("price:update", updateData);
  
  console.log(`[Socket] Emitted price update for ${symbol}:`, updateData);
}

// ===== ADMIN-SPECIFIC EMIT FUNCTIONS =====

// Emit admin-specific price updates
function emitAdminPriceUpdate(symbol, priceData) {
  if (!io) return;
  
  const updateData = {
    ...priceData,
    symbol: symbol,
    timestamp: Date.now(),
    source: 'admin'
  };
  
  // Emit to admin clients only
  io.to(`admin:symbol:${symbol}`).emit("admin:price:update", updateData);
  io.to('admin:all').emit("admin:price:update", updateData);
  
  console.log(`[AdminSocket] Emitted admin price update for ${symbol}:`, updateData);
}

// Emit admin dashboard updates
function emitAdminDashboardUpdate(data) {
  if (!io) return;
  
  const updateData = {
    ...data,
    timestamp: Date.now(),
    source: 'admin'
  };
  
  io.to('admin:dashboard').emit("admin:dashboard:update", updateData);
  
  console.log(`[AdminSocket] Emitted admin dashboard update:`, updateData);
}

// Emit admin symbol management updates
function emitAdminSymbolUpdate(action, symbolData) {
  if (!io) return;
  
  const updateData = {
    action: action, // 'created', 'updated', 'deleted', 'status_changed'
    symbol: symbolData,
    timestamp: Date.now(),
    source: 'admin'
  };
  
  io.to('admin:symbols').emit("admin:symbol:update", updateData);
  
  console.log(`[AdminSocket] Emitted admin symbol update:`, updateData);
}

// Emit admin user management updates
function emitAdminUserUpdate(action, userData) {
  if (!io) return;
  
  const updateData = {
    action: action, // 'created', 'updated', 'deleted', 'status_changed'
    user: userData,
    timestamp: Date.now(),
    source: 'admin'
  };
  
  io.to('admin:users').emit("admin:user:update", updateData);
  
  console.log(`[AdminSocket] Emitted admin user update:`, updateData);
}

// Emit admin trade management updates
function emitAdminTradeUpdate(action, tradeData) {
  if (!io) return;
  
  const updateData = {
    action: action, // 'created', 'updated', 'closed', 'cancelled'
    trade: tradeData,
    timestamp: Date.now(),
    source: 'admin'
  };
  
  io.to('admin:trades').emit("admin:trade:update", updateData);
  
  console.log(`[AdminSocket] Emitted admin trade update:`, updateData);
}

// Emit admin notification
function emitAdminNotification(type, message, data = {}) {
  if (!io) return;
  
  const notificationData = {
    type: type, // 'info', 'success', 'warning', 'error'
    message: message,
    data: data,
    timestamp: Date.now(),
    source: 'admin'
  };
  
  io.to('admin:all').emit("admin:notification", notificationData);
  
  console.log(`[AdminSocket] Emitted admin notification:`, notificationData);
}

module.exports = {
  initSocket,
  emitQuoteUpdate,
  emitWalletUpdate,
  emitTradeClosed,
  emitTradePlaced,
  emitTradeMarkers,
  emitPriceUpdate,
  emitSymbolPriceUpdate,
  // Admin-specific functions
  emitAdminPriceUpdate,
  emitAdminDashboardUpdate,
  emitAdminSymbolUpdate,
  emitAdminUserUpdate,
  emitAdminTradeUpdate,
  emitAdminNotification,
};
