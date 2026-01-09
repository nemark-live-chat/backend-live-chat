const { getPool, sql } = require('../infra/sql/pool');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const constants = require('../config/constants');

// Cache for permission code -> key mapping
let permissionCache = null;
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Load all permissions from DB and cache them
 */
const loadPermissions = async () => {
  const now = Date.now();
  if (permissionCache && cacheExpiry > now) {
    return permissionCache;
  }

  const pool = getPool();
  const result = await pool.request().query(`
    SELECT PermissionKey, Code FROM iam.Permissions
  `);

  permissionCache = {};
  for (const row of result.recordset) {
    permissionCache[row.Code] = row.PermissionKey;
  }
  cacheExpiry = now + CACHE_TTL;

  return permissionCache;
};

/**
 * Clear permission cache (call after seeding permissions)
 */
const clearCache = () => {
  permissionCache = null;
  cacheExpiry = 0;
};

/**
 * Authorization middleware factory
 * @param {string} permissionCode - Permission code like 'widget.manage'
 * @param {object} options - Optional settings
 * @returns {Function} Express middleware
 */
const authorize = (permissionCode, options = {}) => {
  return asyncHandler(async (req, res, next) => {
    const membershipKey = req.user?.membershipKey;
    if (!membershipKey) {
      return next(new AppError('Forbidden: No membership context', 403));
    }

    // Load permissions from DB (cached)
    const permissions = await loadPermissions();
    const permissionKey = permissions[permissionCode];

    if (!permissionKey) {
      console.error(`Permission not found in DB: ${permissionCode}`);
      console.error('Available permissions:', Object.keys(permissions));
      return next(new AppError(`Server Configuration Error: Permission "${permissionCode}" not found. Run seed_permissions.sql`, 500));
    }

    let resourceKey = 0;
    // TODO: Resolve resource key for fine-grained permissions

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
module.exports.clearCache = clearCache;
