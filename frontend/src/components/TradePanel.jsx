import React, { useState, useEffect } from 'react';
import { FaArrowUp, FaArrowDown, FaDollarSign, FaExclamationTriangle, FaWifi, FaTimes } from 'react-icons/fa';
import { useCreateTrade, useGetMarketPrice } from '../services/trade.service';
import { useUser } from '../services/auth';
import { usePriceContext } from '../contexts/PriceContext';
import toast from 'react-hot-toast';

export default function TradePanel({ symbol = 'OANDA:XAU_USD', isOpen, onClose }) {
  const { data: user } = useUser();
  const createTrade = useCreateTrade();
  
  // Use global price context
  const { 
    selectedCurrency, 
    prices, 
    formatPrice, 
    spread, 
    getEntryPrice,
    bidChangeIndicator,
    askChangeIndicator
  } = usePriceContext();
  
  const { data: marketPriceData, isLoading: priceLoading, error: priceError } = useGetMarketPrice(selectedCurrency);

  const [tradeData, setTradeData] = useState({
    symbol: selectedCurrency,
    side: 'BUY',
    volume: 0.01,
    entryPrice: 0,
    stopLoss: null,
    takeProfit: null,
    leverage: 100
  });

  const [isLoading, setIsLoading] = useState(false);

  // Update trade data when selected currency changes
  useEffect(() => {
    setTradeData(prev => ({
      ...prev,
      symbol: selectedCurrency,
      entryPrice: getEntryPrice(prev.side)
    }));
  }, [selectedCurrency, getEntryPrice]);

  // Update entry price when prices change
  useEffect(() => {
    const entryPrice = getEntryPrice(tradeData.side);
    setTradeData(prev => ({
      ...prev,
      entryPrice: entryPrice
    }));
  }, [prices.bid, prices.ask, prices.price, tradeData.side, getEntryPrice]);

  const handleSideChange = (side) => {
    const entryPrice = getEntryPrice(side);
    setTradeData(prev => ({
      ...prev,
      side,
      entryPrice: entryPrice
    }));
  };

  const handleVolumeChange = (e) => {
    const volume = parseFloat(e.target.value);
    setTradeData(prev => ({
      ...prev,
      volume: volume || 0
    }));
  };

  const handleLeverageChange = (e) => {
    const leverage = parseInt(e.target.value);
    setTradeData(prev => ({
      ...prev,
    }));
  };

  const calculateStopLoss = (percentage) => {
    const entryPrice = tradeData.entryPrice;
    if (!entryPrice) return 0;

    const multiplier = tradeData.side === 'BUY' ? -1 : 1;
    return entryPrice + (entryPrice * (percentage / 100) * multiplier);
  };

  const calculateTakeProfit = (percentage) => {
    const entryPrice = tradeData.entryPrice;
    if (!entryPrice) return 0;

    const multiplier = tradeData.side === 'BUY' ? 1 : -1;
    return entryPrice + (entryPrice * (percentage / 100) * multiplier);
  };

  const handleQuickSL = (percentage) => {
    const stopLoss = calculateStopLoss(percentage);
    setTradeData(prev => ({
      ...prev,
      stopLoss: stopLoss
    }));
  };


  const handleTrade = async () => {
    if (!user) {
      toast.error('Please login to trade');
      return;
    }

    if (tradeData.volume <= 0) {
      toast.error('Please enter a valid volume');
      return;
    }

    if (tradeData.entryPrice <= 0) {
      toast.error('Invalid entry price');
      return;
    }

    setIsLoading(true);

    try {
      // Prepare trade payload according to backend API expectations
      const tradePayload = {
        symbol: tradeData.symbol,
        side: tradeData.side,
        volume: tradeData.volume,
      };

      const result = await createTrade.mutateAsync(tradePayload);
      
      if (result.success) {
        toast.success(`${tradeData.side} order placed successfully!`);
        
        // Reset form
        setTradeData(prev => ({
          ...prev,
          volume: 0.01,
          stopLoss: null,
          takeProfit: null
        }));
        
        // Close modal after successful trade
        onClose();
      } else {
        toast.error('Failed to place trade');
      }
    } catch (error) {
      console.error('Trade error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to place trade';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };


  // Handle backdrop click to close modal
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle escape key to close modal
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  if (priceLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleBackdropClick}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading market data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (priceError) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleBackdropClick}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-red-500 mb-4">
                <FaExclamationTriangle className="w-8 h-8 mx-auto" />
              </div>
              <p className="text-gray-600 dark:text-gray-400">Failed to load market data</p>
              <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">Please try again later</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Use prices from context
  const bidPrice = prices.bid || marketPriceData?.withSpread?.bid || 0;
  const askPrice = prices.ask || marketPriceData?.withSpread?.ask || 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleBackdropClick}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Trade {selectedCurrency}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <FaTimes className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className={`rounded-lg p-3 transition-colors ${
            prices.isConnected 
              ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' 
              : 'bg-gray-50 dark:bg-gray-700'
          }`}>
            <div className="text-sm text-gray-500 dark:text-gray-400">Bid</div>
            <div className={`text-lg font-bold text-red-500 ${
              prices.isConnected ? 'animate-pulse' : ''
            }`}>
              {formatPrice(bidPrice)}
              {bidChangeIndicator && (
                <span className="ml-1 text-sm">{bidChangeIndicator}</span>
              )}
            </div>
          </div>
          <div className={`rounded-lg p-3 transition-colors ${
            prices.isConnected 
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
              : 'bg-gray-50 dark:bg-gray-700'
          }`}>
            <div className="text-sm text-gray-500 dark:text-gray-400">Ask</div>
            <div className={`text-lg font-bold text-green-500 ${
              prices.isConnected ? 'animate-pulse' : ''
            }`}>
              {formatPrice(askPrice)}
              {askChangeIndicator && (
                <span className="ml-1 text-sm">{askChangeIndicator}</span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            onClick={() => handleSideChange('BUY')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-colors ${
              tradeData.side === 'BUY'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <FaArrowUp />
            BUY
          </button>
          <button
            onClick={() => handleSideChange('SELL')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-colors ${
              tradeData.side === 'SELL'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            <FaArrowDown />
            SELL
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Volume (Lots)
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={tradeData.volume}
              onChange={handleVolumeChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              placeholder="0.01"
            />
          </div>

          <button
            onClick={handleTrade}
            disabled={isLoading}
            className={`w-full py-3 px-4 rounded-lg font-semibold text-white transition-colors ${
              tradeData.side === 'BUY'
                ? 'bg-green-500 hover:bg-green-600 disabled:bg-green-300'
                : 'bg-red-500 hover:bg-red-600 disabled:bg-red-300'
            } disabled:cursor-not-allowed`}
          >
            {isLoading ? (
              <div className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <FaDollarSign />
                {tradeData.side} {selectedCurrency}
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
