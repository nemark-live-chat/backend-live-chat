const rateLimit = require('express-rate-limit');
const AppError = require('../utils/AppError');

// Global API Limiter
const globalLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  handler: (req, res, next, options) => {
    next(new AppError(options.message, 429));
  }
});

// Auth Route Limiter (Login/Register) - Stricter
const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 requests per IP
  message: 'Too many login attempts from this IP, please try again in 5 minutes.',
  handler: (req, res, next, options) => {
    next(new AppError(options.message, 429));
  }
});

// Email-based limiter (Mock/Simple mem implementation for keying by email)
// Note: In production with multiple instances, use RedisStore
const limiters = {
  global: globalLimiter,
  auth: authLimiter,
};

module.exports = limiters;
