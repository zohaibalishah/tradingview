import React, { useState } from 'react';
import { FaEdit, FaTrash, FaEye, FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';

export default function TradeTable() {
  const [sortField, setSortField] = useState('time');
  const [sortDirection, setSortDirection] = useState('desc');

  // Mock trade data based on the image
  const trades = [
    {
      symbol: 'XAUUSD',
      ticket: '4352016138',
      time: '08.15 10:33:05',
      type: 'buy',
      volume: 0.01,
      price: 3344.30,
      stopLoss: null,
      takeProfit: null,
      currentPrice: 3339.48,
      swap: null,
      profit: -4.82,
      comment: ''
    },
    {
      symbol: 'EURUSD',
      ticket: '4352016139',
      time: '08.15 09:15:22',
      type: 'sell',
      volume: 0.05,
      price: 1.0856,
      stopLoss: 1.0900,
      takeProfit: 1.0800,
      currentPrice: 1.0858,
      swap: -0.12,
      profit: -1.00,
      comment: 'Manual trade'
    },
    {
      symbol: 'GBPUSD',
      ticket: '4352016140',
      time: '08.14 16:45:33',
      type: 'buy',
      volume: 0.02,
      price: 1.2654,
      stopLoss: 1.2600,
      takeProfit: 1.2700,
      currentPrice: 1.2657,
      swap: -0.08,
      profit: 0.60,
      comment: 'Trend following'
    }
  ];

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <FaSort className="text-gray-400" />;
    return sortDirection === 'asc' ? <FaSortUp className="text-primary-600" /> : <FaSortDown className="text-primary-600" />;
  };

  const formatPrice = (price, symbol) => {
    if (!price) return '-';
    return symbol === 'XAUUSD' ? price.toFixed(2) : price.toFixed(4);
  };

  const formatVolume = (volume) => {
    return volume.toFixed(2);
  };

  const formatProfit = (profit) => {
    if (!profit) return '-';
    return profit.toFixed(2);
  };

  return (
    <div className="bg-white rounded-xl shadow-soft border border-gray-100">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Open Trades</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Total: {trades.length} trades</span>
            <button className="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors">
              Close All
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('symbol')}>
                <div className="flex items-center gap-1">
                  Symbol
                  {getSortIcon('symbol')}
                </div>
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('ticket')}>
                <div className="flex items-center gap-1">
                  Ticket
                  {getSortIcon('ticket')}
                </div>
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('time')}>
                <div className="flex items-center gap-1">
                  Time
                  {getSortIcon('time')}
                </div>
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('type')}>
                <div className="flex items-center gap-1">
                  Type
                  {getSortIcon('type')}
                </div>
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('volume')}>
                <div className="flex items-center justify-end gap-1">
                  Volume
                  {getSortIcon('volume')}
                </div>
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('price')}>
                <div className="flex items-center justify-end gap-1">
                  Price
                  {getSortIcon('price')}
                </div>
              </th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">S/L</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">T/P</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Price</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600">Swap</th>
              <th className="px-4 py-3 text-right font-medium text-gray-600 cursor-pointer" onClick={() => handleSort('profit')}>
                <div className="flex items-center justify-end gap-1">
                  Profit
                  {getSortIcon('profit')}
                </div>
              </th>
              <th className="px-4 py-3 text-left font-medium text-gray-600">Comment</th>
              <th className="px-4 py-3 text-center font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade, index) => (
              <tr key={trade.ticket} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900">{trade.symbol}</span>
                </td>
                <td className="px-4 py-3 text-gray-600">{trade.ticket}</td>
                <td className="px-4 py-3 text-gray-600">{trade.time}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    trade.type === 'buy' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {trade.type}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-900">{formatVolume(trade.volume)}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-900">{formatPrice(trade.price, trade.symbol)}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-600">{formatPrice(trade.stopLoss, trade.symbol)}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-600">{formatPrice(trade.takeProfit, trade.symbol)}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-900">{formatPrice(trade.currentPrice, trade.symbol)}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-600">{formatProfit(trade.swap)}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-mono font-medium ${
                    trade.profit >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatProfit(trade.profit)}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 max-w-32 truncate">{trade.comment}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-center gap-2">
                    <button className="p-1 text-gray-400 hover:text-primary-600 transition-colors" title="Edit">
                      <FaEdit size={14} />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-red-600 transition-colors" title="Close">
                      <FaTrash size={14} />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="View Details">
                      <FaEye size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Account Summary */}
      <div className="px-6 py-4 bg-blue-50 border-t border-gray-200">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Balance:</span>
            <span className="ml-2 font-mono font-medium text-gray-900">99,989.65</span>
          </div>
          <div>
            <span className="text-gray-600">Equity:</span>
            <span className="ml-2 font-mono font-medium text-gray-900">99,984.83</span>
          </div>
          <div>
            <span className="text-gray-600">Margin:</span>
            <span className="ml-2 font-mono font-medium text-gray-900">33.44</span>
          </div>
          <div>
            <span className="text-gray-600">Free Margin:</span>
            <span className="ml-2 font-mono font-medium text-gray-900">99,951.39</span>
          </div>
          <div>
            <span className="text-gray-600">Level:</span>
            <span className="ml-2 font-mono font-medium text-gray-900">298,997.70%</span>
          </div>
          <div>
            <span className="text-gray-600">Profit:</span>
            <span className="ml-2 font-mono font-medium text-red-600">-4.82 USD</span>
          </div>
        </div>
      </div>
    </div>
  );
}
