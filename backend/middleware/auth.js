const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'vit_secret_key_2026';

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Format: Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token.' });
  }
};

const requireRole = (role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized. User not authenticated.' });
    }
    if (req.user.role !== role) {
      return res.status(403).json({ message: `Access forbidden. Requires ${role} role.` });
    }
    next();
  };
};

module.exports = { verifyToken, requireRole, JWT_SECRET };
