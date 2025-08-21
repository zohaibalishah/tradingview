const User = require('../models/User.model');
const jwt = require('jsonwebtoken');
module.exports.authenticate = async (req, res, next) => {
  const authorization = req.header('Authorization');
  if (!authorization) {
    return res.status(401).json({ status: 1, message: 'unauthorized' });
  }
  const token = authorization.split(' ')[1];
  try {
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        return res.status(403).json({ status: 1, message: err.message });
      }
      try {
        const user = await User.findOne({
          where: { id: decoded.id },
        });
        if (!user) {
          return res.status(404).json({ status: 1, message: 'user not found' });
        }

        if (req.byPassAuth) {
          req.user = user?.dataValues;
          next();
          return;
        }
        req.user = user?.dataValues;
        next();
      } catch (error) {
        return res.status(500).json({ status: 1, message: error.message });
      }
    });
  } catch (error) {
    return res.status(403).json({ status: 1, message: error?.message });
  }
};



module.exports.optionalAuthenticate = async (req, res, next) => {
  const authorization = req.header('Authorization');
  const provider = req.header('provider');
  if (!authorization) {
    req.user = null;
    return next();
  }
  const token = authorization.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findOne({
      where: {
        id: decoded.id,
      },
    });
    req.user = user?.dataValues || null;
  } catch (error) {
    req.user = null;
  }

  next();
};

module.exports.checkUser = async (req, res, next) => {
  if (req.user) {
    return next();
  }
  return res.status(401).json({ status: 1, message: 'User not authenticated' });
};

module.exports.frogotAuthenticateSite = async (req, res, next) => {
  const authorization = req.header('Authorization');
  if (!authorization) {
    return res.status(401).json({ status: 1, message: 'unauthorized' });
  }
  const token = authorization.split(' ')[1];

  try {
    jwt.verify(token, 'fotgot#@%$#@$$$#', async (err, decoded) => {
      if (err) {
        return res.status(403).json({ status: 1, message: err.message });
      }
      try {
        const user = await User.findOne({
          where: { id: decoded.id },
        });
        if (!user) {
          return res
            .status(404)
            .json({ status: 1, message: 'User not found'});
        }

        if (req.byPassAuth) {
          req.user = user?.dataValues;
          next();
          return;
        }

        req.user = user?.dataValues;
        next();
      } catch (error) {
        return res.status(500).json({ status: 1, message: error.message });
      }
    });
  } catch (error) {
    return res.status(403).json({ status: 1, message: error?.message });
  }
};



module.exports.authenticateSocketSite = async (socket, next) => {
  const token = socket.handshake.query.token;
  const connectionType = socket.handshake.query.connectionType;
  const provider = socket.handshake.query.provider;

  if (!token) {
    return next(new Error('unauthorized'));
  }

  if (provider === 'google') {
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience:
          '1045648398363-cqfo2g56dv7dggt38rvlrdc4g75ea1jp.apps.googleusercontent.com',
      });

      const payload = ticket.getPayload();
      const user = await User.findOne({
        where: {
          googleId: payload.sub,
          email: payload.email.toLowerCase(),
        },
      });
      socket.user = user?.dataValues;
      return next();
    } catch (error) {
      return next(new Error(error.message));
    }
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
    if (err) {
      return next(new Error(err.message));
    }
    try {
      const user = await User.findOne({
        where: { id: decoded.id },
      });
      if (!user) {
        return next(new Error('user not found'));
      }
      socket.user = user?.dataValues;
      next();
    } catch (error) {
      return next(new Error(error.message));
    }
  });
};
