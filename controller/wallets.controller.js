const deposit = async (req, res) => {
    const { accountId, amount, reference } = req.body;
  
    const account = await Account.findOne({ where: { id: accountId, type: 'real' }, include: Wallet });
    if (!account || !account.Wallet) return res.status(400).json({ message: 'Real account/wallet not found.' });
  
    const transaction = await WalletTransaction.create({
      walletId: account.Wallet.id,
      type: 'deposit',
      amount,
      status: 'completed',
      reference
    });
  
    await account.Wallet.increment('availableBalance', { by: amount });
  
    res.status(201).json({ message: 'Deposited', transaction });
  };