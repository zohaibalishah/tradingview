import React, { useState } from 'react';
import { FaWallet, FaExchangeAlt, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { useQueryClient } from '@tanstack/react-query';
import { formatBalance } from '../services/wallet';
import { refreshUserData } from '../services/auth';
import WalletTransfer from './WalletTransfer';
import AccountToWalletTransfer from './AccountToWalletTransfer';

export default function AccountBalance({ user, className = "" }) {
  const queryClient = useQueryClient();
  const [showTransferToWallet, setShowTransferToWallet] = useState(false);
  
  if (!user) return null;

  const walletBalance = user.wallet?.balance || 0;
  const walletCurrency = user.wallet?.currency || 'USD';
  const activeAccount = user.accounts?.find(account => account.isActive);

  const handleTransferComplete = async () => {
    await refreshUserData();
    queryClient.invalidateQueries({ queryKey: ['authenticated-user'] });
  };

  return (
    <>
      <div className={`flex items-center gap-4 ${className}`}>
        {/* Wallet Balance */}
        <div className="flex items-center gap-2">
          <FaWallet className="text-green-600 text-sm" />
          <div>
            <p className="text-xs text-gray-500">Wallet</p>
            <p className="text-sm font-bold text-green-700">
              {formatBalance(walletBalance, walletCurrency)}
            </p>
          </div>
        </div>

        {/* Active Account Balance */}
        {activeAccount && (
          <div className="flex items-center gap-2">
            <FaExchangeAlt className="text-blue-600 text-sm" />
            <div>
              <p className="text-xs text-gray-500">Trading Account</p>
              <p className="text-sm font-bold text-blue-700">
                {formatBalance(activeAccount.balance)}
              </p>
            </div>
          </div>
        )}

        {/* Transfer Buttons */}
        <div className="flex items-center gap-2">
          {/* Transfer to Account (Wallet to Account) */}
          {user?.wallet?.balance > 0 && (
            <WalletTransfer 
              user={user} 
              onTransferComplete={handleTransferComplete}
            />
          )}
          
          {/* Transfer to Wallet (Account to Wallet) */}
          {activeAccount && activeAccount.balance > 0 && (
            <button
              onClick={() => setShowTransferToWallet(true)}
              className="flex items-center gap-1 px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors text-xs font-medium"
              title="Transfer to Wallet"
            >
              <FaArrowDown className="h-3 w-3" />
              <span>To Wallet</span>
            </button>
          )}
        </div>
      </div>

      {/* Account to Wallet Transfer Modal */}
      <AccountToWalletTransfer
        isOpen={showTransferToWallet}
        onClose={() => setShowTransferToWallet(false)}
        onTransferComplete={handleTransferComplete}
      />
    </>
  );
}
