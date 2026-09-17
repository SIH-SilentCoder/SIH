const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');
const User = require('../models/User.model');

const JWT_SECRET = process.env.JWT_SECRET || 'kisan-secret-key-change-this-in-production-2026';

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Authentication required. Please login.');
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      throw new ApiError(401, 'Authentication token missing.');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new ApiError(401, 'Your session has expired. Please login again.');
      }
      throw new ApiError(401, 'Invalid authentication token.');
    }

    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      throw new ApiError(401, 'User not found. Please login again.');
    }

    if (!user.isActive) {
      throw new ApiError(403, 'Your account has been deactivated. Contact support.');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

const generateTokens = (userId, role) => {
  const accessToken = jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
  return { accessToken };
};

module.exports = { authenticate, generateTokens };
