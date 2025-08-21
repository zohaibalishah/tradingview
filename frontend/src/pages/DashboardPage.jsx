import React, { useState, useEffect } from 'react';
import {
  FaWallet,
  FaChartBar,
  FaChartLine,
  FaStar,
  FaExclamationTriangle,
  FaSun,
  FaMoon,
} from 'react-icons/fa';

import { useUser } from '../services/auth';
import Layout from '../components/layouts/Layout';
import TradingChart from '../components/TradingChart';
import WatchlistPanel from '../components/dashboard/WatchlistPanel';
import TradeTable from '../components/dashboard/TradeTable';
import TradeSummary from '../components/dashboard/TradeSummary';
import TradeButton from '../components/TradeButton';

export default function DashboardPage() {
  const { data: user } = useUser();
  const [isWatchlistCollapsed, setIsWatchlistCollapsed] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [chartTheme, setChartTheme] = useState('light');

  const toggleChartTheme = () => {
    setChartTheme((prevTheme) => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  const handleTradeSelect = (trade) => {
    setSelectedTrade(trade);
  };

  const handleClearSelection = () => {
    setSelectedTrade(null);
  };

  const toggleWatchlist = () => {
    setIsWatchlistCollapsed(!isWatchlistCollapsed);
  };

  return (
    <Layout title="Trading Dashboard">
      <div className="flex flex-col lg:flex-row gap-6 mb-4">
        <div
          className={`${isWatchlistCollapsed ? 'w-full' : 'lg:w-2/3'} `}
        >
          <div className="relative">
            <div className="absolute flex gap-3  right-1/3 z-10 ">
              <button
                onClick={toggleChartTheme}
                className={`p-2 rounded-lg shadow-lg transition-all duration-200 ${
                  chartTheme === 'light'
                    ? 'bg-gray-800 text-white hover:bg-gray-700'
                    : 'bg-white text-gray-800 hover:bg-gray-100'
                }`}
                title={`Switch to ${chartTheme === 'light' ? 'dark' : 'light'} mode`}
              >
                {chartTheme === 'light' ? (
                  <FaMoon className="w-4 h-4" />
                ) : (
                  <FaSun className="w-4 h-4" />
                )}
              </button>

              <div className="flex items-center justify-center">
              <TradeButton />
            </div>
            </div>
          
            <TradingChart selectedTrade={selectedTrade} theme={chartTheme} />
            {selectedTrade && (
              <button
                onClick={handleClearSelection}
                className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600 z-10"
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>
        <div className={`${isWatchlistCollapsed ? '' : 'lg:w-1/3'} flex-1`}>
          <div>
            <WatchlistPanel
              isCollapsed={isWatchlistCollapsed}
              onToggleCollapse={() =>
                setIsWatchlistCollapsed(!isWatchlistCollapsed)
              }
            />
          </div>
        </div> 
      </div>

   <TradeTable
        onTradeSelect={handleTradeSelect}
        selectedTradeId={selectedTrade?.id}
      /> 
      
 
    </Layout>
  );
}
