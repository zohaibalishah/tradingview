import React, { useEffect, useRef, useState } from 'react';
import { UDFCompatibleDatafeed } from '../services/datafeed';
import { usePriceContext } from '../contexts/PriceContext';

export default function AdvancedChart({ selectedTrade, theme = 'light' }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const tradeMarkersRef = useRef([]);
  const widgetRef = useRef(null);
  const [isChartReady, setIsChartReady] = useState(false);
  const [chartStatus, setChartStatus] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentInterval, setCurrentInterval] = useState('1');
  
  // Get selected currency from PriceContext
  const { selectedCurrency } = usePriceContext();

  const addTradeMarker = (trade) => {
    if (!chartRef.current || !trade) return;

    try {
      const chart = chartRef.current;

      if (!chart.createShape || typeof chart.createShape !== 'function') {
        console.warn(
          'TradingView chart does not support shape creation, using marks instead'
        );
        addTradeMark(trade);
        return;
      }

      removeTradeMarkers();

      const tradeTime = new Date(trade.openTime).getTime() / 1000;
      const entryPrice = parseFloat(trade.entryPrice);

      const entryLine = chart.createShape(
        { time: tradeTime, price: entryPrice },
        {
          shape: 'horizontal_line',
          text: `${trade.side} @ ${entryPrice}`,
          overrides: {
            linecolor: trade.side === 'BUY' ? '#00ff00' : '#ff0000',
            linestyle: 0,
            linewidth: 2,
            showLabel: true,
            textcolor: trade.side === 'BUY' ? '#00ff00' : '#ff0000',
            fontsize: 12,
          },
        }
      );

      const timeLine = chart.createShape(
        { time: tradeTime, price: entryPrice },
        {
          shape: 'vertical_line',
          text: `${trade.side} Entry`,
          overrides: {
            linecolor: trade.side === 'BUY' ? '#00ff00' : '#ff0000',
            linestyle: 1,
            linewidth: 1,
            showLabel: true,
            textcolor: trade.side === 'BUY' ? '#00ff00' : '#ff0000',
            fontsize: 10,
          },
        }
      );

      if (trade.stopLoss) {
        const stopLossPrice = parseFloat(trade.stopLoss);
        const stopLossLine = chart.createShape(
          { time: tradeTime, price: stopLossPrice },
          {
            shape: 'horizontal_line',
            text: `SL @ ${stopLossPrice}`,
            overrides: {
              linecolor: '#ff6600',
              linestyle: 2,
              linewidth: 1,
              showLabel: true,
              textcolor: '#ff6600',
              fontsize: 10,
            },
          }
        );
        tradeMarkersRef.current.push(stopLossLine);
      }

      if (trade.takeProfit) {
        const takeProfitPrice = parseFloat(trade.takeProfit);
        const takeProfitLine = chart.createShape(
          { time: tradeTime, price: takeProfitPrice },
          {
            shape: 'horizontal_line',
            text: `TP @ ${takeProfitPrice}`,
            overrides: {
              linecolor: '#0066ff',
              linestyle: 2,
              linewidth: 1,
              showLabel: true,
              textcolor: '#0066ff',
              fontsize: 10,
            },
          }
        );
        tradeMarkersRef.current.push(takeProfitLine);
      }

      tradeMarkersRef.current.push(entryLine, timeLine);

      if (
        chart.setVisibleRange &&
        typeof chart.setVisibleRange === 'function'
      ) {
        chart.setVisibleRange({
          from: tradeTime - 3600,
          to: tradeTime + 3600,
        });
      }
    } catch (error) {
      console.error('Error adding trade marker:', error);
    }
  };

  const addTradeMark = (trade) => {
    if (!chartRef.current || !trade) return;

    try {
      const chart = chartRef.current;
      const tradeTime = new Date(trade.openTime).getTime() / 1000;

      removeTradeMarkers();

      const mark = {
        id: `trade-${trade.id}`,
        time: tradeTime,
        color: trade.side === 'BUY' ? '#00ff00' : '#ff0000',
        text: `${trade.side} @ ${trade.entryPrice}`,
        label: trade.side === 'BUY' ? 'B' : 'S',
        tooltip: `${trade.side} Entry - ${trade.symbol} @ ${trade.entryPrice}`,
        size: 1,
      };

      if (chart.setMarks && typeof chart.setMarks === 'function') {
        chart.setMarks([mark]);
      }

      if (
        chart.setVisibleRange &&
        typeof chart.setVisibleRange === 'function'
      ) {
        chart.setVisibleRange({
          from: tradeTime - 3600,
          to: tradeTime + 3600,
        });
      }
    } catch (error) {
      console.error('Error adding trade mark:', error);
    }
  };

  const removeTradeMarkers = () => {
    if (!chartRef.current) return;

    try {
      const chart = chartRef.current;

      tradeMarkersRef.current.forEach((marker) => {
        if (marker && typeof marker.remove === 'function') {
          marker.remove();
        }
      });
      tradeMarkersRef.current = [];

      if (chart.setMarks && typeof chart.setMarks === 'function') {
        chart.setMarks([]);
      }

      if (
        chart.removeAllShapes &&
        typeof chart.removeAllShapes === 'function'
      ) {
        chart.removeAllShapes();
      }
    } catch (error) {
      console.error('Error removing trade markers:', error);
    }
  };

  useEffect(() => {
    if (selectedTrade) {
      addTradeMarker(selectedTrade);
    } else {
      removeTradeMarkers();
    }
  }, [selectedTrade]);

  useEffect(() => {
    if (widgetRef.current) {
      widgetRef.current.remove();
      widgetRef.current = null;
    }

    // Convert OANDA symbol format to TradingView format
    const getTradingViewSymbol = (oandaSymbol) => {
      if (!oandaSymbol) return 'XAU/USD';
      // Convert OANDA:XAU_USD to XAU/USD format
      return oandaSymbol.replace('OANDA:', '').replace('_', '/');
    };

    const widget = new window.TradingView.widget({
      symbol: getTradingViewSymbol(selectedCurrency),
      interval: currentInterval,
      container: containerRef.current,
      datafeed: UDFCompatibleDatafeed(),
      library_path: '/charting_library/',
      locale: 'en',
      fullscreen: false,
      autosize: true,
      theme: theme,
      disabled_features: ['use_localstorage_for_settings'],
      enabled_features: ['study_templates'],

      overrides: {
        'paneProperties.background': theme === 'light' ? '#ffffff' : '#1e222d',
        'paneProperties.vertGridProperties.color':
          theme === 'light' ? '#e1e5e9' : '#2b2b43',
        'paneProperties.horzGridProperties.color':
          theme === 'light' ? '#e1e5e9' : '#2b2b43',
        'paneProperties.crossHairProperties.color':
          theme === 'light' ? '#9598a1' : '#787b86',
        'paneProperties.watermarkProperties.color':
          theme === 'light' ? '#e1e5e9' : '#2b2b43',
        'symbolWatermarkProperties.color':
          theme === 'light' ? '#e1e5e9' : '#2b2b43',
        'scalesProperties.backgroundColor':
          theme === 'light' ? '#ffffff' : '#1e222d',
        'scalesProperties.textColor': theme === 'light' ? '#131722' : '#d1d4dc',
      },
    });

    widgetRef.current = widget;

    widget.onChartReady(() => {
      try {
        chartRef.current = widget.chart();
        setIsChartReady(true);
        setChartStatus('ready');
        setErrorMessage('');

        if (selectedTrade) {
          addTradeMarker(selectedTrade);
        }

        // Listen for interval changes
        if (chartRef.current && chartRef.current.onIntervalChanged) {
          chartRef.current.onIntervalChanged().subscribe(null, (interval) => {
            console.log(`[Chart] Interval changed from ${currentInterval} to ${interval}`);
            setCurrentInterval(interval);
            
            // Reset the datafeed cache when interval changes to prevent time violations
            const datafeed = UDFCompatibleDatafeed();
            if (datafeed.resetCache) {
              datafeed.resetCache();
            }
          });
        }
      } catch (error) {
        console.error('Chart ready error:', error);
        setChartStatus('error');
        setErrorMessage('Failed to initialize chart');
      }
    });

    widget.onChartError = (error) => {
      console.error('Chart error:', error);
      setChartStatus('error');
      setErrorMessage(
        'Chart loading failed. Please check if the backend server is running.'
      );
    };

    return () => {
      removeTradeMarkers();
      if (widgetRef.current) {
        widgetRef.current.remove();
        widgetRef.current = null;
      }
    };
  }, [theme, selectedCurrency]); // Recreate when theme or selected currency changes

  const retryChart = () => {
    setChartStatus('loading');
    setErrorMessage('');
  };

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="h-[32rem] w-full overflow-hidden sm:h-[24rem] md:h-[28rem] lg:h-[32rem]"
      />

      {chartStatus === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90">
          <div className="text-center p-6">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <div className="text-gray-600 text-lg">Loading Chart...</div>
            <div className="text-gray-500 text-sm mt-2">
              Please wait while we connect to the data feed
            </div>
          </div>
        </div>
      )}

      {chartStatus === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90">
          <div className="text-center p-6 max-w-md">
            <div className="text-red-500 text-lg font-medium mb-2">
              Chart Loading Error
            </div>
            <div className="text-gray-600 text-sm mb-4">
              {errorMessage ||
                'There was an issue loading the chart. This might be due to:'}
            </div>
            <ul className="text-gray-500 text-xs mb-6 text-left">
              <li>• Backend server not running</li>
              <li>• Network connection issues</li>
              <li>• Data feed temporarily unavailable</li>
            </ul>
            <div className="space-y-2">
              <button
                onClick={retryChart}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 mr-2"
              >
                Retry
              </button>
              <button
                onClick={() => window.location.reload()}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Refresh Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
