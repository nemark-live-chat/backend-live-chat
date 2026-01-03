const tokenUtils = require('../utils/token.utils');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { getPool, sql } = require('../infra/sql/pool');
const constants = require('../config/constants');

const authenticate = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('Unauthorized: No token provided', 401));
  }

  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = tokenUtils.verifyAccessToken(token);
    
    // Optional: Check if user exists and is active (Standard Enterprise Check)
    // This adds a DB call per request. For high perf, maybe cache or skip.
    // Given the requirements "Verify access token + lấy identity", we should probably fetch basic info.
    
    // Mock user for now or fetch from DB?
    // Let's do a lightweight DB check if strictly required, or trust the token if short-lived (15m).
    // Trusting token is O(0). 
    // IF we need to enforce "Logout All" instantly, we might need to check a "TokenVersion" or "LastLogoutAt" in DB.
    // The requirement says "Logout All" -> Revoke all sessions. Access tokens are short lived (15m).
    // So we can wait 15m for access token to die, or check DB. 
    // "GET /auth/me -> Verify access token + lấy identity" implies we might fetch.
    
    req.user = { 
      key: decoded.sub, 
      userId: decoded.sub // Map sub to key
    };
    
    // Check if Status is Active?
    // We can do this in the Repo layer or here.
    
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Unauthorized: Token expired', 401));
    }
    return next(new AppError('Unauthorized: Invalid token', 401));
  }
});

module.exports = authenticate;
