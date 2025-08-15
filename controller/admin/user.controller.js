const WalletTransaction = require('../../models/WalletTransaction.model');
const Account = require('../../models/Account.model');

// exports.createUser = async (req, res) => {
//   const { name, email, password } = req.body;
//   const brokerId = req.user.id; // assuming logged in as broker

//   const user = await User.create({
//     name,
//     email,
//     password,
//     createdBy: brokerId
//   });

//   // Create default real account
//   const account = await Account.create({
//     userId: user.id,
//     type: 'real',
//     balance: 0,
//     isActive: true
//   });

//   user.activeAccountId = account.id;
//   await user.save();

//   res.json({ user, account });
// };

exports.verifyDeposit = async (req, res) => {
  const { id } = req.params;

  const tx = await WalletTransaction.findByPk(id);
  if (!tx || tx.status !== 'pending') {
    return res.status(400).json({ message: 'Invalid transaction' });
  }

  tx.status = 'completed';
  await tx.save();

  const account = await Account.findOne({ where: { userId: tx.userId, type: 'real' } });
  account.balance += parseFloat(tx.amount);
  await account.save();

  res.json({ message: 'Deposit approved', account });
};
