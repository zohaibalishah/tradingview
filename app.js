require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const http = require('http');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');
const { startSocketStream } = require('./socket-stream');
const { authenticate } = require('./helpers/auth.helper');

const app = express();
global.latestPrices = {};

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "wss:", "ws:", "https://finnhub.io"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    status: 0,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all routes
// app.use(limiter);

// Compression middleware
app.use(compression());
app.use(cors())
// Configure CORS with better security
// app.use(
//   cors({
//     origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
//     credentials: true,
//     methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
//     allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
//     exposedHeaders: ['X-Total-Count'],
//   })
// );

// Body parsing middleware with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware with better formatting
app.use(morgan('combined', {
  skip: (req, res) => res.statusCode < 400,
  stream: {
    write: (message) => {
      console.log(message.trim());
    }
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 1,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API routes
app.use('/api', require('./routes/chart.route'));
app.use('/api/auth', require('./routes/auth.route'));
app.use('/api/accounts', require('./routes/account.route'));
app.use('/api/trades', require('./routes/trade.route'));
app.use('/api/market', require('./routes/market.route'));

// admin
app.use('/api/admin', require('./routes/admin/spread.route')); // Add this line
app.use('/api/admin', require('./routes/admin/admin.route')); // Admin user management routes
app.use('/api/admin', require('./routes/admin/user.route')); // User management routes
app.use('/api/admin', require('./routes/admin/stats.route')); // Admin statistics routes
app.use('/api/admin', require('./routes/admin/trades.route')); // Admin trades routes
app.use('/api/admin/categories', require('./routes/admin/category.route')); // Category management routes
app.use('/api/admin/symbols', require('./routes/admin/symbol.route')); // Symbol management routes
app.use('/api/admin/deposits',authenticate, require('./routes/admin/deposit.route')); // Admin deposit management routes
app.use('/api/admin/withdrawals',authenticate, require('./routes/admin/withdrawal.route')); // Admin withdrawal management routes



// Global error handling middleware
app.use((err, req, res, next) => {
  console.error('Global error handler:', err);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    status: 0,
    message: isDevelopment ? err.message : 'Internal server error',
    ...(isDevelopment && { stack: err.stack }),
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    status: 0,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

const server = http.createServer(app);

// Socket.IO configuration with better security
const io = require('socket.io')(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ['websocket', 'polling'],
});

// Socket authentication middleware
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization;
    
    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }
    
    // Remove 'Bearer ' prefix if present
    const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
    
    // Verify JWT token
    const jwt = require('jsonwebtoken');
    const User = require('./models/User.model');
    
    jwt.verify(cleanToken, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        console.log('[Socket] JWT verification failed:', err.message);
        return next(new Error('Authentication error: Invalid token'));
      }
      
      try {
        const user = await User.findOne({
          where: { id: decoded.id },
        });
        
        if (!user) {
          console.log('[Socket] User not found for token');
          return next(new Error('Authentication error: User not found'));
        }
        
        // Attach user to socket
        socket.user = user.dataValues;
        console.log(`[Socket] User authenticated: ${user.email}`);
        next();
      } catch (error) {
        console.error('[Socket] Database error during authentication:', error);
        return next(new Error('Authentication error: Database error'));
      }
    });
  } catch (error) {
    console.error('[Socket] Authentication error:', error);
    return next(new Error('Authentication error: ' + error.message));
  }
});

// Socket connection handler
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}, User: ${socket.user?.email}`);
  
  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Client disconnected: ${socket.id}, Reason: ${reason}`);
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 CORS Origin: ${process.env.CORS_ORIGIN || 'http://localhost:5173'}`);
  
  // Initialize database and socket stream
  require("./config/db").databaseLoader().then(async () => {
    const socketStream = await startSocketStream(io);
    
    // Store cleanup function for graceful shutdown
    global.socketStreamCleanup = socketStream.cleanup;
  }).catch((error) => {
    console.error('❌ Failed to initialize application:', error);
    process.exit(1);
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  
  // Cleanup socket stream first
  if (global.socketStreamCleanup) {
    try {
      await global.socketStreamCleanup();
    } catch (error) {
      console.error('Error during socket stream cleanup:', error);
    }
  }
  
  // Close database connections
  try {
    await require("./config/db").gracefulShutdown();
  } catch (error) {
    console.error('Error during database shutdown:', error);
  }
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  
  // Cleanup socket stream first
  if (global.socketStreamCleanup) {
    try {
      await global.socketStreamCleanup();
    } catch (error) {
      console.error('Error during socket stream cleanup:', error);
    }
  }
  
  // Close database connections
  try {
    await require("./config/db").gracefulShutdown();
  } catch (error) {
    console.error('Error during database shutdown:', error);
  }
  
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
