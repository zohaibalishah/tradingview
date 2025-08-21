import React, { useState, useEffect } from 'react';
import { FaClock, FaPlay, FaPause, FaCalendarAlt } from 'react-icons/fa';
import { useGetMarketCountdown } from '../services/market.service';
import dayjs from 'dayjs';

export default function MarketStatusWidget() {
  const { data: countdown, isLoading, error } = useGetMarketCountdown();
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
    
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return null; // Don't show error for widget, just hide it
  }

  const isOpen = countdown?.isOpen || false;
  const eventType = countdown?.eventType;
  const timeRemaining = localTimeRemaining || countdown?.timeRemaining || 0;
  const lastMarketClose = countdown?.lastMarketClose;

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <FaClock className="text-gray-400" />
          <span className="text-sm font-medium text-gray-700">Market</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-500'}`}></div>
          {isOpen ? (
            <FaPlay className="text-green-500 text-xs" />
          ) : (
            <FaPause className="text-red-500 text-xs" />
          )}
        </div>
      </div>

      <div className="text-center">
        <div className={`text-lg font-bold ${isOpen ? 'text-green-600' : 'text-red-600'}`}>
          {isOpen ? 'OPEN' : 'CLOSED'}
        </div>
        
        {timeRemaining > 0 && (
          <div className="text-xs text-gray-500 mt-1">
            {eventType === 'close' ? 'Closes in:' : 'Opens in:'} {formatTimeRemaining(timeRemaining)}
          </div>
        )}
        
        {!isOpen && lastMarketClose && (
          <div className="text-xs text-gray-500 mt-1 flex items-center justify-center">
            <FaCalendarAlt className="mr-1" />
            Last close: {dayjs(lastMarketClose).format('MMM DD, HH:mm')}
          </div>
        )}
      </div>
    </div>
  );
}
