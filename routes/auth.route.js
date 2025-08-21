const express = require('express');
const router = express.Router();
const authController= require('../controller/auth.controller');
const { authenticate ,frogotAuthenticateSite} = require('../helpers/auth.helper');
const JWT = require('jsonwebtoken');
const { signAccessToken } = require('../helpers/hash.helper');
const User = require('../models/User.model');


router.post('/checkEmail', authController.checkEmail);
router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/logout', authenticate, authController.logout);
router.get('/me', authenticate, authController.currentUser);
router.post('/update-password', authenticate, authController.updatePassword);

router.post('/verifyOtp', authController.verifyOtp);
router.post('/resend-otp', authController.resendOtp);
// forgot reset password
router.post('/forgot-password-email', authController.forgotPasswordEmail);
// phone
router.post('/forgot-password', authController.forgotPasswordEmail);
router.post('/verifyForgotOTP', authController.verifyForgotOTP);
router.post('/reset-password',frogotAuthenticateSite, authController.resetPasswordEmail);
router.put('/update-profile', authenticate, authController.updateProfile);
router.delete('/delete-account', authenticate, authController.deleteAccount);
router.post(
  '/deactivate-account',
  authenticate,
  authController.deactivateAccount
);


router.post("/token", async (req, res) => {
  const refreshToken = req.cookies.refreshToken; // Retrieve from cookies
  if (!refreshToken) return res.sendStatus(401); // No refresh token provided
  try {
    // Verify refresh token
    const user = JWT.verify(refreshToken, 'process.env.REFRESH_TOKEN_SECRET');
    const updatedUser = await User.findByPk(user.id);
    const accessToken = await signAccessToken(updatedUser);
    res.json({ accessToken });
  } catch (err) {
    return res.sendStatus(403); // Invalid refresh token
  }
});

module.exports = router;
