import React from 'react';
import { useMarketStatusCheck } from '../hooks/useMarketStatusCheck';
import { FaTimes, FaExclamationTriangle, FaClock } from 'react-icons/fa';

const MarketStatusPopup = () => {
  const { shouldShowPopup, marketStatus, isLoading, error, dismissPopup } = useMarketStatusCheck();

  const handleClose = () => {
    dismissPopup();
  };

  const formatTimeRemaining = (seconds) => {
    if (!seconds || seconds <= 0) return 'Unknown';
    
    const days = Math.floor(seconds / (24 * 60 * 60));
    const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
    const minutes = Math.floor((seconds % (60 * 60)) / 60);
    
    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const getNextEventInfo = () => {
    if (!marketStatus?.timeUntilNextEvent) return null;
    
    const { type, seconds, formatted } = marketStatus.timeUntilNextEvent;
    return {
      type,
      timeRemaining: formatted || formatTimeRemaining(seconds),
      nextTime: type === 'open' ? marketStatus.nextOpenTime : marketStatus.nextCloseTime
    };
  };

  const nextEvent = getNextEventInfo();

  if (!shouldShowPopup || isLoading || error) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 relative">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <FaTimes className="h-6 w-6" />
        </button>

        {/* Header */}
        <div className="flex items-center p-6 pb-4">
          <div className="flex-shrink-0">
            <FaExclamationTriangle className="h-8 w-8 text-red-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Market is Currently Closed
            </h3>
            <p className="text-sm text-gray-500">
              Trading is not available at this time
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pb-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <FaClock className="h-5 w-5 text-red-500 mr-2" />
              <span className="text-sm font-medium text-red-800">
                Market Hours: Sunday 22:00 UTC - Friday 22:00 UTC
              </span>
            </div>
          </div>

          {nextEvent && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="text-sm">
                <div className="font-medium text-blue-800 mb-1">
                  Market will {nextEvent.type} in:
                </div>
                <div className="text-lg font-bold text-blue-900">
                  {nextEvent.timeRemaining}
                </div>
                {nextEvent.nextTime && (
                  <div className="text-xs text-blue-600 mt-1">
                    {new Date(nextEvent.nextTime).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="text-sm text-gray-600 space-y-2">
            <p>
              • You can still view charts and analyze market data
            </p>
            <p>
              • Place orders will be queued until market opens
            </p>
            <p>
              • Real-time price updates will resume when market opens
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-lg">
          <button
            onClick={handleClose}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            I Understand
          </button>
        </div>
      </div>
    </div>
  );
};

export default MarketStatusPopup;
