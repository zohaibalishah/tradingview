import React, { useState } from 'react';
import {
  FaWallet,
  FaChartBar,
  FaChartLine,
  FaStar,
} from 'react-icons/fa';

import { useUser } from '../services/auth';
import Layout from '../components/Layout';
import TradingChart from '../components/TradingChart';
import ChartSection from '../components/dashboard/ChartSection';
import WatchlistPanel from '../components/dashboard/WatchlistPanel';
import TradeTable from '../components/dashboard/TradeTable';

export default function DashboardPage() {
  const { data: user } = useUser();
  const [isWatchlistCollapsed, setIsWatchlistCollapsed] = useState(false);

  // Stats data
  const stats = [
    {
      title: 'Total Balance',
      value: '$99,989.65',
      change: '+12.5%',
      changeType: 'positive',
      icon: FaWallet,
      color: 'bg-green-500',
    },
    {
      title: 'Active Trades',
      value: '3',
      change: '+1',
      changeType: 'positive',
      icon: FaChartBar,
      color: 'bg-blue-500',
    },
    {
      title: 'Portfolio Value',
      value: '$99,984.83',
      change: '-0.005%',
      changeType: 'negative',
      icon: FaChartLine,
      color: 'bg-purple-500',
    },
    {
      title: 'Total Profit',
      value: '-$4.82',
      change: '-0.005%',
      changeType: 'negative',
      icon: FaStar,
      color: 'bg-orange-500',
    },
  ];

  const toggleWatchlist = () => {
    setIsWatchlistCollapsed(!isWatchlistCollapsed);
  };

  return (
    <Layout title="Trading Dashboard">

      {/* Main Trading Interface */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-4">
        <div className={`${isWatchlistCollapsed ? 'lg:col-span-4' : 'lg:col-span-3'} `}>
        <TradingChart />
        </div>
        
        {/* Watchlist Panel - Takes 1 column when visible, hidden when collapsed */}
        {!isWatchlistCollapsed && (
          <div className="lg:col-span-1">
            <WatchlistPanel 
              isCollapsed={isWatchlistCollapsed} 
              onToggle={toggleWatchlist} 
            />
          </div>
        )} 
      </div>

      {/* Collapsed Watchlist Button - Only show when watchlist is collapsed */}
      {isWatchlistCollapsed && (
        <div className="mb-6">
          <WatchlistPanel 
            isCollapsed={isWatchlistCollapsed} 
            onToggle={toggleWatchlist} 
          />
        </div>
      )} 

    </Layout>
  );
}
