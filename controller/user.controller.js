const Trade = require('../models/Trading.model');
const Account = require('../models/Account.model');
const WalletTransaction = require('../models/WalletTransaction.model');


exports.uploadDeposit = async (req, res) => {
  const { amount, proofImage } = req.body;

  const tx = await WalletTransaction.create({
    userId: req.user.id,
    type: 'deposit',
    amount,
    status: 'pending',
    proofImage
  });

  res.json(tx);
};


