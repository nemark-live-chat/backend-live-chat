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
const userRepo = require('../modules/auth/repos/user.repo');

// ...

    const decoded = tokenUtils.verifyAccessToken(token);
    
    // Fetch full user identity to ensure they exist and get latest roles/status
    const user = await userRepo.findById(decoded.sub);
    
    if (!user) {
       return next(new AppError('Unauthorized: User not found', 401));
    }

    // Optional: Check if user is active/banned if 'Status' column exists and is used
    // if (user.Status !== 'Active') ...

    req.user = user;
    
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
