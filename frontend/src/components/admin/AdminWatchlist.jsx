import React, { useState, useEffect } from 'react';
import { FaSearch, FaStar, FaEye, FaSync } from 'react-icons/fa';
import { useAdminPriceContext } from '../../contexts/AdminPriceContext';
import api from '../../utils/api';

export default function AdminWatchlist() {
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [marketData, setMarketData] = useState([]);
  const [selectedSymbol, setSelectedSymbol] = useState(null);

  const {
    adminPrices,
    socketConnected,
    subscribedSymbols,
    lastUpdate,
    connectionStatus,
    subscribeToGoldSymbols,
    getSymbolPrice,
    getLiveSymbolsCount,
    getConnectionStatus,
    formatPrice,
    calculateSpreadPercent,
  } = useAdminPriceContext();

  const fetchGoldSymbols = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/symbols', {
        params: { baseCurrency: 'XAU', isActive: true, limit: 50 },
      });

      if (response.data.status === 1) {
        const symbols = response.data.data.symbols;
        const transformedData = symbols.map((symbol) => {
          const oandaSymbol = `OANDA:XAU_${symbol.quoteCurrency}`;
          const liveData = getSymbolPrice(oandaSymbol);
          const isLive = !!liveData && liveData.price > 0;
          const bid = isLive ? liveData.bid : 0;
          const ask = isLive ? liveData.ask : bid + (symbol.defaultSpread || 0);
          const previousClose = isLive ? (liveData.previousBid || bid) : bid - (Math.random() * 10 - 5);
          const change = bid - previousClose;
          const changePercent = (change / previousClose) * 100;
          const volatility = Math.random() * 20 + 10;
          const high = Math.max(bid, ask) + volatility;
          const low = Math.min(bid, ask) - volatility;
          const trend = change > 5 ? 'Bullish' : change < -5 ? 'Bearish' : 'Neutral';
          const volatilityLevel = volatility > 25 ? 'High' : volatility < 15 ? 'Low' : 'Medium';

          return {
            id: symbol.id,
            symbol: symbol.symbol,
            name: symbol.name,
            displayName: symbol.displayName,
            category: symbol.category?.name || 'Precious Metals',
            oandaSymbol,
            bid,
            ask,
            price: isLive ? liveData.price : 0,
            previousClose,
            high,
            low,
            volume: Math.floor(Math.random() * 2000) + 500,
            change,
            changePercent,
            isLive,
            isFavorite: symbol.isPopular || false,
            spread: symbol.defaultSpread || 0,
            pipValue: symbol.pipValue || 10,
            volatility: volatilityLevel,
            trend,
            support: low - volatility * 0.5,
            resistance: high + volatility * 0.5,
            lastUpdate: isLive ? liveData.lastUpdate : new Date().toLocaleTimeString(),
            timestamp: isLive ? liveData.timestamp : Date.now(),
            previousBid: isLive ? liveData.previousBid : null,
            previousAsk: isLive ? liveData.previousAsk : null,
            minLotSize: symbol.minLotSize,
            maxLotSize: symbol.maxLotSize,
            minSpread: symbol.minSpread,
            maxSpread: symbol.maxSpread,
            pricePrecision: symbol.pricePrecision,
            volumePrecision: symbol.volumePrecision,
            isTradable: symbol.isTradable,
            isPopular: symbol.isPopular,
            externalSymbol: symbol.externalSymbol,
            dataProvider: symbol.dataProvider,
          };
        });

        setMarketData(transformedData);

        if (socketConnected) {
          subscribeToGoldSymbols();
        }
      }
    } catch (error) {
      console.error('Error fetching gold symbols:', error);
      setMarketData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoldSymbols();
  }, []);

  useEffect(() => {
    if (socketConnected && marketData.length > 0) {
      subscribeToGoldSymbols();
    }
  }, [socketConnected, marketData.length, subscribeToGoldSymbols]);

  useEffect(() => {
    if (Object.keys(adminPrices).length > 0) {
      setMarketData((prev) =>
        prev.map((item) => {
          const liveData = getSymbolPrice(item.oandaSymbol);
          if (liveData) {
            return {
              ...item,
              bid: liveData.bid,
              ask: liveData.ask,
              price: liveData.price,
              isLive: true,
              lastUpdate: liveData.lastUpdate,
              timestamp: liveData.timestamp,
              previousBid: item.bid,
              previousAsk: item.ask,
              change: liveData.bid - item.previousClose,
              changePercent: ((liveData.bid - item.previousClose) / item.previousClose) * 100,
            };
          }
          return item;
        })
      );
    }
  }, [adminPrices, getSymbolPrice]);

  const calculateMetrics = (item) => {
    const spreadValue = item.ask - item.bid;
    const spreadPercent = calculateSpreadPercent(item.bid, item.ask);
    const dailyRange = item.high - item.low;
    const rangePercent = (dailyRange / item.previousClose) * 100;

    return {
      spreadValue,
      spreadPercent,
      dailyRange,
      rangePercent,
      isPositive: item.change >= 0,
    };
  };

  const getPriceChangeIndicator = (currentPrice, previousPrice) => {
    if (!previousPrice || previousPrice === 0) return null;
    return currentPrice > previousPrice ? '↗️' : currentPrice < previousPrice ? '↘️' : null;
  };

  const filteredData = marketData.filter(
    (item) =>
      item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.displayName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRefresh = async () => {
    await fetchGoldSymbols();
  };

  const formatPriceDisplay = (price, symbol) => {
    if (!price || price === 0) return '0.00';
    return symbol.includes('XAU') ? formatPrice(price, 2) : formatPrice(price, 4);
  };

  const getTrendColor = (trend) => {
    switch (trend.toLowerCase()) {
      case 'bullish':
        return 'text-green-600';
      case 'bearish':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const connectionInfo = getConnectionStatus();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Gold Watchlist</h3>
              <p className="text-sm text-gray-500">Loading market data...</p>
            </div>
          </div>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Gold Watchlist</h3>
            <p className="text-sm text-gray-500">{filteredData.length} symbols • Admin Live Data</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-xs text-gray-500">
              {socketConnected ? (
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              ) : (
                <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
              )}
              <span>{connectionStatus === 'connected' ? 'Admin Live' : 'Connecting...'}</span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={loading}
              className="p-2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
              title="Refresh Data"
            >
              <FaSync className={`text-sm ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="px-6 py-4 border-b border-gray-200">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-sm" />
          <input
            type="text"
            placeholder="Search symbols, names, or categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-6 font-medium text-gray-600">Symbol</th>
              <th className="text-right py-3 px-6 font-medium text-gray-600">Current Price</th>
              <th className="text-right py-3 px-6 font-medium text-gray-600">Bid</th>
              <th className="text-right py-3 px-6 font-medium text-gray-600">Ask</th>
              <th className="text-right py-3 px-6 font-medium text-gray-600">Spread</th>
              <th className="text-right py-3 px-6 font-medium text-gray-600">Change</th>
              <th className="text-center py-3 px-6 font-medium text-gray-600">Trend</th>
              <th className="text-center py-3 px-6 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item) => {
              const metrics = calculateMetrics(item);
              const bidChange = getPriceChangeIndicator(item.bid, item.previousBid);
              const askChange = getPriceChangeIndicator(item.ask, item.previousAsk);

              return (
                <tr
                  key={item.symbol}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                    item.isLive ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <td className="py-3 px-6">
                    <div className="flex items-center gap-2">
                      <button
                        className={`${item.isFavorite ? 'text-yellow-500' : 'text-gray-300'} hover:text-yellow-600`}
                        title={item.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <FaStar size={12} />
                      </button>
                      <div>
                        <div className="font-medium text-gray-900 flex items-center gap-1">
                          {item.symbol}
                          {item.isLive && (
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                          )}
                          {item.isPopular && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded">
                              Popular
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{item.displayName || item.name}</div>
                        <div className="text-xs text-gray-400">{item.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-right py-3 px-6 font-mono text-gray-900">
                    <div className="flex items-center justify-end gap-1">
                      <span className={item.isLive ? 'transition-colors duration-500 font-semibold' : 'font-semibold'}>
                        {formatPriceDisplay(item.price, item.symbol)}
                      </span>
                      {item.isLive && <span className="ml-1 text-xs text-blue-600">●</span>}
                    </div>
                  </td>
                  <td className="text-right py-3 px-6 font-mono text-gray-900">
                    <div className="flex items-center justify-end gap-1">
                      <span className={item.isLive ? 'transition-colors duration-500' : ''}>
                        {formatPriceDisplay(item.bid, item.symbol)}
                      </span>
                      {bidChange && <span className="text-xs">{bidChange}</span>}
                      {item.isLive && <span className="ml-1 text-xs text-green-600">●</span>}
                    </div>
                  </td>
                  <td className="text-right py-3 px-6 font-mono text-gray-900">
                    <div className="flex items-center justify-end gap-1">
                      <span className={item.isLive ? 'transition-colors duration-500' : ''}>
                        {formatPriceDisplay(item.ask, item.symbol)}
                      </span>
                      {askChange && <span className="text-xs">{askChange}</span>}
                      {item.isLive && <span className="ml-1 text-xs text-red-600">●</span>}
                    </div>
                  </td>
                  <td className="text-right py-3 px-6">
                    <div className="font-mono text-gray-600">{formatPrice(metrics.spreadValue, 2)}</div>
                    <div className="text-xs text-gray-500">{formatPrice(metrics.spreadPercent, 3)}%</div>
                  </td>
                  <td className="text-right py-3 px-6">
                    <div className={`font-mono ${metrics.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {metrics.isPositive ? '+' : ''}
                      {formatPrice(item.change, 2)}
                    </div>
                    <div className={`text-xs ${metrics.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {metrics.isPositive ? '+' : ''}
                      {formatPrice(item.changePercent, 2)}%
                    </div>
                  </td>
                  <td className="text-center py-3 px-6">
                    <span className={`text-xs px-2 py-1 rounded-full ${getTrendColor(item.trend)}`}>
                      {item.trend}
                    </span>
                  </td>
                  <td className="text-center py-3 px-6">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => setSelectedSymbol(item.symbol)}
                        className="flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs transition-colors"
                        title="View Details"
                      >
                        <FaEye size={10} />
                        Details
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-600">Total Symbols</p>
            <p className="font-medium text-gray-900">{filteredData.length}</p>
          </div>
          <div>
            <p className="text-gray-600">Live Feeds</p>
            <p className="font-medium text-green-600">{getLiveSymbolsCount()}</p>
          </div>
          <div>
            <p className="text-gray-600">Subscribed</p>
            <p className="font-medium text-blue-600">{subscribedSymbols.length}</p>
          </div>
          <div>
            <p className="text-gray-600">Last Update</p>
            <p className="font-medium text-gray-900">{lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}</p>
          </div>
        </div>
      </div>

      {selectedSymbol && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Symbol Details</h3>
                <button
                  onClick={() => setSelectedSymbol(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaEye className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="p-6">
              {(() => {
                const item = marketData.find((i) => i.symbol === selectedSymbol);
                if (!item) return <p>Symbol not found</p>;

                return (
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Basic Information</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Symbol:</span>
                            <span className="font-medium">{item.symbol}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Name:</span>
                            <span className="font-medium">{item.name}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Category:</span>
                            <span className="font-medium">{item.category}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Status:</span>
                            <span className="font-medium">{item.isLive ? 'Live' : 'Static'}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">Current Prices</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Bid:</span>
                            <span className="font-mono font-medium">{formatPriceDisplay(item.bid, item.symbol)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Ask:</span>
                            <span className="font-mono font-medium">{formatPriceDisplay(item.ask, item.symbol)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Spread:</span>
                            <span className="font-mono font-medium">{formatPrice(item.ask - item.bid, 2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Change:</span>
                            <span className={`font-medium ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {item.change >= 0 ? '+' : ''}
                              {formatPrice(item.change, 2)} ({item.change >= 0 ? '+' : ''}
                              {formatPrice(item.changePercent, 2)}%)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Trading Information</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Min Lot Size:</span>
                            <span>{item.minLotSize}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Max Lot Size:</span>
                            <span>{item.maxLotSize}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Pip Value:</span>
                            <span>${item.pipValue}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Price Precision:</span>
                            <span>{item.pricePrecision}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Min Spread:</span>
                            <span>{item.minSpread}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Max Spread:</span>
                            <span>{item.maxSpread}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Volume Precision:</span>
                            <span>{item.volumePrecision}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Tradable:</span>
                            <span className={item.isTradable ? 'text-green-600' : 'text-red-600'}>
                              {item.isTradable ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Market Data</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">High:</span>
                            <span className="font-mono">{formatPrice(item.high, 2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Low:</span>
                            <span className="font-mono">{formatPrice(item.low, 2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Support:</span>
                            <span className="font-mono">{formatPrice(item.support, 2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Resistance:</span>
                            <span className="font-mono">{formatPrice(item.resistance, 2)}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Trend:</span>
                            <span className={getTrendColor(item.trend)}>{item.trend}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Volume:</span>
                            <span>{item.volume.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Last Update:</span>
                            <span>{item.lastUpdate}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Additional Information</h4>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">External Symbol:</span>
                            <span>{item.externalSymbol}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Data Provider:</span>
                            <span>{item.dataProvider}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-600">Popular:</span>
                            <span className={item.isPopular ? 'text-yellow-600' : 'text-gray-600'}>
                              {item.isPopular ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-600">Live Data:</span>
                            <span className={item.isLive ? 'text-green-600' : 'text-gray-600'}>
                              {item.isLive ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
