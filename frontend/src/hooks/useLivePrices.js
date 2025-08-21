import { useState, useEffect, useCallback } from 'react';
import { checkAndReconnectSocket, isSocketConnected } from '../services/socket';
import { usePriceContext } from '../contexts/PriceContext';

export const useLivePrices = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [liveProfits, setLiveProfits] = useState({});

  // Get price context for live price data
  const { allPrices, getCurrencyPrice } = usePriceContext();

  useEffect(() => {
    const checkConnection = () => {
      const connected = isSocketConnected();
      setIsConnected(connected);
      
      if (connected) {
        setLastUpdate(new Date().toLocaleTimeString());
      }
    };

    // Check connection status immediately
    checkConnection();

    // Check connection status every 3 seconds
    const interval = setInterval(checkConnection, 3000);

    return () => clearInterval(interval);
  }, []);

  const reconnect = async () => {
    try {
      await checkAndReconnectSocket();
      // Wait a bit for connection to establish
      setTimeout(() => {
        setIsConnected(isSocketConnected());
        setLastUpdate(new Date().toLocaleTimeString());
      }, 1000);
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  };

  // Calculate live profits for trades
  const calculateLiveProfits = useCallback((trades) => {
    const profits = {};
    
    trades.forEach(trade => {
      const currentPrice = getCurrentPrice(trade);
      const profit = calculateProfit(trade, currentPrice);
      profits[trade.id] = profit;
    });
    
    setLiveProfits(profits);
  }, []);

  // Get current price for a trade
  const getCurrentPrice = useCallback((trade) => {
    if (!trade || !trade.symbol) return null;
    
    const priceData = getCurrencyPrice(trade.symbol);
    if (!priceData || !priceData.price) return null;
    
    // Return appropriate price based on trade side
    if (trade.side === 'BUY') {
      return priceData.ask || priceData.price;
    } else {
      return priceData.bid || priceData.price;
    }
  }, [getCurrencyPrice]);

  // Get current profit for a trade
  const getCurrentProfit = useCallback((trade) => {
    if (!trade) return 0;
    
    // Return cached profit if available
    if (liveProfits[trade.id] !== undefined) {
      return liveProfits[trade.id];
    }
    
    // Calculate profit
    const currentPrice = getCurrentPrice(trade);
    return calculateProfit(trade, currentPrice);
  }, [liveProfits, getCurrentPrice]);

  // Check if price is live for a trade
  const isPriceLive = useCallback((trade) => {
    if (!trade || !trade.symbol) return false;
    
    const priceData = getCurrencyPrice(trade.symbol);
    if (!priceData || !priceData.timestamp) return false;
    
    // Check if price is recent (within 5 seconds)
    const now = Date.now();
    const priceAge = now - priceData.timestamp;
    return priceAge < 5000 && isConnected;
  }, [getCurrencyPrice, isConnected]);

  // Check if we have live prices available
  const hasLivePrices = useCallback(() => {
    return isConnected && Object.keys(allPrices).length > 0;
  }, [isConnected, allPrices]);

  // Calculate profit for a trade
  const calculateProfit = useCallback((trade, currentPrice) => {
    if (!trade || !currentPrice) return 0;
    
    const { entryPrice, volume, side } = trade;
    
    if (!entryPrice || !volume) return 0;
    
    let profit = 0;
    
    if (side === 'BUY') {
      // For BUY trades: profit = (current_price - entry_price) * volume
      profit = (currentPrice - entryPrice) * volume;
    } else {
      // For SELL trades: profit = (entry_price - current_price) * volume
      profit = (entryPrice - currentPrice) * volume;
    }
    
    return profit;
  }, []);

  return {
    // Connection status
    isConnected,
    lastUpdate,
    reconnect,
    
    // Live price functions
    calculateLiveProfits,
    getCurrentPrice,
    getCurrentProfit,
    isPriceLive,
    hasLivePrices,
    
    // Additional utilities
    allPrices,
    getCurrencyPrice
  };
};
