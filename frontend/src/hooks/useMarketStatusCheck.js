import { useEffect, useState } from 'react';
import { useGetMarketStatus } from '../services/market.service';
import { useUser } from '../services/auth';

export const useMarketStatusCheck = () => {
  const { data: marketStatus, isLoading, error } = useGetMarketStatus();
  const { data: user, isLoading: userLoading } = useUser();
  const [shouldShowPopup, setShouldShowPopup] = useState(false);
  const [hasCheckedOnLoad, setHasCheckedOnLoad] = useState(false);

  useEffect(() => {
    // Check if this is a fresh page load or login
    const isFreshLoad = !localStorage.getItem('marketStatusChecked');
    const isLoggedIn = user && !userLoading; // Use useUser hook for authentication
    
    if (isFreshLoad && isLoggedIn && !hasCheckedOnLoad) {
      setHasCheckedOnLoad(true);
      localStorage.setItem('marketStatusChecked', 'true');
    }
  }, [hasCheckedOnLoad, user, userLoading]);

  useEffect(() => {
    if (marketStatus && !isLoading && !error && hasCheckedOnLoad) {
      // Show popup if market is closed and we haven't shown it yet in this session
      if (!marketStatus.isOpen) {
        const popupShown = localStorage.getItem('marketClosedPopupShown');
        if (popupShown !== 'true') {
          setShouldShowPopup(true);
        }
      }
    }
  }, [marketStatus, isLoading, error, hasCheckedOnLoad]);

  const dismissPopup = () => {
    setShouldShowPopup(false);
    localStorage.setItem('marketClosedPopupShown', 'true');
  };

  const resetPopupState = () => {
    // Call this when user logs out to reset the popup state
    localStorage.removeItem('marketClosedPopupShown');
    localStorage.removeItem('marketStatusChecked');
    setShouldShowPopup(false);
    setHasCheckedOnLoad(false);
  };

  return {
    shouldShowPopup,
    marketStatus,
    isLoading,
    error,
    dismissPopup,
    resetPopupState
  };
};
