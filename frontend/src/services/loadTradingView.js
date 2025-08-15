// util to dynamically load external scripts once and verify they are loaded
const loadScript = (src, verifyFn) => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      // If script tag exists, verify if the global is available
      if (typeof verifyFn === 'function') {
        if (verifyFn()) {
          resolve();
        } else {
          // Wait for the script to actually load the global
          const checkInterval = setInterval(() => {
            if (verifyFn()) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 50);
          // Optional: timeout after 10s
          setTimeout(() => {
            clearInterval(checkInterval);
            reject(new Error(`Verification failed for ${src}`));
          }, 10000);
        }
      } else {
        resolve();
      }
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => {
      if (typeof verifyFn === 'function') {
        if (verifyFn()) {
          resolve();
        } else {
          // Wait for the global to be available
          const checkInterval = setInterval(() => {
            if (verifyFn()) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 50);
          // Optional: timeout after 10s
          setTimeout(() => {
            clearInterval(checkInterval);
            reject(new Error(`Verification failed for ${src}`));
          }, 10000);
        }
      } else {
        resolve();
      }
    };
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
};

// Load TradingView charting_library and datafeed, verifying globals
let tradingViewLoaded = false;
export const loadTradingViewScripts = async () => {
  if (tradingViewLoaded) return;

  await loadScript(
    '/charting_library/charting_library.js',
    () => typeof window.TradingView !== 'undefined'
  );
  await loadScript(
    '/datafeeds/udf/dist/bundle.js',
    () => typeof window.Datafeeds !== 'undefined'
  );

  tradingViewLoaded = true;
};
