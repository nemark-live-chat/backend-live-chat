const { getPool, sql } = require('../infra/sql/pool');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');

/**
 * Middleware: Require user to be an active member of the workspace
 * 
 * This middleware enforces RULE 1 (Membership-gated access):
 * - User must be authenticated
 * - User must be an active member (Status=1) of the workspace
 * - Workspace must be active (Status=1)
 * 
 * Usage: Apply after authenticate middleware
 * 
 * Reads workspace ID from:
 * 1. Header: x-workspace-id (UUID)
 * 2. Params: req.params.workspaceId (if defined in route)
 * 
 * On success, attaches to req:
 * - req.workspace = { workspaceKey, workspaceId, membershipKey }
 * - req.membershipKey (for backward compatibility)
 * - req.workspaceKey (for backward compatibility)
 * 
 * On failure:
 * - 400 if no workspace ID provided
 * - 403 if user is not a member (no information leakage about workspace existence)
 */
const requireWorkspaceMember = asyncHandler(async (req, res, next) => {
    // Get workspace ID from header or params
    const workspaceId = req.headers['x-workspace-id'] || req.params.workspaceId;

    if (!workspaceId) {
        return next(new AppError('Workspace ID is required (x-workspace-id header)', 400));
    }

    // Get user key from authenticated user
    const userKey = req.user?.UserKey || req.user?.key;

    if (!userKey) {
        return next(new AppError('Unauthorized: User context required', 401));
    }

    const pool = getPool();

    // Check membership in one query (avoids leaking workspace existence)
    const result = await pool.request()
        .input('workspaceId', sql.UniqueIdentifier, workspaceId)
        .input('userKey', sql.BigInt, userKey)
        .query(`
      SELECT 
        w.WorkspaceKey,
        w.WorkspaceId,
        w.Name AS WorkspaceName,
        w.Status AS WorkspaceStatus,
        m.MembershipKey,
        m.MembershipId,
        m.Status AS MembershipStatus
      FROM iam.Workspaces w
      LEFT JOIN iam.Memberships m 
        ON m.WorkspaceKey = w.WorkspaceKey 
        AND m.UserKey = @userKey
      WHERE w.WorkspaceId = @workspaceId
    `);

    const record = result.recordset[0];

    // Always return 403 for any access issue (no information leakage)
    if (!record) {
        // Workspace doesn't exist, but we say "not a member" to avoid leaking info
        return next(new AppError('Forbidden: Not a member of this workspace', 403));
    }

    if (record.WorkspaceStatus !== 1) {
        // Workspace is suspended/inactive
        return next(new AppError('Forbidden: Workspace is not active', 403));
    }

    if (!record.MembershipKey || record.MembershipStatus !== 1) {
        // User is not an active member
        return next(new AppError('Forbidden: Not a member of this workspace', 403));
    }

    // Attach workspace context to request
    req.workspace = {
        workspaceKey: record.WorkspaceKey,
        workspaceId: record.WorkspaceId,
        workspaceName: record.WorkspaceName,
        membershipKey: record.MembershipKey,
        membershipId: record.MembershipId,
    };

    // Backward compatibility with existing code
    req.workspaceKey = record.WorkspaceKey;
    req.membershipKey = record.MembershipKey;

    // For authorize.js compatibility
    if (req.user) {
        req.user.membershipKey = record.MembershipKey;
    }

    next();
});

module.exports = requireWorkspaceMember;
