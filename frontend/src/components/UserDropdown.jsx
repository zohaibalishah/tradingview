import React, { useState, useEffect } from 'react';
import {
  FaUser,
  FaSignOutAlt,
  FaChevronDown,
  FaWallet,
  FaExchangeAlt,
  FaCog,
  FaCrown,
  FaShieldAlt,
  FaPlus,
  FaCheck,
  FaArrowDown,
} from 'react-icons/fa';
import { useUser, useLogout, refreshUserData } from '../services/auth';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  getUserAccounts,
  switchAccount,
  createAccount,
  formatBalance,
  getAccountTypeDisplay,
  getAccountStatusDisplay,
} from '../services/wallet';
import WalletTransfer from './WalletTransfer';
import AccountToWalletTransfer from './AccountToWalletTransfer';
import toast from 'react-hot-toast';

export default function UserDropdown() {
  const { data: user } = useUser();
  const logout = useLogout();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [switchingAccount, setSwitchingAccount] = useState(false);
  const [showTransferToWallet, setShowTransferToWallet] = useState(false);

  // Fetch user accounts on component mount
  useEffect(() => {
    if (user) {
      fetchUserAccounts();
    }
  }, [user]);

  const fetchUserAccounts = async () => {
    try {
      setLoading(true);
      const response = await getUserAccounts();
      setAccounts(response || []);
    } catch (error) {
      console.error('Error fetching accounts:', error);
      toast.error('Failed to load accounts');
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchAccount = async (accountId) => {
    try {
      setSwitchingAccount(true);
      await switchAccount(accountId);
      toast.success('Account switched successfully');
      setIsOpen(false);
      
      // Refresh user data to get updated account info
      await refreshUserData();
      queryClient.invalidateQueries({ queryKey: ['authenticated-user'] });
      fetchUserAccounts(); // Refresh accounts list
    } catch (error) {
      console.error('Error switching account:', error);
      toast.error('Failed to switch account');
    } finally {
      setSwitchingAccount(false);
    }
  };

  const handleCreateAccount = async (type) => {
    try {
      setLoading(true);
      await createAccount(type);
      toast.success(`${getAccountTypeDisplay(type)} created successfully`);
      fetchUserAccounts(); // Refresh accounts list
    } catch (error) {
      console.error('Error creating account:', error);
      toast.error('Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const onLogout = () => {
    logout.mutate(undefined, {
      onSuccess: () => {
        navigate('/login');
      },
    });
  };

  const getActiveAccount = () => {
    return accounts.find((account) => account.isActive) || accounts[0];
  };

  const activeAccount = getActiveAccount();

  const handleTransferComplete = async () => {
    await refreshUserData();
    queryClient.invalidateQueries({ queryKey: ['authenticated-user'] });
    fetchUserAccounts();
  };

  return (
    <>
      <div className="relative">
        {/* User Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <div className="hidden sm:block text-right">
            <p className="text-sm font-medium text-gray-900 truncate max-w-32">
              {user?.email}
            </p>
            <div className="flex items-center gap-1">
              {user?.role === 'SUPER ADMIN' ? (
                <>
                  <FaShieldAlt className="text-purple-500 text-xs" />
                  <p className="text-xs text-gray-500">Admin</p>
                </>
              ) : (
                <>
                  <FaCrown className="text-yellow-500 text-xs" />
                  <p className="text-xs text-gray-500">Premium</p>
                </>
              )}
            </div>
          </div>

          {/* User Avatar */}
          <div className="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center">
            <FaUser className="text-white text-sm" />
          </div>

          <FaChevronDown
            className={`text-gray-400 text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            {/* User Info Section */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center">
                  <FaUser className="text-white text-sm" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">
                    {user?.name || user?.email}
                  </h3>
                  <p className="text-sm text-gray-500">{user?.email}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {user?.role === 'SUPER ADMIN' ? (
                      <>
                        <FaShieldAlt className="text-purple-500 text-xs" />
                        <span className="text-xs text-purple-600 font-medium">
                          Admin
                        </span>
                      </>
                    ) : (
                      <>
                        <FaCrown className="text-yellow-500 text-xs" />
                        <span className="text-xs text-yellow-600 font-medium">
                          Premium
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Wallet Balance Section */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <FaWallet className="text-green-600 text-sm" />
                  <span className="text-sm font-medium text-gray-700">
                    Wallet Balance
                  </span>
                </div>
                {user?.wallet?.balance > 0 && (
                  <WalletTransfer
                    user={user}
                    onTransferComplete={() => {
                      setIsOpen(false);
                      queryClient.invalidateQueries({ queryKey: ['authenticated-user'] });
                      fetchUserAccounts(); // Refresh accounts list
                    }}
                  />
                )}
              </div>
              <div className="mt-2">
                <p className="text-lg font-bold text-green-700">
                  {formatBalance(user?.wallet?.balance, user?.wallet?.currency)}
                </p>
                <p className="text-xs text-gray-500">Available for trading</p>
              </div>
            </div>

            {/* Account Selection Section */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FaExchangeAlt className="text-blue-500 text-sm" />
                  <span className="text-sm font-medium text-gray-700">
                    Trading Account
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {activeAccount && activeAccount.balance > 0 && (
                    <button
                      onClick={() => setShowTransferToWallet(true)}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                      title="Transfer to Wallet"
                    >
                      <FaArrowDown className="h-3 w-3" />
                      To Wallet
                    </button>
                  )}
                  <button
                    onClick={() => handleCreateAccount('demo')}
                    disabled={loading}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors disabled:opacity-50"
                  >
                    <FaPlus className="text-xs" />
                    New Demo
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mx-auto"></div>
                </div>
              ) : accounts.length > 0 ? (
                <div className="space-y-2">
                  {accounts.map((account) => (
                    <div
                      key={account.id}
                      className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${
                        user.activeAccountId == account.id
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      }`}
                      onClick={() =>
                        user.activeAccountId != account.id &&
                        handleSwitchAccount(account.id)
                      }
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {getAccountTypeDisplay(account.type)}
                          </span>
                          {user.activeAccountId == account.id && (
                            <FaCheck className="text-blue-500 text-xs" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {formatBalance(account.balance)}
                          </span>
                          <span
                            className={`text-xs px-1 py-0.5 rounded ${
                              account.status === 'active'
                                ? 'bg-green-100 text-green-600'
                                : account.status === 'pending_verification'
                                  ? 'bg-yellow-100 text-yellow-600'
                                  : 'bg-red-100 text-red-600'
                            }`}
                          >
                            {getAccountStatusDisplay(account.status)}
                          </span>
                        </div>
                      </div>
                      {switchingAccount && user.activeAccountId == account.id && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-2">
                  No accounts found
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="p-4 space-y-2">
              {user?.role === 'SUPER ADMIN' && (
                <button
                  onClick={() => {
                    navigate('/admin');
                    setIsOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                >
                  <FaShieldAlt className="text-sm" />
                  Admin Panel
                </button>
              )}

              <button
                onClick={() => {
                  navigate('/dashboard');
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <FaCog className="text-sm" />
                Settings
              </button>

              <button
                onClick={() => {
                  onLogout();
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <FaSignOutAlt className="text-sm" />
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Backdrop */}
        {isOpen && (
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
        )}
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
