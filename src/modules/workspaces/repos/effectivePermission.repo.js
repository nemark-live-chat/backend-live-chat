const { getPool, sql } = require('../../../infra/sql/pool');

/**
 * Get request object - uses transaction if provided, otherwise pool
 */
const getRequest = (txn) => txn ? txn.request() : getPool().request();

/**
 * Rebuild effective permissions for a membership
 * Calls the stored procedure iam.RebuildMembershipEffectivePermissions
 * @param {number} membershipKey - Membership key
 * @param {object} txn - SQL transaction
 * @returns {Promise<void>}
 */
const rebuild = async (membershipKey, txn) => {
    await getRequest(txn)
        .input('MembershipKey', sql.BigInt, membershipKey)
        .execute('iam.RebuildMembershipEffectivePermissions');
};

/**
 * Get effective permissions for a membership
 * @param {number} membershipKey - Membership key
 * @returns {Promise<object[]>} Array of effective permissions
 */
const getEffectivePermissions = async (membershipKey) => {
    const result = await getPool().request()
        .input('membershipKey', sql.BigInt, membershipKey)
        .query(`
      SELECT mep.*, p.Code, p.Resource, p.Action
      FROM iam.MembershipEffectivePermissions mep
      JOIN iam.Permissions p ON p.PermissionKey = mep.PermissionKey
      WHERE mep.MembershipKey = @membershipKey
    `);
    return result.recordset;
};

/**
 * Check if membership has a specific permission
 * @param {number} membershipKey - Membership key
 * @param {string} permissionCode - Permission code
 * @param {number} resourceKey - Resource key (0 for workspace-wide)
 * @returns {Promise<boolean>} True if has permission
 */
const hasPermission = async (membershipKey, permissionCode, resourceKey = 0) => {
    const result = await getPool().request()
        .input('membershipKey', sql.BigInt, membershipKey)
        .input('permissionCode', sql.NVarChar(150), permissionCode)
        .input('resourceKey', sql.BigInt, resourceKey)
        .query(`
      SELECT TOP 1 mep.Effect
      FROM iam.MembershipEffectivePermissions mep
      JOIN iam.Permissions p ON p.PermissionKey = mep.PermissionKey
      WHERE mep.MembershipKey = @membershipKey
        AND p.Code = @permissionCode
        AND mep.ResourceKeyNN IN (0, @resourceKey)
      ORDER BY mep.Effect DESC
    `);

    return result.recordset.length > 0 && result.recordset[0].Effect === 1;
};

module.exports = {
    rebuild,
    getEffectivePermissions,
    hasPermission,
};
