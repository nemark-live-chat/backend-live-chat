const { getPool, sql } = require('../infra/sql/pool');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

module.exports = asyncHandler(async (req, res, next) => {
  const workspaceId = req.headers['x-workspace-id'];
  
  if (!workspaceId) {
    return next(new AppError('Missing x-workspace-id header', 400));
  }

  const userKey = req.user?.UserKey || req.user?.key; // Adjust based on user object structure
  
  if (!userKey) {
    return next(new AppError('Unauthorized: User context required', 401));
  }

  const pool = getPool();
  
  // Resolve WorkspaceKey and MembershipKey in one go (optimize)
  const result = await pool.request()
    .input('workspaceId', sql.UniqueIdentifier, workspaceId)
    .input('userKey', sql.BigInt, userKey)
    .query(`
      SELECT 
        w.WorkspaceKey,
        m.MembershipKey
      FROM iam.Workspaces w
      LEFT JOIN iam.Memberships m ON m.WorkspaceKey = w.WorkspaceKey AND m.UserKey = @userKey
      WHERE w.WorkspaceId = @workspaceId
    `);

  const record = result.recordset[0];
  
  if (!record) {
    return next(new AppError('Workspace not found', 404));
  }
  
  if (!record.MembershipKey) {
    return next(new AppError('Forbidden: Not a member of this workspace', 403));
  }

  // Attach context
  req.workspaceKey = record.WorkspaceKey;
  req.membershipKey = record.MembershipKey;
  
  // For authorize.js compatibility which expects req.user.membershipKey
  if (req.user) {
    req.user.membershipKey = record.MembershipKey;
  }

  next();
});
