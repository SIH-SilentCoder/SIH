const ApiError = require('../utils/ApiError');

// Global error handler — ensures CORS headers are always sent on error responses
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let error = err;

  if (err.code === '23505' || err.code === 11000) error = new ApiError(409, 'The value is already registered.');

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message,
    }));
    error = new ApiError(400, 'Validation failed', messages);
  }

  const statusCode = error.statusCode || 500;
  const message = error.message || 'An unexpected error occurred. Please try again.';

  if (statusCode >= 500) {
    console.error('❌ Server Error:', err);
  }

  // Ensure CORS headers are attached to error responses
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  res.status(statusCode).json({
    success: false,
    message,
    errors: error.errors || [],
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

// 404 handler
const notFound = (req, res, next) => {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  next(new ApiError(404, `Route ${req.originalUrl} not found`));
};

module.exports = { errorHandler, notFound };
