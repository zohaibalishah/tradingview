import React, { useState, useEffect } from 'react';
import {
  FaSearch,
  FaStar,
  FaStarHalf,
  FaArrowUp,
  FaArrowDown,
  FaChevronLeft,
  FaChevronRight,
  FaDollarSign,
  FaSync,
} from 'react-icons/fa';
import { usePriceContext } from '../../contexts/PriceContext';
import api from '../../utils/api';

export default function WatchlistPanel({ isCollapsed, onToggleCollapse }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState([]);
  const [previousPrices, setPreviousPrices] = useState({});
  const [dbMarketData, setDbMarketData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Use global price context with all prices
  const {
    selectedCurrency,
    prices,
    allPrices,
    getAvailableCurrencies,
    formatPrice,
    spread,
    getEntryPrice,
    bidChangeIndicator,
    askChangeIndicator,
    isPriceStale,
    getConnectionStatus,
    changeCurrency,
  } = usePriceContext();

  // Fetch symbols from database
  const fetchSymbolsFromDB = async () => {
    try {
      setLoading(true);
      const response = await api.get('/market/symbols', {
        params: {
          isActive: true,
          limit: 100, // Increased limit to show more currencies
        },
      });

      if (response.data.status === 1) {
        setDbMarketData(response.data.data.symbols);
      }
    } catch (error) {
      console.error('Error fetching symbols:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSymbolsFromDB();
  }, []);

  // Calculate spread and price changes
  const calculateSpread = (bid, ask) => {
    if (!bid || !ask || bid === 0 || ask === 0)
      return { spread: 0, spreadPercent: 0 };
    const spreadValue = ask - bid;
    const spreadPercent = (spreadValue / bid) * 100;
    return { spread: spreadValue, spreadPercent };
  };

  const calculatePriceChange = (currentPrice, previousPrice, symbol) => {
    if (!currentPrice || !previousPrice) return { change: 0, changePercent: 0 };
    const change = currentPrice - previousPrice;
    const changePercent = (change / previousPrice) * 100;
    return { change, changePercent };
  };

  const calculatePipValue = (volume = 0.01, symbol) => {
    if (symbol === 'XAUUSD') {
      return volume * 10; // 1 lot = 10 USD per pip for XAUUSD
    }
    return volume * 10; // Standard for most pairs
  };

  // Get price change indicator
  const getPriceChangeIndicator = (currentPrice, previousPrice) => {
    if (!previousPrice || previousPrice === 0) return null;

    if (currentPrice > previousPrice) {
      return '↗️'; // Up arrow
    } else if (currentPrice < previousPrice) {
      return '↘️'; // Down arrow
    }
    return null;
  };

  // Market data with live prices and calculations
  const marketData =
    dbMarketData.length > 0
      ? dbMarketData.map((item) => {
          // Create the OANDA symbol format
          const oandaSymbol = `OANDA:${item.baseCurrency}_${item.quoteCurrency}`;

          // Get live price data from allPrices
          const livePriceData = allPrices[oandaSymbol];
          const isLive = !!livePriceData && livePriceData.price > 0;

          // Use live data if available, otherwise use 0 as default
          const liveBid = isLive ? livePriceData.bid : 0;
          const liveAsk = isLive ? livePriceData.ask : 0;
          const livePrice = isLive ? livePriceData.price : 0;

          return {
            ...item,
            symbol: item.symbol,
            name: item.displayName || item.name,
            oandaSymbol: oandaSymbol,
            bid: liveBid,
            ask: liveAsk,
            price: livePrice,
            change: item.change || 0,
            changePercent: item.changePercent || 0,
            isFavorite: item.isPopular || false,
            isLive: isLive,
            lastUpdate: livePriceData?.lastUpdate,
            timestamp: livePriceData?.timestamp,
            previousBid: livePriceData?.previousBid,
            previousAsk: livePriceData?.previousAsk,
          };
        })
      : [];

  // Calculate additional metrics for each market item
  const enhancedMarketData = marketData.map((item) => {
    const { spread: spreadValue, spreadPercent } = calculateSpread(
      item.bid,
      item.ask
    );
    const pipValue = calculatePipValue(0.01, item.symbol);

    // Calculate real-time price change
    const bidChange = getPriceChangeIndicator(item.bid, item.previousBid);
    const askChange = getPriceChangeIndicator(item.ask, item.previousAsk);

    return {
      ...item,
      spread: spreadValue,
      spreadPercent: spreadPercent,
      pipValue: pipValue,
      bidChange: bidChange,
      askChange: askChange,
      // Calculate real-time price change for live data
      realTimeChange: item.isLive
        ? calculatePriceChange(
            item.bid,
            item.previousBid || item.bid,
            item.symbol
          )
        : null,
    };
  });

  // Update previous prices for live data
  useEffect(() => {
    const newPreviousPrices = {};
    Object.keys(allPrices).forEach((symbol) => {
      const priceData = allPrices[symbol];
      if (priceData && priceData.bid) {
        newPreviousPrices[symbol] = priceData.bid;
      }
    });
    setPreviousPrices((prev) => ({ ...prev, ...newPreviousPrices }));
  }, [allPrices]);

  const filteredData = enhancedMarketData.filter(
    (item) =>
      item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleFavorite = (symbol) => {
    setFavorites((prev) =>
      prev.includes(symbol)
        ? prev.filter((s) => s !== symbol)
        : [...prev, symbol]
    );
  };

  // Handle currency selection
  const handleCurrencySelect = (item) => {
    if (item.oandaSymbol === selectedCurrency) return; // Don't change if already selected

    console.log('[WatchlistPanel] Selecting currency:', item.oandaSymbol);
    changeCurrency(item.oandaSymbol);
  };

  const formatPriceDisplay = (price, symbol) => {
    if (!price || price === 0) return '0.00';
    if (symbol === 'XAUUSD') {
      return Number(price).toFixed(2);
    }
    return Number(price).toFixed(2); // More precision for forex pairs
  };

  const formatSpreadDisplay = (spread, symbol) => {
    if (!spread || spread === 0) return '0.00';
    if (symbol === 'XAUUSD') {
      return spread.toFixed(2);
    }
    return spread.toFixed(2);
  };

  // Get connection status
  const connectionStatus = getConnectionStatus();
  const isConnected = connectionStatus.isConnected;

  if (isCollapsed) {
    return (
      <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-2">
        <button
          onClick={onToggleCollapse}
          className="w-full flex items-center justify-center p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-50 rounded-lg transition-colors"
          title="Show Watchlist"
        >
          <FaChevronRight className="text-lg" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-4 h-auto overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            All Currencies
          </h3>
          <p className="text-xs text-gray-500">
            {marketData.length} currencies • Live prices • Real-time updates
          </p>
          {selectedCurrency && (
            <p className="text-xs text-primary-600 font-medium mt-1">
              Selected: {selectedCurrency.replace('OANDA:', '')}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-gray-500">
            {isConnected ? (
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            ) : (
              <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            )}
            <span>{isConnected ? 'Live' : 'API'}</span>
          </div>
          <button
            onClick={fetchSymbolsFromDB}
            disabled={loading}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            title="Refresh Symbols"
          >
            <FaSync className={`text-sm ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onToggleCollapse}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="Hide Watchlist"
          >
            <FaChevronLeft className="text-sm" />
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
        <input
          type="text"
          placeholder="Search currencies, symbols, or categories..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
        />
      </div>

      {/* Market Data Table */}
      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 font-medium text-gray-600">
                  Currency
                </th>
                <th className="text-right py-2 font-medium text-gray-600">
                  Bid
                </th>
                <th className="text-right py-2 font-medium text-gray-600">
                  Ask
                </th>
                {/* <th className="text-right py-2 font-medium text-gray-600">
                  Spread
                </th> */}
                <th className="text-right py-2 font-medium text-gray-600">
                  Change
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item, index) => {
                const isSelected = item.oandaSymbol === selectedCurrency;
                return (
                  <tr
                    key={item.symbol}
                    className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                      item.isLive ? 'bg-blue-50 border-blue-200' : ''
                    } ${isSelected ? 'bg-primary-50 border-primary-200' : ''}`}
                    onClick={() => handleCurrencySelect(item)}
                    title={`Click to select ${item.symbol} for chart and trading`}
                    style={{ userSelect: 'none' }}
                  >
                    <td className="py-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleFavorite(item.symbol)}
                          className="text-yellow-500 hover:text-yellow-600"
                        >
                          {/* {favorites.includes(item.symbol) ? <FaStar size={12} /> : <FaStarHalf size={12} />} */}
                        </button>
                        <div>
                          <div className="font-medium text-gray-900 flex items-center gap-1">
                            <span
                              className={`font-bold ${isSelected ? 'text-primary-600' : ''}`}
                            >
                              {item.symbol}
                            </span>
                            {isSelected && (
                              <div className="w-2 h-2 bg-primary-500 rounded-full"></div>
                            )}
                            {item.isLive && (
                              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            )}
                            {item.isPopular && (
                              <span className="text-xs bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded">
                                Popular
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 font-medium">
                            {item.name}
                          </div>
                          {item.category && (
                            <div className="text-xs text-gray-400 flex items-center gap-1">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{
                                  backgroundColor:
                                    item.category.color || '#6B7280',
                                }}
                              ></span>
                              {item.category.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="text-right py-2">
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1">
                          <span
                            className={`font-mono text-sm font-bold ${item.isLive ? 'text-green-600 animate-pulse' : 'text-gray-900'}`}
                          >
                            {formatPriceDisplay(item.bid, item.symbol)}
                          </span>
                          {item.bidChange && (
                            <span className="text-xs">{item.bidChange}</span>
                          )}
                        </div>
                        {item.isLive && (
                          <div className="text-xs text-green-600 font-medium">
                            LIVE
                          </div>
                        )}
                        {item.lastUpdate && (
                          <div className="text-xs text-gray-400">
                            {item.lastUpdate}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="text-right py-2">
                      <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1">
                          <span
                            className={`font-mono text-sm font-bold ${item.isLive ? 'text-red-600 animate-pulse' : 'text-gray-900'}`}
                          >
                            {formatPriceDisplay(item.ask, item.symbol)}
                          </span>
                          {item.askChange && (
                            <span className="text-xs">{item.askChange}</span>
                          )}
                        </div>
                        {item.isLive && (
                          <div className="text-xs text-red-600 font-medium">
                            LIVE
                          </div>
                        )}
                      </div>
                    </td>
                    {/* <td className="text-right py-2">
                      <div className="flex flex-col items-end">
                        <span
                          className={`font-mono text-sm font-bold ${item.isLive ? 'text-blue-600 animate-pulse' : 'text-gray-600'}`}
                        >
                          {formatSpreadDisplay(item.spread, item.symbol)}
                        </span>
                        <div className="text-xs text-gray-500">
                          {item.spreadPercent
                            ? item.spreadPercent.toFixed(2)
                            : '0.00'}
                          %
                        </div>
                      </div>
                    </td> */}
                    <td className="text-right py-2">
                      <div className="flex flex-col items-end">
                        <div
                          className={`flex items-center justify-end gap-1 ${
                            item.change >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {item.change >= 0 ? (
                            <FaArrowUp size={10} />
                          ) : (
                            <FaArrowDown size={10} />
                          )}
                          <span className="font-mono font-bold">
                            {item.change >= 0 ? '+' : ''}
                            {item.change.toFixed(
                              item.symbol === 'XAUUSD' ? 2 : 4
                            )}
                          </span>
                        </div>
                        <div
                          className={`text-xs font-medium ${
                            item.changePercent >= 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {item.changePercent >= 0 ? '+' : ''}
                          {item.changePercent.toFixed(2)}%
                        </div>
                        {item.realTimeChange && (
                          <div className="text-xs text-blue-600 font-medium">
                            Live: {item.realTimeChange.change >= 0 ? '+' : ''}
                            {item.realTimeChange.change.toFixed(
                              item.symbol === 'XAUUSD' ? 2 : 4
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Summary Stats */}
      {!loading && marketData.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="text-center">
              <p className="text-gray-600">Total Currencies</p>
              <p className="font-bold text-gray-900">{marketData.length}</p>
            </div>
            <div className="text-center">
              <p className="text-gray-600">Live Feeds</p>
              <p className="font-bold text-green-600">
                {marketData.filter((item) => item.isLive).length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-600">Popular</p>
              <p className="font-bold text-yellow-600">
                {marketData.filter((item) => item.isPopular).length}
              </p>
            </div>
            <div className="text-center">
              <p className="text-gray-600">Categories</p>
              <p className="font-bold text-blue-600">
                {
                  new Set(
                    marketData
                      .map((item) => item.category?.name)
                      .filter(Boolean)
                  ).size
                }
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
