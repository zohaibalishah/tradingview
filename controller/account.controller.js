const { Op } = require('sequelize');
const Account = require('../models/Account.model');
const User = require('../models/User.model')
const Wallet = require('../models/Wallet.model');
const WalletTransaction = require('../models/WalletTransaction.model');
const Trading = require('../models/Trading.model');

module.exports.createAccount = async (req, res) => {
  const userId = req.user.id;
  const { type } = req.body;
  // Prevent multiple real/demo accounts if needed
  const existing = await Account.findOne({ where: { userId, type } });
  if (existing)
    return res.status(400).json({ message: `${type} account already exists.` });

  const initialBalance = type === 'demo' ? 10000 : 0;

  const newAccount = await Account.create({
    userId,
    type,
    balance: initialBalance,
    isActive: true,
    status: type === 'real' ? 'pending_verification' : 'active',
  });

  // Deactivate all other accounts
  await Account.update(
    { isActive: false },
    {
      where: {
        userId,
        id: { [Op.ne]: newAccount.id },
      },
    }
  );

  return res.status(201).json(newAccount);
};

module.exports.switchAccount = async (req, res) => {
  const userId = req.user.id;
  const { accountId } = req.body;

  // Verify account existence and ownership
  const account = await Account.findOne({ where: { id: accountId, userId } });
  if (!account) return res.status(404).json({ message: 'Account not found' });

  // Check if the account is already the user's active account
  const user = await User.findOne({ where: { id: userId } });
  if (user.activeAccountId === accountId) {
    return res.status(400).json({ message: 'Account is already active' });
  }

  // Update user's activeAccountId
  await User.update({ activeAccountId: accountId }, { where: { id: userId } });

  res.json({ message: 'Switched successfully', account });
};
module.exports.getAccounts = async (req, res) => {
    const userId = req.user.id;
    const accounts = await Account.findAll({
      where: { userId },
    });
    res.json(accounts);
  };

  module.exports.fundAccountFromWallet = async (req, res) => {
    const { accountId, amount } = req.body;
    const userId = req.user.id;
  
    // Find the account and verify it belongs to the user
    const account = await Account.findOne({ where: { id: accountId, userId } });
    if (!account) return res.status(404).json({ message: 'Account not found' });
  
    // Find the user's wallet
    const wallet = await Wallet.findOne({ where: { userId } });
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });
  
    if (wallet.balance < amount)
      return res.status(400).json({ message: 'Insufficient wallet balance' });
  
    // Create transaction record
    await WalletTransaction.create({
      walletId: wallet.id,
      userId: userId,
      type: 'transfer',
      amount: amount,
      currency: wallet.currency,
      description: `Transfer to ${account.type} account`,
      status: 'completed',
      balanceBefore: wallet.balance,
      balanceAfter: wallet.balance - amount
    });
  
    // Perform the transfer
    await wallet.decrement('balance', { by: amount });
    await account.increment('balance', { by: amount });
  
    return res.json({ message: 'Trading account funded successfully' });
  };

  module.exports.transferAccountToWallet = async (req, res) => {
    const { accountId, amount } = req.body;
    const userId = req.user.id;
  
    // Find the account and verify it belongs to the user
    const account = await Account.findOne({ where: { id: accountId, userId } });
    if (!account) return res.status(404).json({ message: 'Account not found' });
  
    // Find the user's wallet
    const wallet = await Wallet.findOne({ where: { userId } });
    if (!wallet) return res.status(404).json({ message: 'Wallet not found' });
  
    // Check if account has sufficient balance
    if (account.balance < amount)
      return res.status(400).json({ message: 'Insufficient account balance' });
  
    // Check if account has open trades (prevent transfer if there are open positions)
    const openTradesCount = await Trading.count({
      where: { 
        accountId: accountId, 
        status: 'open' 
      }
    });
  
    if (openTradesCount > 0) {
      return res.status(400).json({ 
        message: 'Cannot transfer funds while you have open trades. Please close all positions first.' 
      });
    }
  
    // Create transaction record
    await WalletTransaction.create({
      walletId: wallet.id,
      userId: userId,
      type: 'transfer',
      amount: amount,
      currency: wallet.currency,
      description: `Transfer from ${account.type} account to wallet`,
      status: 'completed',
      balanceBefore: wallet.balance,
      balanceAfter: wallet.balance + amount
    });
  
    // Perform the transfer
    await account.decrement('balance', { by: amount });
    await wallet.increment('balance', { by: amount });
  
    return res.json({ 
      message: 'Funds transferred to wallet successfully',
      transferredAmount: amount,
      newAccountBalance: account.balance - amount,
      newWalletBalance: wallet.balance + amount
    });
  };