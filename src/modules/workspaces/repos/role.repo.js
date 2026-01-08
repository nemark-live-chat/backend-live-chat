const { getPool, sql } = require('../../../infra/sql/pool');
const constants = require('../../../config/constants');

/**
 * Get request object - uses transaction if provided, otherwise pool
 */
const getRequest = (txn) => txn ? txn.request() : getPool().request();

/**
 * Find role by name in workspace
 * @param {number} workspaceKey - Workspace key
 * @param {string} roleName - Role name
 * @param {object} txn - SQL transaction (optional)
 * @returns {Promise<object|null>} Role or null
 */
const findByName = async (workspaceKey, roleName, txn = null) => {
    const result = await getRequest(txn)
        .input('workspaceKey', sql.BigInt, workspaceKey)
        .input('name', sql.NVarChar(100), roleName)
        .query(`
      SELECT * FROM iam.Roles
      WHERE WorkspaceKey = @workspaceKey AND Name = @name
    `);
    return result.recordset[0] || null;
};

/**
 * Create a new role in workspace
 * @param {number} workspaceKey - Workspace key
 * @param {string} roleName - Role name
 * @param {object} txn - SQL transaction
 * @returns {Promise<object>} Created role with all fields
 */
const insertRole = async (workspaceKey, roleName, txn) => {
    const result = await getRequest(txn)
        .input('workspaceKey', sql.BigInt, workspaceKey)
        .input('name', sql.NVarChar(100), roleName)
        .query(`
      INSERT INTO iam.Roles (WorkspaceKey, Name)
      OUTPUT 
        inserted.RoleKey,
        inserted.RoleId,
        inserted.WorkspaceKey,
        inserted.Name,
        inserted.CreatedAt
      VALUES (@workspaceKey, @name)
    `);
    return result.recordset[0];
};

/**
 * Get or create Owner role in workspace
 * Uses upsert pattern to handle race conditions
 * @param {number} workspaceKey - Workspace key
 * @param {object} txn - SQL transaction
 * @returns {Promise<object>} Owner role
 */
const getOrCreateOwnerRole = async (workspaceKey, txn) => {
    // First try to find existing
    const existing = await findByName(workspaceKey, 'Owner', txn);
    if (existing) {
        return existing;
    }

    // Create new one
    return await insertRole(workspaceKey, 'Owner', txn);
};

/**
 * Check if a role name is protected (cannot be assigned via API)
 * @param {string} roleName - Role name to check
 * @returns {boolean} True if protected
 */
const isProtectedRole = (roleName) => {
    return constants.PROTECTED_ROLES.includes(roleName);
};

module.exports = {
    findByName,
    insertRole,
    getOrCreateOwnerRole,
    isProtectedRole,
};
