import React, { useEffect, useRef, useState } from 'react';
import { UDFCompatibleDatafeed } from '../services/datafeed';
import { getSocket } from '../services/socket';
import axios from 'axios';

export default function AdvancedChart() {
  const containerRef = useRef(null);
  const [price, setPrice] = useState(null);

  useEffect(() => {
    const widget = new window.TradingView.widget({
      symbol: 'XAU/USD',
      interval: '1',
      container: containerRef.current,
      datafeed: UDFCompatibleDatafeed(),
      library_path: '/charting_library/',
      locale: 'en',
      fullscreen: false,
      autosize: true,
      theme: 'light',
      // disabled_features: ["header_resolutions"],
    });

    // Step 1: Fetch initial price
    //  const fetchInitialPrice = async () => {
    //   try {
    //     const res = await axios.get('http://localhost:4000/api/price?symbol=XAU/USD');
    //     if (res.data && res.data.price) {
    //       setPrice(res.data.price);
    //     }
    //   } catch (err) {
    //     console.error('[Chart] Failed to fetch initial price:', err.message);
    //   }
    // };
    //     fetchInitialPrice();

    const socket = getSocket();

    const priceListener = ({ price }) => {
      setPrice(price);
    };

    socket.on('price:update', priceListener);

    return () => {
      socket.off('price:update', priceListener);
      widget.remove();
    };
  }, []);

  return <div ref={containerRef} className="h-[32rem] w-full overflow-hidden" />;
}
