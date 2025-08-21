import React, { useState, useEffect } from 'react';
import { FaWallet, FaExchangeAlt, FaTimes, FaCheck } from 'react-icons/fa';
import { transferAccountToWallet, getUserAccounts, formatBalance } from '../services/wallet';
import toast from 'react-hot-toast';

export default function AccountToWalletTransfer({ isOpen, onClose, onTransferComplete }) {
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingAccounts, setFetchingAccounts] = useState(true);

  useEffect(() => {
    if (isOpen) {
      fetchUserAccounts();
    }
  }, [isOpen]);

  const fetchUserAccounts = async () => {
    try {
      setFetchingAccounts(true);
      const accountsData = await getUserAccounts();
      setAccounts(accountsData);
      if (accountsData.length > 0) {
        setSelectedAccountId(accountsData[0].id);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to fetch accounts');
    } finally {
      setFetchingAccounts(false);
    }
  };

  const selectedAccount = accounts.find(acc => acc.id === parseInt(selectedAccountId));

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedAccountId || !amount) {
      toast.error('Please select an account and enter an amount');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (selectedAccount && numAmount > selectedAccount.balance) {
      toast.error('Insufficient account balance');
      return;
    }

    try {
      setLoading(true);
      const response = await transferAccountToWallet(parseInt(selectedAccountId), numAmount);
      
      toast.success('Funds transferred to wallet successfully!');
      
      // Reset form
      setAmount('');
      
      // Call callback to refresh data
      if (onTransferComplete) {
        await onTransferComplete();
      }
      
      // Close modal
      onClose();
      
    } catch (error) {
      console.error('Transfer error:', error);
      const errorMessage = error.response?.data?.message || 'Transfer failed';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setAmount('');
      setSelectedAccountId(accounts.length > 0 ? accounts[0].id : '');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <FaExchangeAlt className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Transfer to Wallet</h3>
              <p className="text-sm text-gray-500">Move funds from trading account to wallet</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <FaTimes className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Account Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Trading Account
            </label>
            {fetchingAccounts ? (
              <div className="animate-pulse bg-gray-200 h-10 rounded-md"></div>
            ) : (
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                disabled={loading}
              >
                {accounts.length === 0 ? (
                  <option value="">No trading accounts available</option>
                ) : (
                  accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.type === 'demo' ? 'Demo Account' : 'Real Account'} - {formatBalance(account.balance)}
                    </option>
                  ))
                )}
              </select>
            )}
          </div>

          {/* Account Balance Display */}
          {selectedAccount && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Available Balance:</span>
                <span className="text-lg font-semibold text-gray-900">
                  {formatBalance(selectedAccount.balance)}
                </span>
              </div>
              <div className="flex justify-between items-center mt-1">
                <span className="text-sm text-gray-600">Account Type:</span>
                <span className="text-sm font-medium text-gray-700">
                  {selectedAccount.type === 'demo' ? 'Demo' : 'Real'}
                </span>
              </div>
            </div>
          )}

          {/* Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Transfer Amount
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0.01"
                max={selectedAccount ? selectedAccount.balance : undefined}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                disabled={loading || !selectedAccount}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-gray-500 text-sm">USD</span>
              </div>
            </div>
            {selectedAccount && (
              <p className="text-xs text-gray-500 mt-1">
                Maximum: {formatBalance(selectedAccount.balance)}
              </p>
            )}
          </div>

          {/* Warning */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <FaWallet className="h-4 w-4 text-yellow-600" />
              </div>
              <div className="ml-3">
                <h4 className="text-sm font-medium text-yellow-800">Important Notice</h4>
                <p className="text-sm text-yellow-700 mt-1">
                  You cannot transfer funds while you have open trades. Please close all positions first.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedAccountId || !amount || !selectedAccount}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Transferring...</span>
                </>
              ) : (
                <>
                  <FaExchangeAlt className="h-4 w-4" />
                  <span>Transfer to Wallet</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
