const express = require('express');
const router = express.Router();
const controller= require('../controller/account.controller');
const { authenticate ,frogotAuthenticateSite} = require('../helpers/auth.helper');
const JWT = require('jsonwebtoken');
const { signAccessToken } = require('../helpers/hash.helper');


router.get('/list', authenticate, controller.getAccounts);
router.post('/switch', authenticate, controller.switchAccount);
router.post('/create', authenticate, controller.createAccount);

// POST /api/accounts/fund
// {
//   "accountId": 456,
//   "amount": 100
// }
router.post('/fund', authenticate, controller.fundAccountFromWallet);

// POST /api/accounts/transfer-to-wallet
// {
//   "accountId": 456,
//   "amount": 100
// }
router.post('/transfer-to-wallet', authenticate, controller.transferAccountToWallet);




module.exports = router;
