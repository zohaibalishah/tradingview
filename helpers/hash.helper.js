const bcrypt = require('bcryptjs');
const JWT = require('jsonwebtoken');
const crypto = require('crypto');

module.exports.getHashValue = async (value) => {
  const salt = await bcrypt.genSalt(10);
  const hashValue = await bcrypt.hash(value, salt);
  return hashValue;
};

module.exports.isPasswordMatch = async (password, userpassword) => {
  const isMatch = await bcrypt.compare(password, userpassword);
  return isMatch;
};

module.exports.signAccessToken = async (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion,
  };
  const token = await JWT.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });
  return token;
};

module.exports.signAccessForgotToken = async (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion,
  };
  const token = await JWT.sign(payload, 'fotgot#@%$#@$$$#', {
    expiresIn: '15m',
  });
  return token;
};
module.exports.generateResetCode = () => {
  const resetCode = Math.floor(1000 + Math.random() * 9000).toString();
  return resetCode;
};
module.exports.generateResetToken = () => {
  const resetToken = crypto.randomBytes(32).toString('hex');
  return resetToken;
};

module.exports.verifyResetToken = (token, hashedToken) => {
  const hashedInputToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');
  return hashedInputToken === hashedToken;
};

module.exports.getOtp = () => Math.floor(1000 + Math.random() * 9000);

module.exports.generateRefreshToken = (user) => {
  const payload = {
    id: user.id,
  };
  return JWT.sign(payload, 'process.env.REFRESH_TOKEN_SECRET', {
    expiresIn: '1y',
  });
};

