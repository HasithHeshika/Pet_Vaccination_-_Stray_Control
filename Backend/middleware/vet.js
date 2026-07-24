const vetMiddleware = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  const role = req.user.role || (req.user.isAdmin ? 'admin' : 'user');

  if (role !== 'veterinarian' && role !== 'admin' && !req.user.isAdmin) {
    return res.status(403).json({ message: 'Access denied. Veterinarians or Admins only.' });
  }

  next();
};

module.exports = vetMiddleware;
