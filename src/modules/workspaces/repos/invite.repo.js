const { getPool, sql } = require('../../../infra/sql/pool');
const crypto = require('crypto');

/**
 * Get request object - uses transaction if provided, otherwise pool
 */
const getRequest = (txn) => txn ? txn.request() : getPool().request();

/**
 * Invite statuses
 */
const INVITE_STATUS = {
    PENDING: 1,
    ACCEPTED: 2,
    EXPIRED: 3,
    REVOKED: 4,
};

/**
 * Create a new invite
 * @param {object} data - Invite data
 * @param {number} data.workspaceKey - Workspace key
 * @param {string} data.email - Invitee email
 * @param {string} data.roleName - Role to assign on accept
 * @param {number} data.invitedByMembershipKey - Who invited
 * @param {Date} data.expiresAt - Expiration date
 * @param {object} txn - SQL transaction (optional)
 * @returns {Promise<object>} Created invite
 */
const createInvite = async (data, txn = null) => {
    const { workspaceKey, email, roleName, invitedByMembershipKey, expiresAt } = data;

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await getRequest(txn)
        .input('workspaceKey', sql.BigInt, workspaceKey)
        .input('email', sql.NVarChar(320), email.toLowerCase())
        .input('roleName', sql.NVarChar(100), roleName)
        .input('invitedByMembershipKey', sql.BigInt, invitedByMembershipKey)
        .input('tokenHash', sql.NVarChar(64), tokenHash)
        .input('expiresAt', sql.DateTime2, expiresAt)
        .input('status', sql.TinyInt, INVITE_STATUS.PENDING)
        .query(`
      INSERT INTO iam.WorkspaceInvites 
        (WorkspaceKey, Email, RoleName, InvitedByMembershipKey, TokenHash, ExpiresAt, Status)
      OUTPUT 
        inserted.InviteKey,
        inserted.InviteId,
        inserted.WorkspaceKey,
        inserted.Email,
        inserted.RoleName,
        inserted.Status,
        inserted.ExpiresAt,
        inserted.CreatedAt
      VALUES 
        (@workspaceKey, @email, @roleName, @invitedByMembershipKey, @tokenHash, @expiresAt, @status)
    `);

    const invite = result.recordset[0];
    // Return token (unhashed) for sending via email
    invite.token = token;
    return invite;
};

/**
 * Find invite by token
 * @param {string} token - Raw invite token
 * @returns {Promise<object|null>} Invite or null
 */
const findByToken = async (token) => {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await getPool().request()
        .input('tokenHash', sql.NVarChar(64), tokenHash)
        .query(`
      SELECT 
        i.*,
        w.WorkspaceId,
        w.Name AS WorkspaceName
      FROM iam.WorkspaceInvites i
      JOIN iam.Workspaces w ON w.WorkspaceKey = i.WorkspaceKey
      WHERE i.TokenHash = @tokenHash
    `);

    return result.recordset[0] || null;
};

/**
 * Find pending invites for a workspace
 * @param {number} workspaceKey - Workspace key
 * @returns {Promise<object[]>} Array of pending invites
 */
const findPendingByWorkspace = async (workspaceKey) => {
    const result = await getPool().request()
        .input('workspaceKey', sql.BigInt, workspaceKey)
        .input('pendingStatus', sql.TinyInt, INVITE_STATUS.PENDING)
        .query(`
      SELECT 
        i.*,
        u.DisplayName AS InvitedByName
      FROM iam.WorkspaceInvites i
      LEFT JOIN iam.Memberships m ON m.MembershipKey = i.InvitedByMembershipKey
      LEFT JOIN iam.Users u ON u.UserKey = m.UserKey
      WHERE i.WorkspaceKey = @workspaceKey 
        AND i.Status = @pendingStatus
        AND i.ExpiresAt > SYSUTCDATETIME()
      ORDER BY i.CreatedAt DESC
    `);

    return result.recordset;
};

/**
 * Find invite by email in workspace
 * @param {number} workspaceKey - Workspace key
 * @param {string} email - Email address
 * @returns {Promise<object|null>} Pending invite or null
 */
const findPendingByEmail = async (workspaceKey, email) => {
    const result = await getPool().request()
        .input('workspaceKey', sql.BigInt, workspaceKey)
        .input('email', sql.NVarChar(320), email.toLowerCase())
        .input('pendingStatus', sql.TinyInt, INVITE_STATUS.PENDING)
        .query(`
      SELECT * FROM iam.WorkspaceInvites
      WHERE WorkspaceKey = @workspaceKey 
        AND Email = @email 
        AND Status = @pendingStatus
        AND ExpiresAt > SYSUTCDATETIME()
    `);

    return result.recordset[0] || null;
};

/**
 * Update invite status
 * @param {number} inviteKey - Invite key
 * @param {number} status - New status
 * @param {object} txn - SQL transaction (optional)
 * @returns {Promise<object>} Updated invite
 */
const updateStatus = async (inviteKey, status, txn = null) => {
    const result = await getRequest(txn)
        .input('inviteKey', sql.BigInt, inviteKey)
        .input('status', sql.TinyInt, status)
        .query(`
      UPDATE iam.WorkspaceInvites
      SET Status = @status, UpdatedAt = SYSUTCDATETIME()
      OUTPUT inserted.*
      WHERE InviteKey = @inviteKey
    `);

    return result.recordset[0];
};

/**
 * Revoke invite
 * @param {number} inviteKey - Invite key
 * @returns {Promise<object>} Revoked invite
 */
const revokeInvite = async (inviteKey) => {
    return updateStatus(inviteKey, INVITE_STATUS.REVOKED);
};

/**
 * Mark invite as accepted
 * @param {number} inviteKey - Invite key
 * @param {object} txn - SQL transaction
 * @returns {Promise<object>} Updated invite
 */
const markAccepted = async (inviteKey, txn) => {
    return updateStatus(inviteKey, INVITE_STATUS.ACCEPTED, txn);
};

module.exports = {
    INVITE_STATUS,
    createInvite,
    findByToken,
    findPendingByWorkspace,
    findPendingByEmail,
    updateStatus,
    revokeInvite,
    markAccepted,
};
