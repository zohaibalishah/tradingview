const express = require('express');
const router = express.Router();
const userController = require('../../controller/admin/user.controller');

router.put('/verify-deposit/:id', userController.verifyDeposit);

module.exports = router;
