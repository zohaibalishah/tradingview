import React, { useState, useEffect } from 'react';
import { FaClock, FaPlay, FaPause, FaExclamationTriangle } from 'react-icons/fa';
import { useGetMarketStatus, useGetMarketCountdown } from '../../services/market.service';

export default function MarketStatus() {
  const { data: marketStatus, isLoading: statusLoading, error: statusError } = useGetMarketStatus();
  const { data: countdown, isLoading: countdownLoading, error: countdownError } = useGetMarketCountdown();
  const [localTimeRemaining, setLocalTimeRemaining] = useState(null);

  // Local countdown timer for smoother updates
  useEffect(() => {
    if (!countdown?.timeRemaining) {
      setLocalTimeRemaining(null);
      return;
    }

    setLocalTimeRemaining(countdown.timeRemaining);

    const interval = setInterval(() => {
      setLocalTimeRemaining(prev => {
        if (prev <= 0) return 0;
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [countdown?.timeRemaining]);

  const formatTimeRemaining = (seconds) => {
    if (!seconds || seconds <= 0) return 'Now';
    
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  if (statusLoading || countdownLoading) {
    return (
      <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-6 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (statusError || countdownError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <FaExclamationTriangle className="text-red-500 mr-2" />
          <span className="text-red-700">Error loading market status</span>
        </div>
      </div>
    );
  }

  const isOpen = marketStatus?.isOpen || false;
  const eventType = countdown?.eventType;
  const timeRemaining = localTimeRemaining || countdown?.timeRemaining || 0;

  return (
    <div className="bg-white rounded-xl shadow-soft border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Market Status</h3>
        <div className="flex items-center space-x-2">
          <FaClock className="text-gray-400" />
          <span className="text-sm text-gray-500">
            {marketStatus?.currentTimeUTC}
          </span>
        </div>
      </div>

      {/* Market Status Indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className={`text-lg font-semibold ${isOpen ? 'text-green-600' : 'text-red-600'}`}>
            {isOpen ? 'Market Open' : 'Market Closed'}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {isOpen ? (
            <FaPlay className="text-green-500" />
          ) : (
            <FaPause className="text-red-500" />
          )}
        </div>
      </div>

      {/* Countdown Timer */}
      {timeRemaining > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-1">
              {eventType === 'close' ? 'Market closes in:' : 'Market opens in:'}
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {formatTimeRemaining(timeRemaining)}
            </p>
          </div>
        </div>
      )}

      {/* Market Hours */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Market Hours (UTC)</h4>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Open:</span>
            <span className="ml-2 font-medium">{marketStatus?.marketHours?.open}</span>
          </div>
          <div>
            <span className="text-gray-500">Close:</span>
            <span className="ml-2 font-medium">{marketStatus?.marketHours?.close}</span>
          </div>
        </div>
      </div>

      {/* Next Event Times */}
      <div className="border-t border-gray-200 pt-4 mt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Next Events</h4>
        <div className="space-y-2 text-sm">
          {marketStatus?.nextOpenTime && (
            <div className="flex justify-between">
              <span className="text-gray-500">Next Open:</span>
              <span className="font-medium">
                {new Date(marketStatus.nextOpenTime).toLocaleString()}
              </span>
            </div>
          )}
          {marketStatus?.nextCloseTime && (
            <div className="flex justify-between">
              <span className="text-gray-500">Next Close:</span>
              <span className="font-medium">
                {new Date(marketStatus.nextCloseTime).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
