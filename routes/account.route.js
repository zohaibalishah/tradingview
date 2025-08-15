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




module.exports = router;
