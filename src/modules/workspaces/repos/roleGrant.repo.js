const { getPool, sql } = require('../../../infra/sql/pool');

/**
 * Get request object - uses transaction if provided, otherwise pool
 */
const getRequest = (txn) => txn ? txn.request() : getPool().request();

/**
 * Ensure role has grants for all specified permission keys
 * Uses MERGE to handle duplicates gracefully
 * @param {number} roleKey - Role key
 * @param {number[]} permissionKeys - Array of permission keys to grant
 * @param {object} txn - SQL transaction
 * @returns {Promise<number>} Number of grants created
 */
const ensureRoleGrants = async (roleKey, permissionKeys, txn) => {
    if (!permissionKeys || permissionKeys.length === 0) {
        return 0;
    }

    // Build a VALUES list for the permissions
    const valuesList = permissionKeys
        .map(pk => `(${roleKey}, ${pk}, 1)`)
        .join(', ');

    // Use MERGE to handle duplicates gracefully
    const result = await getRequest(txn)
        .query(`
      MERGE INTO iam.RolePermissionGrants AS target
      USING (VALUES ${valuesList}) AS source (RoleKey, PermissionKey, Effect)
      ON target.RoleKey = source.RoleKey AND target.PermissionKey = source.PermissionKey
      WHEN NOT MATCHED THEN
        INSERT (RoleKey, PermissionKey, Effect)
        VALUES (source.RoleKey, source.PermissionKey, source.Effect)
      OUTPUT $action;
    `);

    // Count inserted rows
    return result.recordset.filter(r => r.$action === 'INSERT').length;
};

/**
 * Find all grants for a role
 * @param {number} roleKey - Role key
 * @returns {Promise<object[]>} Array of grants with permission details
 */
const findGrantsByRole = async (roleKey) => {
    const result = await getPool().request()
        .input('roleKey', sql.BigInt, roleKey)
        .query(`
      SELECT rpg.*, p.Code, p.Resource, p.Action
      FROM iam.RolePermissionGrants rpg
      JOIN iam.Permissions p ON p.PermissionKey = rpg.PermissionKey
      WHERE rpg.RoleKey = @roleKey
    `);
    return result.recordset;
};

module.exports = {
    ensureRoleGrants,
    findGrantsByRole,
};
