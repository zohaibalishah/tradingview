import React, { useState, useEffect, useMemo } from 'react';
import { FaSort, FaSortUp, FaSortDown, FaEye, FaEyeSlash } from 'react-icons/fa';
import {
  useGetOpenTrades,
  useCloseTrade,
} from '../../services/trade.service';
import { useQueryClient } from '@tanstack/react-query';
import { useLivePrices } from '../../hooks/useLivePrices';
import toast from 'react-hot-toast';

export default function TradeTable({ onTradeSelect, selectedTradeId }) {
  const [sortField, setSortField] = useState('openTime');
  const [sortDirection, setSortDirection] = useState('desc');
  const queryClient = useQueryClient();

  const { data: trades = [], error, isLoading } = useGetOpenTrades();
  const closeTradeMutation = useCloseTrade();

  // Use shared live prices hook
  const {
    calculateLiveProfits,
    getCurrentPrice,
    getCurrentProfit,
    isPriceLive,
    hasLivePrices
  } = useLivePrices();

  // Calculate live profits when trades change
  useEffect(() => {
    if (trades.length > 0) {
      calculateLiveProfits(trades);
    }
  }, [trades, calculateLiveProfits]);

  const handleCloseTrade = (tradeId) => {
    closeTradeMutation.mutate(tradeId, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['openTrades'] });
        toast.success('Trade closed successfully.');
      },
      onError: (error) => {
        console.error('Error closing trade:', error);
        const errorMessage = error.response?.data?.message || 'Failed to close trade.';
        toast.error(errorMessage);
      },
    });
  };

  const handleTradeClick = (trade) => {
    if (onTradeSelect) {
      // If clicking the same trade that's already selected, deselect it
      if (selectedTradeId === trade.id) {
        onTradeSelect(null); // Pass null to clear selection
      } else {
        onTradeSelect(trade); // Select the new trade
      }
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection((prevDirection) =>
        prevDirection === 'asc' ? 'desc' : 'asc'
      );
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field) => {
    if (sortField !== field) return <FaSort className="text-gray-400" />;
    return sortDirection === 'asc' ? (
      <FaSortUp className="text-primary-600" />
    ) : (
      <FaSortDown className="text-primary-600" />
    );
  };

  const formatPrice = (price, symbol) => {
    if (price == null || isNaN(price)) return '-';
    return symbol === 'OANDA:XAU_USD' ? Number(price).toFixed(2) : Number(price).toFixed(4);
  };

  const formatVolume = (volume) => {
    return volume.toFixed(2);
  };

  const formatProfit = (profit) => {
    if (profit == null || isNaN(profit)) return '-';
    return profit.toFixed(4);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const closeTrade = (tradeId) => {
    handleCloseTrade(tradeId);
  };

  // Sort trades based on current sort field and direction
  const sortedTrades = useMemo(() => {
    if (!trades || trades.length === 0) return [];
    
    return [...trades].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      // Handle special cases
      if (sortField === 'currentPrice') {
        aValue = getCurrentPrice(a);
        bValue = getCurrentPrice(b);
      } else if (sortField === 'floatingProfit') {
        aValue = getCurrentProfit(a);
        bValue = getCurrentProfit(b);
      }
      
      // Handle null/undefined values
      if (aValue == null) aValue = sortDirection === 'asc' ? Infinity : -Infinity;
      if (bValue == null) bValue = sortDirection === 'asc' ? Infinity : -Infinity;
      
      // Convert to numbers for numeric fields
      if (['volume', 'entryPrice', 'stopLoss', 'takeProfit', 'currentPrice', 'floatingProfit'].includes(sortField)) {
        aValue = parseFloat(aValue) || 0;
        bValue = parseFloat(bValue) || 0;
      }
      
      // String comparison for text fields
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0;
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0;
      }
    });
  }, [trades, sortField, sortDirection, getCurrentPrice, getCurrentProfit]);

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading trades</div>;

  return (
    <div className="bg-white rounded-xl shadow-soft border border-gray-100 mb-10">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          {/* <div>
            <h3 className="text-lg font-semibold text-gray-900">Open Trades</h3>
            <p className="text-sm text-gray-500 mt-1">
              Click on any trade row to view it on the chart. Click again to remove.
            </p>
          </div> */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              Total: {trades.length} trades
            </span>
            <div className="flex items-center gap-1 text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-600">Live prices</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead className="bg-gray-50">
            <tr>
              {[
                'symbol',
                'id',
                'openTime',
                'side',
                'volume',
                'entryPrice',
                'stopLoss',
                'takeProfit',
                'currentPrice',
                'floatingProfit',
              ].map((field) => (
                <th
                  key={field}
                  className={`px-4 py-3 text-${
                    field === 'volume' ||
                    field === 'entryPrice' ||
                    field === 'stopLoss' ||
                    field === 'takeProfit' ||
                    field === 'currentPrice' ||
                    field === 'floatingProfit'
                      ? 'right'
                      : 'left'
                  } font-medium text-gray-600 cursor-pointer`}
                  onClick={() => handleSort(field)}
                >
                  <div
                    className={`flex items-center ${
                      field === 'volume' ||
                      field === 'entryPrice' ||
                      field === 'stopLoss' ||
                      field === 'takeProfit' ||
                      field === 'currentPrice' ||
                      field === 'floatingProfit'
                        ? 'justify-end'
                        : ''
                    } gap-1`}
                  >
                    {field === 'id' ? 'Ticket' : 
                     field === 'openTime' ? 'Time' :
                     field === 'side' ? 'Type' :
                     field === 'entryPrice' ? 'Price' :
                     field === 'currentPrice' ? 'Current' :
                     field === 'floatingProfit' ? 'Profit' :
                     field.charAt(0).toUpperCase() + field.slice(1)}
                    {getSortIcon(field)}
                  </div>
                </th>
              ))}
              <th className="px-4 py-3 text-right font-medium text-gray-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTrades.map((trade) => {
              const currentPrice = getCurrentPrice(trade);
              const currentProfit = getCurrentProfit(trade);
              const isLive = isPriceLive(trade);
              
              return (
                <tr
                  key={trade.id}
                  className={`border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer ${
                    selectedTradeId === trade.id 
                      ? 'bg-blue-50 border-l-4 border-l-blue-500 shadow-sm hover:bg-blue-100' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => handleTradeClick(trade)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">
                        {trade.symbol}
                      </span>
                      {isLive && (
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      )}
                      {selectedTradeId === trade.id && (
                        <FaEyeSlash className="text-blue-500 text-sm" title="Deselect trade" />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{trade.id}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(trade.openTime)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        trade.side === 'BUY'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {trade.side}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-900">
                    {formatVolume(trade.volume)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-900">
                    {formatPrice(trade.entryPrice, trade.symbol)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-600">
                    {formatPrice(trade.stopLoss, trade.symbol)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-gray-600">
                    {formatPrice(trade.takeProfit, trade.symbol)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-mono text-gray-900">
                      {formatPrice(currentPrice, trade.symbol)}
                      {isLive && (
                        <div className="w-1 h-1 bg-green-500 rounded-full inline-block ml-1 animate-pulse"></div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`font-mono font-medium ${
                        currentProfit >= 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      {formatProfit(currentProfit)}
                      {isLive && (
                        <div className="w-1 h-1 bg-green-500 rounded-full inline-block ml-1 animate-pulse"></div>
                      )}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent row click
                        closeTrade(trade.id);
                      }}
                      className="text-red-600 hover:text-red-800"
                    >
                      Close
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Account Summary */}
      {/* <div className="px-6 py-4 bg-blue-50 border-t border-gray-200">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 text-sm">
          {[
            { label: 'Balance', value: '99,989.65' },
            { label: 'Equity', value: '99,984.83' },
            { label: 'Margin', value: '33.44' },
            { label: 'Free Margin', value: '99,951.39' },
            { label: 'Level', value: '298,997.70%' },
            { label: 'Profit', value: '-4.82 USD', color: 'text-red-600' },
          ].map((item) => (
            <div key={item.label}>
              <span className="text-gray-600">{item.label}:</span>
              <span
                className={`ml-2 font-mono font-medium text-gray-900 ${
                  item.color || ''
                }`}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div> */}
    </div>
  );
}
