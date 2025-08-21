import React, { useState, useEffect } from 'react';
import { FaUsers, FaChartLine, FaDollarSign, FaShieldAlt, FaClock, FaCheckCircle, FaExclamationTriangle, FaGem, FaCoins } from 'react-icons/fa';
import api from '../../utils/api';
import AdminLayout from '../../components/layouts/AdminLayout';
import AdminWatchlist from '../../components/admin/AdminWatchlist';

export default function AdminOverview() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalTrades: 0,
    totalVolume: 0,
    activeUsers: 0,
    pendingDeposits: 0,
    pendingWithdrawals: 0,
    totalCategories: 0,
    totalSymbols: 0,
    goldSymbols: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      
      // Fetch statistics
      const statsResponse = await api.get('/admin/stats');
      if (statsResponse.data.status === 1) {
        setStats(statsResponse.data.data);
      }
      
      // Fetch categories count
      try {
        const categoriesResponse = await api.get('/admin/categories');
        if (categoriesResponse.data.status === 1) {
          setStats(prev => ({ ...prev, totalCategories: categoriesResponse.data.data.pagination.totalItems }));
        }
      } catch (error) {
        console.error('Error fetching categories:', error);
      }
      
      // Fetch symbols count
      try {
        const symbolsResponse = await api.get('/admin/symbols');
        if (symbolsResponse.data.status === 1) {
          const totalSymbols = symbolsResponse.data.data.pagination.totalItems;
          const goldSymbols = symbolsResponse.data.data.symbols.filter(s => s.baseCurrency === 'XAU').length;
          setStats(prev => ({ 
            ...prev, 
            totalSymbols,
            goldSymbols
          }));
        }
      } catch (error) {
        console.error('Error fetching symbols:', error);
      }
      
      // Fetch recent activity
      const activityResponse = await api.get('/admin/recent-activity');
      if (activityResponse.data.status === 1) {
        setRecentActivity(activityResponse.data.data);
      }
    } catch (error) {
      console.error('Error fetching overview data:', error);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, icon: Icon, color, change }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change && (
            <p className={`text-sm mt-1 ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {change > 0 ? '+' : ''}{change}% from last month
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </div>
  );

  const ActivityItem = ({ activity }) => (
    <div className="flex items-center space-x-3 py-3 border-b border-gray-100 last:border-b-0">
      <div className={`p-2 rounded-full ${activity.type === 'trade' ? 'bg-blue-100' : activity.type === 'user' ? 'bg-green-100' : 'bg-yellow-100'}`}>
        {activity.type === 'trade' && <FaChartLine className="h-4 w-4 text-blue-600" />}
        {activity.type === 'user' && <FaUsers className="h-4 w-4 text-green-600" />}
        {activity.type === 'system' && <FaShieldAlt className="h-4 w-4 text-yellow-600" />}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-gray-900">{activity.title}</p>
        <p className="text-xs text-gray-500">{activity.description}</p>
      </div>
      <div className="text-xs text-gray-400">{activity.time}</div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <AdminLayout title="Admin Overview">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Overview</h1>
          <p className="text-gray-600 mt-1">System statistics and recent activity</p>
        </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Total Users"
          value={stats.totalUsers}
          icon={FaUsers}
          color="bg-blue-500"
          change={12}
        />
        <StatCard
          title="Total Trades"
          value={stats.totalTrades}
          icon={FaChartLine}
          color="bg-green-500"
          change={8}
        />
        <StatCard
          title="Total Volume"
          value={`$${stats.totalVolume.toLocaleString()}`}
          icon={FaDollarSign}
          color="bg-purple-500"
          change={15}
        />
        <StatCard
          title="Active Users"
          value={stats.activeUsers}
          icon={FaClock}
          color="bg-orange-500"
          change={-3}
        />
        <StatCard
          title="Pending Deposits"
          value={stats.pendingDeposits}
          icon={FaCheckCircle}
          color="bg-yellow-500"
        />
                 <StatCard
           title="Pending Withdrawals"
           value={stats.pendingWithdrawals}
           icon={FaExclamationTriangle}
           color="bg-red-500"
         />
         <StatCard
           title="Total Categories"
           value={stats.totalCategories}
           icon={FaGem}
           color="bg-indigo-500"
         />
         <StatCard
           title="Total Symbols"
           value={stats.totalSymbols}
           icon={FaCoins}
           color="bg-yellow-500"
         />
         <StatCard
           title="Gold Symbols"
           value={stats.goldSymbols}
           icon={FaGem}
           color="bg-amber-500"
         />
      </div>
   {/* Gold Watchlist */}
   <AdminWatchlist />
    
      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-6">
          {recentActivity.length > 0 ? (
            <div className="space-y-2">
              {recentActivity.map((activity, index) => (
                <ActivityItem key={index} activity={activity} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <FaClock className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No recent activity</p>
            </div>
          )}
        </div>
      </div>

   
    </div>
    </AdminLayout>
  );
}
