const { getPool, sql } = require('../infra/sql/pool');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const constants = require('../config/constants');

// Map permission codes to integer keys (from DB)
// In a real app, cache this mapping on startup
const PERMISSION_KEYS = {
  'conversation.reply': 101,
  'conversation.read': 100,
  'conversation.reply': 101,
  'widget.read': 200,   // Ensure this matches DB
  'widget.manage': 201, // Ensure this matches DB
};

const authorize = (permissionCode, options = {}) => {
  return asyncHandler(async (req, res, next) => {
    const membershipKey = req.user?.membershipKey; // Needs to be populated by resolveWorkspace
    if (!membershipKey) {
      return next(new AppError('Forbidden: No membership context', 403));
    }

    const permissionKey = PERMISSION_KEYS[permissionCode];
    if (!permissionKey) {
      return next(new AppError('Server Configuration Error: Unknown permission', 500));
    }

    let resourceKey = 0;
    // Resolve resource key logic ...
    
    const pool = getPool();
    const result = await pool.request()
      .input('membershipKey', sql.BigInt, membershipKey)
      .input('permissionKey', sql.Int, permissionKey)
      .input('resourceKey', sql.BigInt, resourceKey)
      .query(`
        SELECT TOP 1 Effect
        FROM iam.MembershipEffectivePermissions
        WHERE MembershipKey = @membershipKey
          AND PermissionKey = @permissionKey
          AND ResourceKeyNN IN (0, @resourceKey)
        ORDER BY Effect DESC
      `);

    const hasPermission = result.recordset.length > 0 && result.recordset[0].Effect === constants.PERMISSION.ALLOW;

    if (!hasPermission) {
      return next(new AppError('Forbidden: Insufficient permissions', 403));
    }

    next();
  });
};

module.exports = authorize;
