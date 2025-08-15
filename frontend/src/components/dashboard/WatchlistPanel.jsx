import React, { useState } from 'react';
import { FaSearch, FaStar, FaStarHalf, FaArrowUp, FaArrowDown, FaChevronLeft, FaChevronRight } from 'react-icons/fa';

export default function WatchlistPanel({ isCollapsed, onToggle }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState(['XAUUSD', 'EURUSD', 'GBPUSD']);

  // Mock market data
  const marketData = [
    { symbol: 'XAUUSD', name: 'Gold', bid: 3339.48, ask: 3340.12, change: -4.82, changePercent: -0.14, isFavorite: true },
    { symbol: 'EURUSD', name: 'Euro/Dollar', bid: 1.0856, ask: 1.0858, change: 0.0023, changePercent: 0.21, isFavorite: true },
    { symbol: 'GBPUSD', name: 'Pound/Dollar', bid: 1.2654, ask: 1.2657, change: -0.0012, changePercent: -0.09, isFavorite: true },
    { symbol: 'USDJPY', name: 'Dollar/Yen', bid: 148.23, ask: 148.25, change: 0.45, changePercent: 0.30, isFavorite: false },
    { symbol: 'USDCAD', name: 'Dollar/Canadian', bid: 1.3542, ask: 1.3545, change: -0.0034, changePercent: -0.25, isFavorite: false },
    { symbol: 'AUDUSD', name: 'Australian/Dollar', bid: 0.6589, ask: 0.6592, change: 0.0012, changePercent: 0.18, isFavorite: false },
    { symbol: 'NZDUSD', name: 'New Zealand/Dollar', bid: 0.6123, ask: 0.6126, change: -0.0008, changePercent: -0.13, isFavorite: false },
    { symbol: 'USDCHF', name: 'Dollar/Swiss', bid: 0.8923, ask: 0.8926, change: 0.0015, changePercent: 0.17, isFavorite: false },
  ];

  const filteredData = marketData.filter(item =>
    item.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleFavorite = (symbol) => {
    setFavorites(prev => 
      prev.includes(symbol) 
        ? prev.filter(s => s !== symbol)
        : [...prev, symbol]
    );
  };

  if (isCollapsed) {
    return (
      <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-2">
        <button
          onClick={onToggle}
          className="w-full flex items-center justify-center p-2 text-gray-600 hover:text-primary-600 hover:bg-gray-50 rounded-lg transition-colors"
          title="Show Watchlist"
        >
          <FaChevronRight className="text-lg" />
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-4 h-96 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Watchlist</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
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
          placeholder="Search symbols..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
        />
      </div>

      {/* Market Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left py-2 font-medium text-gray-600">Symbol</th>
              <th className="text-right py-2 font-medium text-gray-600">Bid</th>
              <th className="text-right py-2 font-medium text-gray-600">Ask</th>
              <th className="text-right py-2 font-medium text-gray-600">Change</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item, index) => (
              <tr 
                key={item.symbol} 
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
              >
                <td className="py-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleFavorite(item.symbol)}
                      className="text-yellow-500 hover:text-yellow-600"
                    >
                      {favorites.includes(item.symbol) ? <FaStar size={12} /> : <FaStarHalf size={12} />}
                    </button>
                    <div>
                      <div className="font-medium text-gray-900">{item.symbol}</div>
                      <div className="text-xs text-gray-500">{item.name}</div>
                    </div>
                  </div>
                </td>
                <td className="text-right py-2 font-mono text-gray-900">
                  {item.bid.toFixed(item.symbol === 'XAUUSD' ? 2 : 4)}
                </td>
                <td className="text-right py-2 font-mono text-gray-900">
                  {item.ask.toFixed(item.symbol === 'XAUUSD' ? 2 : 4)}
                </td>
                <td className="text-right py-2">
                  <div className={`flex items-center justify-end gap-1 ${
                    item.change >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.change >= 0 ? <FaArrowUp size={10} /> : <FaArrowDown size={10} />}
                    <span className="font-mono">
                      {item.change >= 0 ? '+' : ''}{item.change.toFixed(item.symbol === 'XAUUSD' ? 2 : 4)}
                    </span>
                  </div>
                  <div className={`text-xs ${
                    item.changePercent >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {item.changePercent >= 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
  
    </div>
  );
}
