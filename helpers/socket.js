// socket.js
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");
const Trade = require("../models/Trading.model");
const Wallet = require("../models/Wallet.model");
const getLiveQuotes = require("../helpers/getLiveQuotes");
const getLivePrice = require("../helpers/getLivePrice");

const axios = require("axios"); // Added missing import

let io = null;

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
    // console.log("User connected:", socket.user.id);

    // socket.join(`user:${socket.user.id}`);

    // socket.on("subscribe_quotes", (symbols) => {
    //   if (!Array.isArray(symbols)) return;
    //   symbols.forEach((symbol) => {
    //     if (typeof symbol === "string" && symbol.trim()) {
    //       socket.join(`symbol:${symbol}`);
    //     }
    //   });
    // });

    // socket.on("unsubscribe_quotes", (symbols) => {
    //   if (!Array.isArray(symbols)) return;
    //   symbols.forEach((symbol) => {
    //     if (typeof symbol === "string" && symbol.trim()) {
    //       socket.leave(`symbol:${symbol}`);
    //     }
    //   });
    // });

    const sendLivePrice = async () => {
      const price = await getLivePrice(); // use /price or /quote
      console.log(price)
      socket.emit("price_update", price);
    };
  
    // Call initially and every second
    sendLivePrice();
    const interval = setInterval(sendLivePrice, 10000);
    socket.on("disconnect", (reason) => {
      clearInterval(interval)
      console.log('discoonedt')
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

module.exports = {
  initSocket,
  emitQuoteUpdate,
  emitWalletUpdate,
  emitTradeClosed,
  emitTradePlaced,
  emitTradeMarkers,
};
