/**
 * Rate limiter middleware for public widget endpoints
 * Memory-based, simple implementation
 */

const rateLimitStore = new Map();

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.windowStart > 60000) {
      rateLimitStore.delete(key);
    }
  }
}, 300000);

/**
 * Create rate limiter middleware
 * @param {Object} options
 * @param {number} options.windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @param {number} options.max - Max requests per window (default: 60)
 * @param {function} options.keyGenerator - Function to generate key from req
 */
function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 60000;
  const max = options.max || 60;
  const keyGenerator = options.keyGenerator || ((req) => {
    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    const siteKey = req.query.siteKey || req.body?.siteKey || 'default';
    return `${ip}:${siteKey}`;
  });

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    let record = rateLimitStore.get(key);
    
    if (!record || now - record.windowStart > windowMs) {
      // New window
      record = {
        windowStart: now,
        count: 1
      };
      rateLimitStore.set(key, record);
      return next();
    }
    
    record.count++;
    
    if (record.count > max) {
      const retryAfter = Math.ceil((record.windowStart + windowMs - now) / 1000);
      res.set('Retry-After', retryAfter);
      return res.status(429).json({
        status: 'error',
        message: 'Too many requests. Please try again later.',
        retryAfter
      });
    }
    
    next();
  };
}

// Pre-configured rate limiters
const widgetRateLimiter = createRateLimiter({
  windowMs: 60000, // 1 minute
  max: 60 // 60 requests per minute
});

const strictRateLimiter = createRateLimiter({
  windowMs: 60000,
  max: 30 // 30 requests per minute
});

module.exports = {
  createRateLimiter,
  widgetRateLimiter,
  strictRateLimiter
};
