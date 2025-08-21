import React, { useState } from 'react';
import { FaDollarSign } from 'react-icons/fa';
import TradePanel from './TradePanel';
import { usePriceContext } from '../contexts/PriceContext';

export default function TradeButton({ 
  symbol, 
  isOpen: externalIsOpen, 
  onClose: externalOnClose,
  showButton = true,
  buttonText,
  buttonClassName = "flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold transition-colors shadow-lg hover:shadow-xl"
}) {
  const [internalIsOpen, setIsInternalOpen] = useState(false);
  
  // Get selected currency from PriceContext if no symbol is provided
  const { selectedCurrency } = usePriceContext();
  const tradeSymbol = symbol || selectedCurrency;

  // Use external state if provided, otherwise use internal state
  const isModalOpen = externalIsOpen !== undefined ? externalIsOpen : internalIsOpen;
  const closeModal = externalOnClose || (() => setIsInternalOpen(false));
  const openModal = () => setIsInternalOpen(true);

  return (
    <>
      {showButton && (
        <button
          onClick={openModal}
          className={buttonClassName}
        >
          {buttonText || `Trade ${tradeSymbol.replace('OANDA:', '')}`}
        </button>
      )}

      <TradePanel 
        symbol={tradeSymbol} 
        isOpen={isModalOpen} 
        onClose={closeModal} 
      />
    </>
  );
}
