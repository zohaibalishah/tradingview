const jwt = require("jsonwebtoken");

module.exports = function auth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        status: 0, 
        message: "Authorization header missing or invalid format" 
      });
    }

    const token = authHeader.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ 
        status: 0, 
        message: "Access token required" 
      });
    }

    // Verify token with proper error handling
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "secret123");
    
    // Add additional security checks
    if (!decoded.id || !decoded.email) {
      return res.status(403).json({ 
        status: 0, 
        message: "Invalid token payload" 
      });
    }

    // Add token expiration check
    if (decoded.exp && Date.now() >= decoded.exp * 1000) {
      return res.status(401).json({ 
        status: 0, 
        message: "Token has expired" 
      });
    }

    req.user = decoded;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    
    if (err.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        status: 0, 
        message: "Invalid token" 
      });
    }
    
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        status: 0, 
        message: "Token has expired" 
      });
    }
    
    return res.status(500).json({ 
      status: 0, 
      message: "Authentication error" 
    });
  }
};
