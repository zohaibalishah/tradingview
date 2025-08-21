import React, { useEffect, useRef, useState } from 'react';
import { loadTradingViewScripts } from '../services/loadTradingView';

/**
 * AdvancedTradingViewChart
 * Renders a TradingView chart widget with a loading spinner and Buy/Sell buttons.
 * Props:
 *   - symbol: string (default: 'AAPL')
 *   - interval: string (default: '1D')
 */
const AdvancedTradingViewChart = ({}) => {
  const chartContainerRef = useRef(null);
  const widgetRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]); // {type: 'buy'|'sell', price: number, time: number}
//   socket.on("wallet:update", (balance) => {
//     setUserWallet(balance);
//   });

//   useEffect(() => {
//     const socket = io(backendURL);
  
//     socket.on("price:update", (data) => {
//       const price = data.find(q => q.s === selectedSymbol)?.p;
//       if (price && widgetRef.current) {
//         // Use TradingView API to show price
//         widgetRef.current.activeChart().setPriceLine({ price });
//       }
//     });
  
//     return () => socket.disconnect();
//   }, [selectedSymbol]);



  // Helper to add a buy/sell marker to the chart
  const addOrderMarker = (type, price, time) => {
    if (!widgetRef.current || !widgetRef.current.activeChart) return;
    const chart = widgetRef.current.activeChart();
    if (!chart) return;

    // Use createShape to add marker
    chart.createShape(
      {
        time,
        price,
      },
      {
        shape: type === 'buy' ? 'arrow_up' : 'arrow_down',
        text: type === 'buy' ? 'Buy' : 'Sell',
        color: type === 'buy' ? '#00FF00' : '#FF0000',
        textColor: '#fff',
        disableSelection: true,
        disableSave: true,
        disableUndo: true,
        lock: true,
        overrides: {
          'shape.backgroundColor': type === 'buy' ? '#00FF00' : '#FF0000',
        },
      }
    );
  };

  // Add all order markers when chart is ready or orders change
  useEffect(() => {
    if (!widgetRef.current || !widgetRef.current.activeChart) return;
    const chart = widgetRef.current.activeChart();
    if (!chart) return;
    // Remove all shapes first (for simplicity)
    chart.removeAllShapes && chart.removeAllShapes();
    orders.forEach((order) => {
      addOrderMarker(order.type, order.price, order.time);
    });
    // eslint-disable-next-line
  }, [orders, loading]);



  useEffect(() => {
    let isMounted = true;

    const initChart = () => {
      if (
        typeof window.TradingView === 'undefined' ||
        typeof window.Datafeeds === 'undefined'
      ) {
        // Defensive: TradingView scripts not loaded
        return;
      }

      // Remove previous widget if exists
      if (widgetRef.current && typeof widgetRef.current.remove === 'function') {
        widgetRef.current.remove();
        widgetRef.current = null;
      }

      // Create new widget
      widgetRef.current = new window.TradingView.widget({
        symbol: 'XAU/USD',
        // symbol: 'AAPL',

        interval: '1',
        container: chartContainerRef.current,
        datafeed: new window.Datafeeds.UDFCompatibleDatafeed(
          // 'https://demo-feed-data.tradingview.com'
          'http://localhost:4000/api'
        ),
        library_path: '/charting_library/',
        locale: 'en',
        fullscreen: false,
        autosize: true,
        theme: 'Dark',
        debug: false,
        disabled_features: [
          // 'header_symbol_search',
          'use_localstorage_for_settings',
        ],
        enabled_features: [
          'study_templates',
          // 'chat',
        ],
        client_id: 'gold-trader',
        user_id: 'user1',
        // overrides: {
        //   'mainSeriesProperties.style': 1,
        //   'paneProperties.background': '#1E1E1E',
        // },
        // studies_overrides: {
        //   'volume.volume.color.0': '#FFD700',
        // },
        // custom_css_url: '/charting_library/custom-style.css',
        // loading_screen: {
        //   backgroundColor: '#000000',
        //   foregroundColor: '#FFD700',
        // },
      });

      widgetRef.current.onChartReady(() => {
        if (isMounted) {
          setLoading(false);
        }
      });
    };

    setLoading(true); // Always show loader on symbol/interval change

    loadTradingViewScripts()
      .then(() => {
        if (isMounted) initChart();
      })
      .catch((err) => {
        console.error('Failed to load TradingView scripts:', err);
        setLoading(false);
      });

    return () => {
      isMounted = false;
      if (widgetRef.current && typeof widgetRef.current.remove === 'function') {
        widgetRef.current.remove();
        widgetRef.current = null;
      }
    };
  }, []);

  // Handler for Buy/Sell button
  const handleOrder = async (type) => {
    if (!widgetRef.current || !widgetRef.current.activeChart) return;
    const chart = widgetRef.current.activeChart();
    if (!chart) return;

    // Try to get the latest bar from the visible range
    try {
      // TradingView's chart API exposes getVisibleRange and getBars methods
      // We'll use getVisibleRange to get the last visible bar's time, then request bars for that range
      if (
        typeof chart.getVisibleRange !== 'function' ||
        typeof chart.getBars !== 'function'
      ) {
        // Fallback: cannot get bars
        return;
      }

      const visibleRange = await chart.getVisibleRange();
      if (!visibleRange || !visibleRange.to) return;

      // Get bars for the visible range
      const bars = await chart.getBars(visibleRange.from, visibleRange.to);
      if (!bars || bars.length === 0) return;

      const lastBar = bars[bars.length - 1];
      const price = lastBar.close;
      const time = lastBar.time;

      setOrders((prev) => [...prev, { type, price, time }]);
    } catch (err) {
      console.error('Failed to get latest bar for order:', err);
    }
  };

  useEffect(() => {
    // 🔔 Listen to real-time trade markers
    // if (widgetRef?.chart()) {
    //   widgetRef.chart().createShape({
    //     time: marker.time / 1000, // sec
    //     shape: marker.type === "BUY" ? "arrow_up" : "arrow_down",
    //     text: marker.text,
    //     color: marker.color,
    //   });
    // }
  }, [widgetRef]);
  return (
    <div style={{ position: 'relative', width: '100%', height: '600px' }}>
      {/* Buy/Sell Buttons */}
      {/* <div style={styles.buttonBar}>
        <button
          style={{ ...styles.button, background: '#00C853' }}
          onClick={() => handleOrder('buy')}
          disabled={loading}
        >
          Buy
        </button>
        <button
          style={{ ...styles.button, background: '#D50000' }}
          onClick={() => handleOrder('sell')}
          disabled={loading}
        >
          Sell
        </button>
      </div> */}
      {loading && (
        <div style={styles.loaderContainer} aria-label="Loading chart">
          <div style={styles.spinner} />
          <div style={{ color: '#FFD700', marginTop: '10px' }}>
            Loading Chart...
          </div>
        </div>
      )}
      <div
        ref={chartContainerRef}
        style={{
          width: '100%',
          height: '100%',
          visibility: loading ? 'hidden' : 'visible',
        }}
        aria-hidden={loading}
      />
    </div>
  );
};

// 🎨 Simple CSS loader and button bar
const styles = {
  loaderContainer: {
    position: 'absolute',
    zIndex: 9999,
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    textAlign: 'center',
    pointerEvents: 'none',
  },
  spinner: {
    border: '4px solid rgba(255, 215, 0, 0.3)',
    borderTop: '4px solid #FFD700',
    borderRadius: '50%',
    width: 40,
    height: 40,
    animation: 'spin 1s linear infinite',
    margin: '0 auto',
  },
  buttonBar: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 10000,
    display: 'flex',
    gap: 8,
  },
  button: {
    color: '#fff',
    border: 'none',
    borderRadius: 4,
    padding: '8px 18px',
    fontWeight: 'bold',
    fontSize: 16,
    cursor: 'pointer',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
    transition: 'background 0.2s',
    outline: 'none',
  },
};

export default AdvancedTradingViewChart;
