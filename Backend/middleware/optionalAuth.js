const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Attaches req.user when a valid token is sent, but lets anonymous requests through.
// Used on public forms (e.g. stray reports) so the reporter is taken from the token, never the body.
const optionalAuth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');
    // Same rule as the auth middleware: unverified accounts are treated as anonymous
    if (user && (user.isAdmin || user.isVerified !== false) && !user.tokenIssuedBeforePasswordChange(decoded.iat)) {
      req.user = user;
    }
  } catch (error) {
    // Invalid or expired token: treat as anonymous
  }
  next();
};

module.exports = optionalAuth;
