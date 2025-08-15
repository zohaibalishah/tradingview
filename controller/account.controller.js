const { Op } = require('sequelize');
const Account = require('../models/Account.model');

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

  const account = await Account.findOne({ where: { id: accountId, userId } });
  if (!account) return res.status(404).json({ message: 'Account not found' });

  // Activate this account
  await Account.update({ isActive: false }, { where: { userId } });
  await account.update({ isActive: true });
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
  
    const account = await Account.findByPk(accountId, { include: Wallet });
    if (!account || !account.Wallet) return res.status(404).json({ message: 'Account or wallet not found' });
  
    if (account.Wallet.availableBalance < amount)
      return res.status(400).json({ message: 'Insufficient wallet balance' });
  
    await account.Wallet.decrement('availableBalance', { by: amount });
    await account.increment('balance', { by: amount });
  
    return res.json({ message: 'Trading account funded successfully' });
  };