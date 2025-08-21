import api from '../utils/api';

// Get user accounts
export const getUserAccounts = async () => {
  try {
    const response = await api.get('/accounts/list');
    return response.data;
  } catch (error) {
    console.error('Error fetching user accounts:', error);
    throw error;
  }
};

// Switch account
export const switchAccount = async (accountId) => {
  try {
    const response = await api.post('/accounts/switch', { accountId });
    return response.data;
  } catch (error) {
    console.error('Error switching account:', error);
    throw error;
  }
};

// Create new account
export const createAccount = async (accountType) => {
  try {
    const response = await api.post('/accounts/create', { type: accountType });
    return response.data;
  } catch (error) {
    console.error('Error creating account:', error);
    throw error;
  }
};

// Fund account from wallet
export const fundAccountFromWallet = async (accountId, amount) => {
  try {
    const response = await api.post('/accounts/fund', { accountId, amount });
    return response.data;
  } catch (error) {
    console.error('Error funding account:', error);
    throw error;
  }
};

// Transfer funds from account to wallet
export const transferAccountToWallet = async (accountId, amount) => {
  try {
    const response = await api.post('/accounts/transfer-to-wallet', { accountId, amount });
    return response.data;
  } catch (error) {
    console.error('Error transferring to wallet:', error);
    throw error;
  }
};

// Get user wallet balance
export const getUserWalletBalance = async () => {
  try {
    // The wallet data is included in the user data from /auth/me
    const response = await api.get('/auth/me');
    if (response.data.status === 1 && response.data.data) {
      return {
        wallet: response.data.data.wallet,
        accounts: response.data.data.Accounts || []
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching wallet balance:', error);
    throw error;
  }
};

// Format balance for display
export const formatBalance = (balance, currency = 'USD') => {
  if (!balance || balance === 0) return `0.00 ${currency}`;
  
  const numBalance = parseFloat(balance);
  if (isNaN(numBalance)) return `0.00 ${currency}`;
  
  return `${numBalance.toFixed(2)} ${currency}`;
};

// Get account type display name
export const getAccountTypeDisplay = (type) => {
  switch (type) {
    case 'demo':
      return 'Demo Account';
    case 'real':
      return 'Real Account';
    default:
      return type;
  }
};

// Get account status display
export const getAccountStatusDisplay = (status) => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'pending_verification':
      return 'Pending Verification';
    case 'suspended':
      return 'Suspended';
    default:
      return status;
  }
};
