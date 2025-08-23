import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { getSocket, checkAndReconnectSocket, isSocketConnected } from '../services/socket';

const AdminPriceContext = createContext();

export const useAdminPriceContext = () => {
  const context = useContext(AdminPriceContext);
  if (!context) {
    throw new Error('useAdminPriceContext must be used within an AdminPriceProvider');
  }
  return context;
};

export const AdminPriceProvider = ({ children }) => {
  const [adminPrices, setAdminPrices] = useState({});
  const [socketConnected, setSocketConnected] = useState(false);
  const [subscribedSymbols, setSubscribedSymbols] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  // Socket refs
  const socketRef = useRef(null);
  const priceDataRef = useRef({});
  const hasSubscribedRef = useRef(false);

  // Initialize socket connection
  useEffect(() => {
    const initializeSocket = () => {
      const socket = checkAndReconnectSocket();
      if (!socket) {
        setSocketConnected(false);
        setConnectionStatus('disconnected');
        return;
      }
      
      socketRef.current = socket;
      
      setSocketConnected(socket.connected);
      setConnectionStatus(socket.connected ? 'connected' : 'connecting');

      // Listen for price updates for admin symbols
      const handlePriceUpdate = (data) => {
        console.log('data',data)
        const { symbol, price, ask, bid, timestamp } = data;
        
        if (symbol && !isNaN(price)) {
          const updateData = {
            price: parseFloat(price),
            ask: ask ? parseFloat(ask) : parseFloat(price),
            bid: bid ? parseFloat(bid) : parseFloat(price),
            timestamp: timestamp || Date.now(),
            lastUpdate: new Date().toLocaleTimeString(),
            spread: ask && bid ? parseFloat(ask) - parseFloat(bid) : 0
          };

          // Store in ref for persistence
          priceDataRef.current[symbol] = updateData;
          
          // Update state
          setAdminPrices(prev => ({
            ...prev,
            [symbol]: updateData
          }));
          
          setLastUpdate(new Date());
        }
      };

      // Listen for connection status
      const handleConnect = () => {
        setSocketConnected(true);
        setConnectionStatus('connected');
      };

      const handleDisconnect = () => {
        setSocketConnected(false);
        setConnectionStatus('disconnected');
        hasSubscribedRef.current = false; // Reset subscription flag on disconnect
      };

      // Listen for subscription confirmation
      const handleSubscribed = (data) => {
        setSubscribedSymbols(data.symbols || []);
        hasSubscribedRef.current = true; // Mark as subscribed
      };

      // Listen for subscription errors
      const handleSubscriptionError = (data) => {
        setConnectionStatus('error');
        hasSubscribedRef.current = false; // Reset on error
      };

      // Add event listeners
      socket.on('admin:price:update', handlePriceUpdate);
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      socket.on('subscribed:gold-symbols', handleSubscribed);
      socket.on('subscription:error', handleSubscriptionError);

      // Cleanup function
      return () => {
        socket.off('admin:price:update', handlePriceUpdate);
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        socket.off('subscribed:gold-symbols', handleSubscribed);
        socket.off('subscription:error', handleSubscriptionError);
      };
    };

    // Initialize socket with a small delay to ensure auth state is ready
    const timeoutId = setTimeout(initializeSocket, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // Subscribe to gold symbols with useCallback to prevent infinite loops
  const subscribeToGoldSymbols = useCallback(() => {
    if (socketRef.current && socketRef.current.connected && !hasSubscribedRef.current) {
      socketRef.current.emit('subscribe:gold-symbols');
    }
  }, []);

  // Subscribe to specific symbols
  const subscribeToSymbols = useCallback((symbols) => {
    if (socketRef.current && socketRef.current.connected && Array.isArray(symbols)) {
      socketRef.current.emit('subscribe:symbols', { symbols });
    }
  }, []);

  // Unsubscribe from symbols
  const unsubscribeFromSymbols = useCallback((symbols) => {
    if (socketRef.current && socketRef.current.connected && Array.isArray(symbols)) {
      socketRef.current.emit('unsubscribe:symbols', { symbols });
    }
  }, []);

  // Get price for specific symbol
  const getSymbolPrice = useCallback((symbol) => {
    return adminPrices[symbol] || null;
  }, [adminPrices]);

  // Get all prices
  const getAllPrices = useCallback(() => {
    return adminPrices;
  }, [adminPrices]);

  // Get live symbols count
  const getLiveSymbolsCount = useCallback(() => {
    return Object.keys(adminPrices).length;
  }, [adminPrices]);

  // Check if symbol is live
  const isSymbolLive = useCallback((symbol) => {
    return !!adminPrices[symbol];
  }, [adminPrices]);

  // Format price for display
  const formatPrice = useCallback((price, decimals = 2) => {
    if (!price || isNaN(price)) return '0.00';
    return Number(price).toFixed(decimals);
  }, []);

  // Calculate spread percentage
  const calculateSpreadPercent = useCallback((bid, ask) => {
    if (!bid || !ask || bid === 0) return 0;
    return ((ask - bid) / bid) * 100;
  }, []);

  // Get connection status
  const getConnectionStatus = useCallback(() => {
    return {
      connected: socketConnected,
      status: connectionStatus,
      lastUpdate,
      subscribedCount: subscribedSymbols.length,
      liveCount: getLiveSymbolsCount()
    };
  }, [socketConnected, connectionStatus, lastUpdate, subscribedSymbols.length, getLiveSymbolsCount]);

  // Refresh connection
  const refreshConnection = useCallback(() => {
    if (socketRef.current) {
      hasSubscribedRef.current = false; // Reset subscription flag
      socketRef.current.connect();
    }
  }, []);

  const value = {
    // State
    adminPrices,
    socketConnected,
    subscribedSymbols,
    lastUpdate,
    connectionStatus,
    
    // Actions
    subscribeToGoldSymbols,
    subscribeToSymbols,
    unsubscribeFromSymbols,
    refreshConnection,
    
    // Getters
    getSymbolPrice,
    getAllPrices,
    getLiveSymbolsCount,
    isSymbolLive,
    getConnectionStatus,
    
    // Utilities
    formatPrice,
    calculateSpreadPercent
  };

  return (
    <AdminPriceContext.Provider value={value}>
      {children}
    </AdminPriceContext.Provider>
  );
};
