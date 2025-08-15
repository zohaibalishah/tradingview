// await Wallet.increment('availableBalance', { by: 100 });

const Account = require("../../models/Account.model");
const Wallet = require("../../models/Wallet.model");
const WalletTransaction = require("../../models/WalletTransaction.model");
// admin/verify-deposit/:id

// POST /api/wallets/admin-deposit
// {
//   "userId": 123,
//   "amount": 100,
//   "note": "Manual bank transfer"
// }
const adminDeposit = async (req, res) => {
    const { userId, amount, note } = req.body;
  
    const account = await Account.findOne({ where: { userId, type: 'real' }, include: Wallet });
    if (!account || !account.Wallet) return res.status(404).json({ message: 'Wallet not found' });
  
    await WalletTransaction.create({
      walletId: account.Wallet.id,
      type: 'deposit',
      amount,
      status: 'completed',
      reference: note
    });
  
    await account.Wallet.increment('availableBalance', { by: amount });
  
    return res.json({ message: 'Funds credited to wallet' });
  };
  