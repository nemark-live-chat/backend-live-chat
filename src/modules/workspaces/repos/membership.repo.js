const { getPool, sql } = require('../../../infra/sql/pool');

/**
 * Get request object - uses transaction if provided, otherwise pool
 */
const getRequest = (txn) => txn ? txn.request() : getPool().request();

/**
 * Insert a new membership (user in workspace)
 * @param {number} workspaceKey - Workspace key
 * @param {number} userKey - User key
 * @param {object} txn - SQL transaction
 * @returns {Promise<object>} Created membership with all fields
 */
const insertMembership = async (workspaceKey, userKey, txn) => {
    const result = await getRequest(txn)
        .input('workspaceKey', sql.BigInt, workspaceKey)
        .input('userKey', sql.BigInt, userKey)
        .query(`
      INSERT INTO iam.Memberships (WorkspaceKey, UserKey, Status)
      OUTPUT 
        inserted.MembershipKey,
        inserted.MembershipId,
        inserted.WorkspaceKey,
        inserted.UserKey,
        inserted.Status,
        inserted.CreatedAt
      VALUES (@workspaceKey, @userKey, 1)
    `);
    return result.recordset[0];
};

/**
 * Find membership by workspace and user
 * @param {number} workspaceKey - Workspace key
 * @param {number} userKey - User key
 * @returns {Promise<object|null>} Membership or null
 */
const findByWorkspaceAndUser = async (workspaceKey, userKey) => {
    const result = await getPool().request()
        .input('workspaceKey', sql.BigInt, workspaceKey)
        .input('userKey', sql.BigInt, userKey)
        .query(`
      SELECT * FROM iam.Memberships
      WHERE WorkspaceKey = @workspaceKey AND UserKey = @userKey
    `);
    return result.recordset[0] || null;
};

/**
 * Check if user is active member of workspace
 * @param {number} workspaceKey - Workspace key
 * @param {number} userKey - User key
 * @returns {Promise<object|null>} Membership with active status or null
 */
const findActiveMembership = async (workspaceKey, userKey) => {
    const result = await getPool().request()
        .input('workspaceKey', sql.BigInt, workspaceKey)
        .input('userKey', sql.BigInt, userKey)
        .query(`
      SELECT m.*, w.WorkspaceId, w.Name as WorkspaceName
      FROM iam.Memberships m
      JOIN iam.Workspaces w ON w.WorkspaceKey = m.WorkspaceKey
      WHERE m.WorkspaceKey = @workspaceKey 
        AND m.UserKey = @userKey 
        AND m.Status = 1
        AND w.Status = 1
    `);
    return result.recordset[0] || null;
};

module.exports = {
    insertMembership,
    findByWorkspaceAndUser,
    findActiveMembership,
};
