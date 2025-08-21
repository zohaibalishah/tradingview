import React, { useState, useEffect } from 'react';
import { FaSync, FaEye, FaCheckCircle, FaTimesCircle, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'react-hot-toast';
import api from '../../utils/api';

export default function SubscriptionManagement() {
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchSubscriptionStatus();
    
    // Set up periodic refresh every 30 seconds
    const interval = setInterval(() => {
      fetchSubscriptionStatus();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchSubscriptionStatus = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/symbols/subscription-status');
      if (response.data.status === 1) {
        setSubscriptionStatus(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      toast.error('Failed to fetch subscription status');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshSubscriptions = async () => {
    try {
      setRefreshing(true);
      const response = await api.post('/admin/symbols/refresh-subscriptions');
      if (response.data.status === 1) {
        setSubscriptionStatus(response.data.data);
        toast.success('Symbol subscriptions refreshed successfully');
      }
    } catch (error) {
      console.error('Error refreshing subscriptions:', error);
      toast.error('Failed to refresh subscriptions');
    } finally {
      setRefreshing(false);
    }
  };

  const getConnectionStatusIcon = () => {
    if (!subscriptionStatus) return <FaExclamationTriangle className="text-gray-400" />;
    
    if (subscriptionStatus.isConnected) {
      return <FaCheckCircle className="text-green-500" />;
    } else {
      return <FaTimesCircle className="text-red-500" />;
    }
  };

  const getConnectionStatusText = () => {
    if (!subscriptionStatus) return 'Unknown';
    return subscriptionStatus.isConnected ? 'Connected' : 'Disconnected';
  };

  const getConnectionStatusColor = () => {
    if (!subscriptionStatus) return 'text-gray-500';
    return subscriptionStatus.isConnected ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Subscription Management</h2>
          <p className="text-gray-600 mt-1">Manage WebSocket symbol subscriptions</p>
        </div>
        <button
          onClick={handleRefreshSubscriptions}
          disabled={refreshing}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <FaSync className={`text-sm ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Subscriptions'}
        </button>
      </div>

             {/* Status Cards */}
       <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
         {/* Connection Status */}
         <div className="bg-white p-6 rounded-lg shadow-sm border">
           <div className="flex items-center justify-between">
             <div>
               <h3 className="text-lg font-semibold text-gray-900">Connection Status</h3>
               <p className={`text-sm font-medium ${getConnectionStatusColor()}`}>
                 {getConnectionStatusText()}
               </p>
             </div>
             <div className="text-2xl">
               {getConnectionStatusIcon()}
             </div>
           </div>
         </div>

         {/* Total Subscriptions */}
         <div className="bg-white p-6 rounded-lg shadow-sm border">
           <div className="flex items-center justify-between">
             <div>
               <h3 className="text-lg font-semibold text-gray-900">Active Subscriptions</h3>
               <p className="text-2xl font-bold text-blue-600">
                 {subscriptionStatus?.totalSubscriptions || 0}
               </p>
             </div>
             <div className="text-2xl text-blue-500">
               <FaEye />
             </div>
           </div>
         </div>

         {/* Callbacks */}
         <div className="bg-white p-6 rounded-lg shadow-sm border">
           <div className="flex items-center justify-between">
             <div>
               <h3 className="text-lg font-semibold text-gray-900">Event Callbacks</h3>
               <p className="text-2xl font-bold text-purple-600">
                 {subscriptionStatus?.callbacks || 0}
               </p>
             </div>
             <div className="text-2xl text-purple-500">
               <FaCheckCircle />
             </div>
           </div>
         </div>

         {/* Last Updated */}
         <div className="bg-white p-6 rounded-lg shadow-sm border">
           <div className="flex items-center justify-between">
             <div>
               <h3 className="text-lg font-semibold text-gray-900">Last Updated</h3>
               <p className="text-sm font-medium text-gray-600">
                 {subscriptionStatus ? new Date().toLocaleTimeString() : 'Never'}
               </p>
             </div>
             <div className="text-2xl text-gray-500">
               <FaSync />
             </div>
           </div>
         </div>
       </div>

             {/* Quick Actions */}
       <div className="bg-white rounded-lg shadow-sm border p-6">
         <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
         <div className="flex flex-wrap gap-4">
           <button
             onClick={fetchSubscriptionStatus}
             className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
           >
             <FaSync className="text-sm" />
             Refresh Status
           </button>
           <button
             onClick={handleRefreshSubscriptions}
             disabled={refreshing}
             className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-colors"
           >
             <FaSync className={`text-sm ${refreshing ? 'animate-spin' : ''}`} />
             {refreshing ? 'Refreshing...' : 'Sync Subscriptions'}
           </button>
         </div>
       </div>

       {/* Subscriptions List */}
       {subscriptionStatus && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">
              Current Subscriptions ({subscriptionStatus.subscriptions?.length || 0})
            </h3>
          </div>
          
          {subscriptionStatus.subscriptions && subscriptionStatus.subscriptions.length > 0 ? (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {subscriptionStatus.subscriptions.map((symbol, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="font-mono text-sm text-gray-700">{symbol}</span>
                    <FaCheckCircle className="text-green-500 text-sm" />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              <FaExclamationTriangle className="text-2xl mx-auto mb-2" />
              <p>No active subscriptions</p>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <div className="inline-flex items-center gap-2">
            <FaSync className="animate-spin text-blue-500" />
            <span className="text-gray-600">Loading subscription status...</span>
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && !subscriptionStatus && (
        <div className="text-center py-8">
          <FaExclamationTriangle className="text-2xl text-red-500 mx-auto mb-2" />
          <p className="text-gray-600">Failed to load subscription status</p>
          <button
            onClick={fetchSubscriptionStatus}
            className="mt-2 text-blue-600 hover:text-blue-700 underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
