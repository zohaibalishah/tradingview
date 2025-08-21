import React, { useState, useEffect } from 'react';
import { FaChartLine,  FaArrowDown, FaDollarSign } from 'react-icons/fa';
import { useGetOpenTrades } from '../../services/trade.service';
import { useLivePrices } from '../../hooks/useLivePrices';

export default function TradeSummary() {
  const { data: trades = [] } = useGetOpenTrades();
  
  // Use shared live prices hook
  const {
    calculateLiveProfits,
    getCurrentProfit,
    hasLivePrices
  } = useLivePrices();

  // Calculate live profits when trades change
  useEffect(() => {
    if (trades.length > 0) {
      calculateLiveProfits(trades);
    }
  }, [trades, calculateLiveProfits]);

  // Calculate summary statistics
  const summary = React.useMemo(() => {
    let totalProfit = 0;
    let totalVolume = 0;
    let profitableTrades = 0;
    let losingTrades = 0;
    let totalTrades = trades.length;

    trades.forEach(trade => {
      const profit = getCurrentProfit(trade) || 0;
      
      totalProfit += profit;
      totalVolume += trade.volume;
      
      if (profit > 0) {
        profitableTrades++;
      } else if (profit < 0) {
        losingTrades++;
      }
    });

    const profitPercentage = totalVolume > 0 ? (totalProfit / totalVolume) * 100 : 0;

    return {
      totalProfit,
      totalVolume,
      profitableTrades,
      losingTrades,
      totalTrades,
      profitPercentage,
      isPositive: totalProfit >= 0
    };
  }, [trades, getCurrentProfit]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (percentage) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  return (
    <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Trade Summary</h3>
        <div className="flex items-center gap-2">
          {hasLivePrices() && (
            <div className="flex items-center gap-1 text-xs">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-gray-600">Live</span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Profit/Loss */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <FaDollarSign className={`w-4 h-4 mr-1 ${summary.isPositive ? 'text-green-500' : 'text-red-500'}`} />
            <span className="text-sm font-medium text-gray-600">Total P&L</span>
          </div>
          <div className={`text-xl font-bold ${summary.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(summary.totalProfit)}
          </div>
          <div className={`text-xs ${summary.isPositive ? 'text-green-500' : 'text-red-500'}`}>
            {formatPercentage(summary.profitPercentage)}
          </div>
        </div>

        {/* Total Volume */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <FaChartLine className="w-4 h-4 mr-1 text-blue-500" />
            <span className="text-sm font-medium text-gray-600">Volume</span>
          </div>
          <div className="text-xl font-bold text-gray-900">
            {summary.totalVolume.toFixed(2)}
          </div>
          <div className="text-xs text-gray-500">
            {summary.totalTrades} trades
          </div>
        </div>

        {/* Profitable Trades */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            {/* <FaTrendingUp className="w-4 h-4 mr-1 text-green-500" /> */}
            <span className="text-sm font-medium text-gray-600">Profitable</span>
          </div>
          <div className="text-xl font-bold text-green-600">
            {summary.profitableTrades}
          </div>
          <div className="text-xs text-gray-500">
            {summary.totalTrades > 0 ? ((summary.profitableTrades / summary.totalTrades) * 100).toFixed(1) : 0}%
          </div>
        </div>

        {/* Losing Trades */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-2">
            <FaArrowDown className="w-4 h-4 mr-1 text-red-500" />
            <span className="text-sm font-medium text-gray-600">Losing</span>
          </div>
          <div className="text-xl font-bold text-red-600">
            {summary.losingTrades}
          </div>
          <div className="text-xs text-gray-500">
            {summary.totalTrades > 0 ? ((summary.losingTrades / summary.totalTrades) * 100).toFixed(1) : 0}%
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {summary.totalTrades > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Win Rate</span>
            <span>{((summary.profitableTrades / summary.totalTrades) * 100).toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(summary.profitableTrades / summary.totalTrades) * 100}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}
