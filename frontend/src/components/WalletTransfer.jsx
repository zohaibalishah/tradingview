import React, { useState, useEffect } from 'react';
import { FaWallet, FaExchangeAlt, FaArrowRight, FaTimes } from 'react-icons/fa';
import { fundAccountFromWallet, formatBalance } from '../services/wallet';
import toast from 'react-hot-toast';

export default function WalletTransfer({ user, onTransferComplete }) {
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);

  const walletBalance = user?.wallet?.balance || 0;
  const walletCurrency = user?.wallet?.currency || 'USD';
  const accounts = user?.accounts || [];

  // Set default selected account to active account
  useEffect(() => {
    if (accounts.length > 0) {
      const activeAccount = accounts.find(account => account.isActive);
      if (activeAccount) {
        setSelectedAccount(activeAccount);
      } else {
        // If no active account, select the first one
        setSelectedAccount(accounts[0]);
      }
    } else {
      setSelectedAccount(null);
    }
  }, [accounts]);

  const handleTransfer = async () => {
    if (!selectedAccount) {
      toast.error('Please select a trading account');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (parseFloat(amount) > parseFloat(walletBalance)) {
      toast.error('Insufficient wallet balance');
      return;
    }

    try {
      setLoading(true);
      await fundAccountFromWallet(selectedAccount.id, parseFloat(amount));
      toast.success('Funds transferred successfully');
      setAmount('');
      setIsOpen(false);
      
      // Callback to refresh user data
      if (onTransferComplete) {
        onTransferComplete();
      }
    } catch (error) {
      console.error('Transfer error:', error);
      toast.error(error.response?.data?.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMaxAmount = () => {
    setAmount(walletBalance.toString());
  };

  if (!user?.wallet) {
    return null;
  }

  return (
    <>
      {/* Transfer Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
      >
        <FaExchangeAlt className="text-xs" />
        Transfer to Trading
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Transfer Funds</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <FaTimes />
              </button>
            </div>

            {/* Wallet Balance */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg mb-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <FaWallet className="text-green-600" />
                <span className="text-sm font-medium text-gray-700">Wallet Balance</span>
              </div>
              <p className="text-xl font-bold text-green-700">
                {formatBalance(walletBalance, walletCurrency)}
              </p>
            </div>

            {/* Account Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Trading Account
              </label>
              {accounts.length === 0 ? (
                <div className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 text-sm">
                  No trading accounts available. Please create an account first.
                </div>
              ) : (
                <select
                  value={selectedAccount?.id || ''}
                  onChange={(e) => {
                    const account = accounts.find(acc => acc.id === parseInt(e.target.value));
                    setSelectedAccount(account);
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="" disabled>
                    Choose an account...
                  </option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.type === 'demo' ? 'Demo Account' : 'Real Account'} - {formatBalance(account.balance)}
                      {account.isActive ? ' (Active)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Amount Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transfer Amount ({walletCurrency})
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  max={walletBalance}
                  step="0.01"
                  className="w-full p-2 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleMaxAmount}
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-green-600 hover:text-green-800 font-medium"
                >
                  MAX
                </button>
              </div>
            </div>

            {/* Transfer Preview */}
            {amount && parseFloat(amount) > 0 && selectedAccount && (
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg mb-4 border border-blue-200">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 font-medium">Transfer Preview:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-900 font-semibold">{formatBalance(amount, walletCurrency)}</span>
                    <FaArrowRight className="text-blue-500 text-xs" />
                    <span className="text-blue-700 font-semibold">
                      {selectedAccount.type === 'demo' ? 'Demo' : 'Real'} Account
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Validation Messages */}
            {!selectedAccount && accounts.length > 0 && (
              <div className="bg-yellow-50 p-3 rounded-lg mb-4 border border-yellow-200">
                <p className="text-yellow-700 text-sm">Please select a trading account to continue.</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleTransfer}
                disabled={loading || !selectedAccount || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > parseFloat(walletBalance)}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {loading ? 'Transferring...' : 'Transfer Funds'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
