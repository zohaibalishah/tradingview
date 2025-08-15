const User = require('../models/User.model');
const {
  isPasswordMatch,
  signAccessToken,
  getHashValue,
  generateResetCode,
  getOtp,
  signAccessForgotToken,
  generateRefreshToken,
} = require('../helpers/hash.helper');
const { RESPONSE_MESSAGES, ACCOUNT_STATUSES } = require('../config/constants');
const { Op } = require('sequelize');
const Wallet = require('../models/Wallet.model');
const Account = require('../models/Account.model');

module.exports.checkEmail = async (req, res) => {
  try {
    const { email, phone, loginType } = req.body;

    if (!email && !phone) {
      return res
        .status(400)
        .json({ status: 0, message: RESPONSE_MESSAGES.REQUIRED_FIELDS_EMPTY });
    }

    let user;
    let message;
    if (email) {
      if (!email.includes('@')) {
        return res
          .status(400)
          .json({ status: 0, message: 'invalid email formate' });
      }
      user = await User.findOne({
        where: { email: email.toLowerCase() },
      });
      message = 'Email already exist';
    } else if (phone) {
      user = await User.findOne({
        where: { phone },
      });
      message = 'Phone number already exist';
    }

    if (user) {
      return res.status(409).json({ status: 0, message });
    }
    return res.status(200).json({ status: 1 });
  } catch (e) {
    return res.status(500).json({ status: 0, message: e.message });
  }
};

module.exports.login = async (req, res) => {
  try {
    const { email, password, phone } = req.body;

    if (!email && !phone) {
      return res
        .status(400)
        .json({ status: 0, message: RESPONSE_MESSAGES.REQUIRED_FIELDS_EMPTY });
    }

    let user;
    if (email) {
      if (!email.includes('@')) {
        return res
          .status(400)
          .json({ status: 0, message: 'Invalid email formate' });
      }
      user = await User.findOne({
        where: { email: email.toLowerCase() },
      });
    } else if (phone) {
      user = await User.findOne({
        where: { phone },
      });
    }

    if (!user) {
      return res
        .status(404)
        .json({ status: 0, message: RESPONSE_MESSAGES.ACCOUNT_NOT_FOUND });
    }

    if (user.accountStatus === ACCOUNT_STATUSES.FREEZED) {
      return res
        .status(403)
        .json({ status: 0, message: RESPONSE_MESSAGES.USER_FREEZED });
    }

    if (!user.password && user.googleId) {
      return res
        .status(404)
        .json({ status: 0, message: 'Your account is connected via google' });
    }
    const isMatch = await isPasswordMatch(password, user.password);
    if (!isMatch) {
      return res
        .status(401)
        .json({ status: 0, message: RESPONSE_MESSAGES.INVALID_PASSWORD });
    }

    await User.update(
      { lastLogin: new Date(), tokenVersion: user.tokenVersion + 1 },
      {
        where: { id: user.id },
      }
    );
    const updatedUser = await User.findByPk(user.id, {
      include: [
        {
          model: Account,
          required: false,
          where: { isActive: true }, 
       
        },
        {
          model: Wallet,
          as:'wallet'
        },
      ],
    });
    const token = await signAccessToken(updatedUser);
    const { password: _, ...userWithoutPassword } = updatedUser.toJSON();

    return res.status(200).json({
      status: 1,
      user: { ...userWithoutPassword, token },
      message: 'Login successfully',
    });
  } catch (e) {
    return res.status(500).json({ status: 0, message: e.message });
  }
};

module.exports.signup = async (req, res) => {
  try {
    const { email, password, phone, name } = req.body;
    const passwordRegex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

    if ((!email && !phone) || !password) {
      return res.status(400).json({ status: 0, message: 'fields required' });
    }

    // if (!passwordRegex.test(password)) {
    //   return res
    //     .status(400)
    //     .json({
    //       status: 0,
    //       message:
    //         'Password must contain at least 8 characters, including upper/lower case, numbers, and special characters',
    //     });
    // }

    let existingUser;
    if (email && password) {
      existingUser = await User.findOne({
        where: { email: email.toLowerCase() },
      });
      if (existingUser) {
        return res
          .status(409)
          .json({ status: 0, message: 'Email already exist' });
      }

      const newUser = await User.create({
        initialProvider: 'email',
        email: email.toLowerCase(),
        password: password,
        name: name,
        tokenVersion: 0,
        lastLogin: new Date(),
        otp: '1234',
        otpGeneratedTime: new Date(),
        otpExpirationTime: new Date(new Date().getTime() + 5 * 60000),
      });
   
      const updatedUser = await User.findByPk(newUser.id);
      const token = await signAccessToken(updatedUser);
      const { password: _, ...userWithoutPassword } = updatedUser.toJSON();
      return res.status(200).json({
        status: 1,
        ...userWithoutPassword,
        token: token,
        message: 'Account Created verify your OTP',
      });
    } else if (phone && password) {
      existingUser = await User.findOne({
        where: { phone: phone },
      });
      if (existingUser) {
        return res
          .status(409)
          .json({ status: 0, message: 'Phone number already exist' });
      }

      const newUser = await User.create({
        initialProvider: 'phone',
        phone: phone,
        name: name,
        password: password,
        tokenVersion: 0,
        lastLogin: new Date(),
        otp: '1234',
        otpGeneratedTime: new Date(),
        otpExpirationTime: new Date(new Date().getTime() + 5 * 60000),
      });

      // Create real account
      const realAccount = await Account.create({
        userId: newUser.id,
        type: 'real',
        balance: 0,
        isActive: false,
        status: 'pending_verification',
      });

      // Create wallet for real account
      await Wallet.create({
        accountId: realAccount.id,
        availableBalance: 0,
      });
      const updatedUser = await User.findByPk(newUser.id);
      const token = await signAccessToken(updatedUser);
      const { password: _, ...userWithoutPassword } = updatedUser.toJSON();
      return res.status(200).json({
        status: 1,
        ...userWithoutPassword,
        accounts: [
          {
            id: realAccount.id,
            type: realAccount.type,
            balance: realAccount.balance,
            isActive: realAccount.isActive,
          },
        ],
        token: token,
        message: 'Account Created verify your OTP',
      });
    }
  } catch (e) {
    return res.status(500).json({ status: 0, message: e.message });
  }
};

module.exports.signupPhone = async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) {
      return res
        .status(400)
        .json({ status: 0, message: RESPONSE_MESSAGES.REQUIRED_FIELDS_EMPTY });
    }
    const existingUser = await User.findOne({
      where: { phone: phone },
    });
    if (existingUser) {
      return res
        .status(409)
        .json({ status: 0, message: 'Phone number already exist' });
    }

    const newUser = await User.create({
      initialProvider: 'phone',
      phone: phone.toLowerCase(),
      password: password,
      tokenVersion: 0,
      lastLogin: new Date(),
      otp: '1234',
      otpGeneratedTime: new Date(),
      otpExpirationTime: new Date(new Date().getTime() + 5 * 60000),
    });

    return res.status(200).json({
      status: 1,
      message: 'Account Created verify your OTP',
    });
  } catch (e) {
    return res.status(500).json({ status: 0, message: e.message });
  }
};

module.exports.currentUser = async (req, res) => {
  try {

    const user = await User.findByPk(req.user.id, {
      include: [
        {
          model: Account,
          required: false,
          where: { isActive: true }, 
       
        },
        {
          model: Wallet,
          as:'wallet'
        },
      ],
    });
    if (!user) {
      return res
        .status(404)
        .json({ status: 0, message: RESPONSE_MESSAGES.USER_NOT_FOUND });
    }
    const { password: _, ...userWithoutPassword } = user.toJSON();
    return res.status(200).json({
      status: 1,
      data: { ...userWithoutPassword },
    });
  } catch (e) {
    return res.status(500).json({ status: 0, message: e.message });
  }
};

module.exports.forgotPasswordEmail = async (req, res) => {
  try {
    const { email, phone, authType } = req.body;
    if (!email && !phone) {
      return res.status(400).json({
        status: 0,
        message: RESPONSE_MESSAGES.EMAIL_OR_PHONE_REQUIRED,
      });
    }

    let user;
    if (email) {
      if (!email.includes('@')) {
        return res
          .status(400)
          .json({ status: 0, message: RESPONSE_MESSAGES.INVALID_EMAIL_FORMAT });
      }
      user = await User.findOne({ where: { email: email.toLowerCase() } });
    } else if (phone) {
      user = await User.findOne({ where: { phone } });
    }

    if (!user) {
      return res
        .status(404)
        .json({ status: 0, message: RESPONSE_MESSAGES.USER_NOT_FOUND });
    }

    // const resetToken = generateResetCode();
    await user.update({
      fotgototp: '1234',
      fotgototpGeneratedTime: new Date(),
      fotgototpExpirationTime: new Date(new Date().getTime() + 1 * 60000),
    });

    let message;
    if (email) {
      message = RESPONSE_MESSAGES.PASSWORD_RESET_TOKEN_SENT;
    } else if (phone) {
      message = 'Reset Otp send to your phone';
    }
    return res.status(200).json({
      status: 1,
      message: message,
    });
  } catch (e) {
    return res.status(500).json({ status: 0, message: e.message });
  }
};

module.exports.resetPasswordEmail = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({
        status: 0,
        message: RESPONSE_MESSAGES.RESET_TOKEN_AND_NEW_PASSWORD_REQUIRED,
      });
    }
    let user = await User.findOne({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(404).json({
        status: 0,
        message: RESPONSE_MESSAGES.USER_NOT_FOUND,
      });
    }

    const hashedPassword = await getHashValue(password);
    await user.update({
      password: hashedPassword,
      resetToken: null,
      tokenVersion: user.tokenVersion + 1,
    });
    return res.status(200).json({
      status: 1,
      message: RESPONSE_MESSAGES.PASSWORD_RESET_SUCCESSFULLY,
    });
  } catch (e) {
    return res.status(500).json({ status: 0, message: e.message });
  }
};

exports.getProfile = async (req, res) => {
  const { id } = req.user;
  try {
    const user = await User.findByPk(id);
    if (user) {
      return res.status(200).json({ status: 1, ...user });
    } else {
      return res.status(404).json({ status: 0, message: 'User not found' });
    }
  } catch (error) {
    return res.status(500).json({ status: 0, message: error?.message });
  }
};

exports.updatePassword = async (req, res) => {
  const { id } = req.user;
  const { newPassword, currentPassword, confirmPassword } = req.body;

  if (newPassword !== confirmPassword) {
    return res.status(400).json({
      status: 0,
      message: 'New password and confirm password do not match',
    });
  }

  if (newPassword === currentPassword) {
    return res.status(400).json({
      status: 0,
      message: "New password can't be the same as the previous password",
    });
  }

  try {
    const user = await User.findByPk(id);
    if (user) {
      const isMatch = await isPasswordMatch(
        currentPassword,
        user.dataValues.password
      );
      if (!isMatch) {
        return res
          .status(401)
          .json({ status: 0, message: 'Current password is incorrect' });
      }
      user.password = await getHashValue(newPassword);
      await user.save();
      return res.status(200).json({
        status: 1,
        message: 'Password updated successfully',
      });
    } else {
      return res.status(404).json({ status: 0, message: 'User not found' });
    }
  } catch (error) {
    return res.status(500).json({ status: 0, message: error?.message });
  }
};

exports.updateProfile = async (req, res) => {
  const { id } = req.user;
  const {
    name,
    dob,
    gender,
    address,
    country,
    city,
    latitude,
    longitude,
    area,
    phone,
    profilePic,
    email,
  } = req.body;

  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ status: 0, message: 'User not found' });
    }
    if (email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser && existingUser.id !== id) {
        return res.status(409).json({
          status: 0,
          message: 'Email already in use by another account',
        });
      }
    }
    if (phone) {
      const existingUser = await User.findOne({ where: { phone } });
      if (existingUser && existingUser.id !== id) {
        return res.status(409).json({
          status: 0,
          message: 'phone already in use by another account',
        });
      }
    }

    const updatedFields = {
      name: name || user.name,
      dob: dob || user.dob,
      gender: gender || user.gender,
      address: address || user.address,
      country: country || user.country,
      city: city || user.city,
      latitude: latitude || user.latitude,
      longitude: longitude || user.longitude,
      area: area || user.area,
      phone: phone || user?.phone,
      profilePic: profilePic || user?.profilePic,
    };

    await user.update(updatedFields);
    const { password: _, ...userWithoutPassword } = user.toJSON();
    return res.status(200).json({
      status: 1,
      ...userWithoutPassword,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    return res.status(500).json({ status: 0, message: error?.message });
  }
};

exports.deleteAccount = async (req, res) => {
  const { id } = req.user;
  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ status: 0, message: 'User not found' });
    }

    await Featured.destroy({ where: { userId: user.id } });
    await Listings.destroy({ where: { userId: user.id } });
    await Wishlist.destroy({ where: { userId: user.id } });
    await Notification.destroy({ where: { createdFor: user.id } });

    const conversations = await Conversation.findAll({
      where: {
        [Op.or]: [{ creatorId: user.id }, { participantId: user.id }],
      },
    });

    const conversationIds = conversations.map((conv) => conv.id);
    if (conversationIds.length > 0) {
      await Message.destroy({ where: { conversationId: conversationIds } });
    }
    await Conversation.destroy({
      where: {
        id: conversationIds,
      },
    });
    await user.destroy();
    return res.status(200).json({
      status: 1,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({ status: 0, message: error?.message });
  }
};

exports.deactivateAccount = async (req, res) => {
  const { id } = req.user;
  try {
    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ status: 0, message: 'User not found' });
    }
    if (user.accountStatus === 'Deactivated') {
      return res
        .status(400)
        .json({ status: 0, message: 'Account is already deactivated' });
    }

    await user.update({
      deactivatedDate: 'Deactivated',
      deactivatedDate: new Date(),
      tokenVersion: user.tokenVersion + 1,
    });
    return res.status(200).json({
      status: 1,
      message: 'Account deactivated successfully',
    });
  } catch (error) {
    return res.status(500).json({ status: 0, message: error?.message });
  }
};

exports.verifyForgotOTP = async (req, res) => {
  try {
    const { email, fotgototp, phone } = req.body;
    if (!fotgototp || (!email && !phone)) {
      return res
        .status(400)
        .json({ status: 0, message: 'Fields are required' });
    }

    const user = await User.findOne({
      where: email ? { email: email.toLowerCase() } : { phone },
    });

    if (!user) {
      return res.status(404).json({ status: 0, message: 'Account not found' });
    }

    if (!user) {
      return res.status(404).json({ status: 0, message: 'Account not found' });
    }

    if (user.fotgototp !== fotgototp) {
      return res.status(400).json({ status: 0, message: 'Invalid OTP' });
    }
    const currentDate = Date.now();
    const otpExpiry = new Date(user.fotgototpExpirationTime).getTime();
    if (currentDate > otpExpiry) {
      return res
        .status(400)
        .json({ status: 0, message: 'Your OTP has expired' });
    }
    user.fotgototp = null;
    user.fotgototpExpirationTime = null;
    user.fotgototpGeneratedTime = null;
    await user.save();
    const token = await signAccessForgotToken(user);
    return res.status(200).json({
      status: 1,
      token,
      message: 'OTP verified successfully',
    });
  } catch (err) {
    return res.status(500).json({ status: 0, message: err.message });
  }
};

exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp, phone } = req.body;
    if (!otp || (!email && !phone)) {
      return res
        .status(400)
        .json({ status: 0, message: 'Fields are required' });
    }

    const user = await User.findOne({
      where: email ? { email: email.toLowerCase() } : { phone },
    });

    if (!user) {
      return res.status(404).json({ status: 0, message: 'Account not found' });
    }
    if (user.dataValues.otp !== otp) {
      return res.status(400).json({ status: 0, message: 'Invalid OTP' });
    }
    const currentDate = Date.now();
    const otpExpiry = new Date(user.otpExpirationTime).getTime();

    if (currentDate > otpExpiry) {
      return res
        .status(400)
        .json({ status: 0, message: 'Your OTP has expired' });
    }

    user.accountStatus = 'Activated';
    if (email) user.emailVerified = true;
    if (phone) user.phoneVerified = true;
    user.otp = null;
    user.otpExpirationTime = null;
    user.otpGeneratedTime = null;
    await user.save();

    const token = await signAccessToken(user);
    const { password: _, ...userWithoutPassword } = user.toJSON();
    return res.status(200).json({
      status: 1,
      token,
      ...userWithoutPassword,
      message: 'OTP verified successfully',
    });
  } catch (err) {
    return res.status(500).json({ status: 0, message: err.message });
  }
};

exports.resendOtp = async (req, res) => {
  try {
    const { email, phone } = req.body;
    if (!email && !phone) {
      return res
        .status(400)
        .json({ status: 0, message: exceptionMessage.otp.missingParameters });
    }

    const user = await User.findOne({
      where: email ? { email: email.toLowerCase() } : { phone },
    });

    if (!user) {
      return res.status(404).json({
        status: 0,
        message: email
          ? exceptionMessage.user.notFoundWithEmail
          : exceptionMessage.user.notFoundWithContact,
      });
    }

    const now = new Date();
    const otp = getOtp();
    user.otp = otp;
    user.otp_generated_time = now;
    user.otp_expiration_time = new Date(now.getTime() + 5 * 60000); // 5 minutes expiration
    user.otp_request_count += 1;
    user.isOtpUsed = false;

    if (user.otp_request_count >= 5) {
      user.otpExceededLimitTime = now;
    }

    // if (email) {
    //   await module.exports.reSendOtpEmail(email, otp);
    // } else if (phone) {
    //   await module.exports.sendOtpToPhone(phone, otp);
    // }

    await userService.updateUser(user.id, user);

    return res.status(200).json({
      status: 1,
      otp_expiration_time: user.otp_expiration_time,
      otp_generated_time: now,
    });
  } catch (err) {
    return res.status(500).json({ status: 0, message: err.message });
  }
};
