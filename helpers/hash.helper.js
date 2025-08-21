const bcrypt = require('bcryptjs');
const JWT = require('jsonwebtoken');
const crypto = require('crypto');

// Enhanced password validation
const validatePassword = (password) => {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  const errors = [];
  
  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (!hasUpperCase) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!hasLowerCase) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!hasNumbers) {
    errors.push('Password must contain at least one number');
  }
  if (!hasSpecialChar) {
    errors.push('Password must contain at least one special character');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

module.exports.getHashValue = async (value) => {
  // Increase salt rounds for better security
  const saltRounds = 12;
  const salt = await bcrypt.genSalt(saltRounds);
  const hashValue = await bcrypt.hash(value, salt);
  return hashValue;
};

module.exports.isPasswordMatch = async (password, userpassword) => {
  try {
    const isMatch = await bcrypt.compare(password, userpassword);
    return isMatch;
  } catch (error) {
    console.error('Password comparison error:', error);
    return false;
  }
};

module.exports.signAccessToken = async (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion,
    iat: Math.floor(Date.now() / 1000),
  };
  
  const token = await JWT.sign(payload, process.env.JWT_SECRET || "secret123", {
    expiresIn: '24h', // Reduced from 30d for better security
    issuer: 'trading-app',
    audience: 'trading-app-users',
  });
  return token;
};

module.exports.signAccessForgotToken = async (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role,
    tokenVersion: user.tokenVersion,
    type: 'password-reset',
  };
  
  const token = await JWT.sign(payload, process.env.JWT_SECRET || "secret123", {
    expiresIn: '15m',
    issuer: 'trading-app',
    audience: 'trading-app-users',
  });
  return token;
};

module.exports.generateResetCode = () => {
  // Generate a more secure 6-digit code
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  return resetCode;
};

module.exports.generateResetToken = () => {
  const resetToken = crypto.randomBytes(32).toString('hex');
  return resetToken;
};

module.exports.verifyResetToken = (token, hashedToken) => {
  try {
    const hashedInputToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');
    return hashedInputToken === hashedToken;
  } catch (error) {
    console.error('Token verification error:', error);
    return false;
  }
};

module.exports.getOtp = () => {
  // Generate a more secure 6-digit OTP
  return Math.floor(100000 + Math.random() * 900000);
};

module.exports.generateRefreshToken = (user) => {
  const payload = {
    id: user.id,
    type: 'refresh',
  };
  
  return JWT.sign(payload, process.env.REFRESH_TOKEN_SECRET || "refresh-secret", {
    expiresIn: '7d',
    issuer: 'trading-app',
    audience: 'trading-app-users',
  });
};

// Export password validation
module.exports.validatePassword = validatePassword;

