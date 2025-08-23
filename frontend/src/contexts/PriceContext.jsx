import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { getSocket, checkAndReconnectSocket, isSocketConnected, disconnectSocket } from '../services/socket';
import { useUser } from '../services/auth';

// Create the context
const PriceContext = createContext();

// Custom hook to use the price context
export const usePriceContext = () => {
  const context = useContext(PriceContext);
  if (!context) {
    throw new Error('usePriceContext must be used within a PriceProvider');
  }
  return context;
};



// Price Provider Component
export const PriceProvider = ({ children }) => {
  // Get user authentication state
  const { data: user, isLoading: userLoading } = useUser();
  
  // State for selected currency and all prices
  const [selectedCurrency, setSelectedCurrency] = useState('OANDA:XAU_USD');
  const [allPrices, setAllPrices] = useState({}); // Store prices for all currencies
  const [prices, setPrices] = useState({
    bid: 0,
    ask: 0,
    price: 0,
    timestamp: null,
    isConnected: false,
    previousBid: 0,
    previousAsk: 0,
    lastUpdate: null
  });

  // Socket connection ref
  const socketRef = useRef(null);
  const priceUpdateTimeoutRef = useRef(null);
  const connectionCheckIntervalRef = useRef(null);
  
  // Initialize socket connection and listen for real-time price updates
  useEffect(() => {
    // Don't initialize socket if user is still loading or not authenticated
    if (userLoading) {
      console.log('[PriceContext] User loading, waiting for authentication state...');
      return;
    }

    if (!user) {
      disconnectSocket();
      setPrices(prev => ({
        ...prev,
        isConnected: false
      }));
      return;
    }

    
    const initializeSocket = () => {
      const socket = checkAndReconnectSocket();
      if (!socket) {
        console.log('[PriceContext] No socket available, skipping initialization');
        return;
      }
      
      socketRef.current = socket;
      
      // Update connection status
      setPrices(prev => ({
        ...prev,
        isConnected: socket.connected
      }));
      
      // Listen for price updates for ALL currencies
      const handlePriceUpdate = (data) => {
        const { symbol, price, ask, bid, timestamp } = data;
        
        // Skip invalid data
        if (!symbol || !price || isNaN(price)) {
          console.log('[PriceContext] Invalid price data, skipping:', data);
          return;
        }
        
        // Update all prices state
        setAllPrices(prev => {
          const newPrices = {
            ...prev,
            [symbol]: {
              bid: bid || price,
              ask: ask || price,
              price: price,
              timestamp: timestamp || Date.now(),
              lastUpdate: new Date().toLocaleTimeString(),
              previousBid: prev[symbol]?.bid || 0,
              previousAsk: prev[symbol]?.ask || 0
            }
          };
          
          // Update selected currency prices if this is the selected one
          if (symbol === selectedCurrency) {
            setPrices(prev => ({
              ...newPrices[symbol],
              isConnected: true
            }));
          }
          
          return newPrices;
        });
        
        // Clear any existing timeout
        if (priceUpdateTimeoutRef.current) {
          clearTimeout(priceUpdateTimeoutRef.current);
        }
        
        // Set a timeout to mark prices as stale after 5 seconds
        priceUpdateTimeoutRef.current = setTimeout(() => {
          setPrices(prev => ({
            ...prev,
            isConnected: false
          }));
        }, 5000);
      };
      
      // Listen for connection status changes
      const handleConnect = () => {
        setPrices(prev => ({
          ...prev,
          isConnected: true
        }));
      };
      
      const handleDisconnect = () => {
        setPrices(prev => ({
          ...prev,
          isConnected: false
        }));
      };
      
      // Add event listeners
      socket.on('price:update', handlePriceUpdate);
      socket.on('connect', handleConnect);
      socket.on('disconnect', handleDisconnect);
      
      // If socket is already connected, trigger connect handler
      if (socket.connected) {
        console.log('[PriceContext] Socket already connected, triggering connect handler');
        handleConnect();
      }
      
      // Set up connection check interval
      connectionCheckIntervalRef.current = setInterval(() => {
        if (socket && !socket.connected) {
          socket.connect();
        }
      }, 5000); // Check every 5 seconds
      
      // Cleanup function
      return () => {
        socket.off('price:update', handlePriceUpdate);
        socket.off('connect', handleConnect);
        socket.off('disconnect', handleDisconnect);
        
        if (priceUpdateTimeoutRef.current) {
          clearTimeout(priceUpdateTimeoutRef.current);
        }
        
        if (connectionCheckIntervalRef.current) {
          clearInterval(connectionCheckIntervalRef.current);
        }
      };
    };

    // Initialize socket immediately when user is authenticated
    const cleanup = initializeSocket();
    
    return () => {
      if (cleanup) cleanup();
      if (priceUpdateTimeoutRef.current) {
        clearTimeout(priceUpdateTimeoutRef.current);
      }
      if (connectionCheckIntervalRef.current) {
        clearInterval(connectionCheckIntervalRef.current);
      }
    };
  }, [user, userLoading]); // Re-initialize when user auth state changes

  // Update selected currency prices when selectedCurrency changes
  useEffect(() => {
    if (allPrices[selectedCurrency]) {
      setPrices(prev => ({
        ...allPrices[selectedCurrency],
        isConnected: prev.isConnected
      }));
    } else {
      // Reset prices for new currency
      setPrices(prev => ({
        bid: 0,
        ask: 0,
        price: 0,
        timestamp: null,
        isConnected: prev.isConnected,
        previousBid: 0,
        previousAsk: 0,
        lastUpdate: null
      }));
    }
  }, [selectedCurrency, allPrices]);

  // Listen for authentication state changes (login/logout)
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (event.key === 'token') {
        console.log('[PriceContext] Token changed, reinitializing socket connection...');
        // The main useEffect will handle the socket reinitialization
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Function to change selected currency
  const changeCurrency = (newCurrency) => {
    setSelectedCurrency(newCurrency);
  };

  // Function to get price for any currency
  const getCurrencyPrice = (currency) => {
    return allPrices[currency] || {
      bid: 0,
      ask: 0,
      price: 0,
      timestamp: null,
      lastUpdate: null,
      previousBid: 0,
      previousAsk: 0
    };
  };

  // Function to get all available currencies
  const getAvailableCurrencies = () => {
    return Object.keys(allPrices);
  };

  // Function to get price change indicator
  const getPriceChangeIndicator = (currentPrice, previousPrice) => {
    if (!previousPrice || previousPrice === 0) return null;
    
    if (currentPrice > previousPrice) {
      return '↗️'; // Up arrow
    } else if (currentPrice < previousPrice) {
      return '↘️'; // Down arrow
    }
    return null;
  };

  // Function to format price with proper decimal places
  const formatPrice = (price, symbol = selectedCurrency) => {
    if (!price || price === 0) return '0.00';
    
    // For forex pairs, use 5 decimal places, for others use 2
    const isForex = symbol.includes('USD') || symbol.includes('EUR') || symbol.includes('GBP');
    return Number(price).toFixed(isForex ? 2 : 2);
  };

  // Function to calculate spread
  const calculateSpread = () => {
    if (prices.bid && prices.ask) {
      return ((prices.ask - prices.bid) / prices.bid) * 100;
    }
    return 0;
  };

  // Function to get entry price based on trade side
  const getEntryPrice = (side) => {
    if (side === 'BUY') {
      return prices.ask || prices.price;
    } else {
      return prices.bid || prices.price;
    }
  };

  // Function to check if prices are stale
  const isPriceStale = () => {
    if (!prices.timestamp) return true;
    const now = Date.now();
    const staleThreshold = 5000; // 5 seconds
    return (now - prices.timestamp) > staleThreshold;
  };

  // Function to get connection status
  const getConnectionStatus = () => {
    return {
      isConnected: prices.isConnected,
      isStale: isPriceStale(),
      lastUpdate: prices.lastUpdate,
      timestamp: prices.timestamp,
      isAuthenticated: !!user,
      isLoading: userLoading
    };
  };

  // Function to manually reconnect socket (for debugging)
  const reconnectSocket = () => {
    if (user) {
      const socket = checkAndReconnectSocket();
      if (socket) {
        socketRef.current = socket;
        setPrices(prev => ({
          ...prev,
          isConnected: socket.connected
        }));
      }
    }
  };

  // Context value
  const value = {
    // State
    selectedCurrency,
    prices,
    allPrices,
    
    // Actions
    changeCurrency,
    reconnectSocket,
    
    // Computed values
    spread: calculateSpread(),
    entryPrice: getEntryPrice('BUY'), // Default to BUY, can be overridden
    
    // Utility functions
    formatPrice,
    getPriceChangeIndicator,
    getEntryPrice,
    isPriceStale,
    getConnectionStatus,
    getCurrencyPrice,
    getAvailableCurrencies,
    
    // Price change indicators
    bidChangeIndicator: getPriceChangeIndicator(prices.bid, prices.previousBid),
    askChangeIndicator: getPriceChangeIndicator(prices.ask, prices.previousAsk)
  };

  return (
    <PriceContext.Provider value={value}>
      {children}
    </PriceContext.Provider>
  );
};

export default PriceContext;
