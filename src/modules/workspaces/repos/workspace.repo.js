const { getPool, sql } = require('../../../infra/sql/pool');

/**
 * Get request object - uses transaction if provided, otherwise pool
 */
const getRequest = (txn) => txn ? txn.request() : getPool().request();

/**
 * Insert a new workspace
 * @param {string} name - Workspace name
 * @param {object} txn - SQL transaction
 * @returns {Promise<object>} Created workspace with all fields
 */
const insertWorkspace = async (name, txn) => {
    const result = await getRequest(txn)
        .input('name', sql.NVarChar(255), name)
        .query(`
      INSERT INTO iam.Workspaces (Name, Status)
      OUTPUT 
        inserted.WorkspaceKey,
        inserted.WorkspaceId,
        inserted.Name,
        inserted.Status,
        inserted.CreatedAt
      VALUES (@name, 1)
    `);
    return result.recordset[0];
};

/**
 * Find workspace by ID
 * @param {string} workspaceId - Workspace UUID
 * @returns {Promise<object|null>} Workspace or null
 */
const findById = async (workspaceId) => {
    const result = await getPool().request()
        .input('workspaceId', sql.UniqueIdentifier, workspaceId)
        .query(`
      SELECT * FROM iam.Workspaces
      WHERE WorkspaceId = @workspaceId
    `);
    return result.recordset[0] || null;
};

/**
 * Find workspace by key
 * @param {number} workspaceKey - Workspace key
 * @returns {Promise<object|null>} Workspace or null
 */
const findByKey = async (workspaceKey) => {
    const result = await getPool().request()
        .input('workspaceKey', sql.BigInt, workspaceKey)
        .query(`
      SELECT * FROM iam.Workspaces
      WHERE WorkspaceKey = @workspaceKey
    `);
    return result.recordset[0] || null;
};

module.exports = {
    insertWorkspace,
    findById,
    findByKey,
};
