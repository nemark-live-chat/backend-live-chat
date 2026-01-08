const { getPool, sql } = require('../../../infra/sql/pool');

/**
 * Get request object - uses transaction if provided, otherwise pool
 */
const getRequest = (txn) => txn ? txn.request() : getPool().request();

/**
 * Attach role to membership (ignore if already exists)
 * Uses TRY-CATCH pattern to handle duplicate key gracefully
 * @param {number} membershipKey - Membership key
 * @param {number} roleKey - Role key
 * @param {object} txn - SQL transaction
 * @returns {Promise<void>}
 */
const attachRole = async (membershipKey, roleKey, txn) => {
    // Use MERGE to handle duplicate gracefully
    await getRequest(txn)
        .input('membershipKey', sql.BigInt, membershipKey)
        .input('roleKey', sql.BigInt, roleKey)
        .query(`
      MERGE INTO iam.MembershipRoles AS target
      USING (SELECT @membershipKey AS MembershipKey, @roleKey AS RoleKey) AS source
      ON target.MembershipKey = source.MembershipKey AND target.RoleKey = source.RoleKey
      WHEN NOT MATCHED THEN
        INSERT (MembershipKey, RoleKey)
        VALUES (source.MembershipKey, source.RoleKey);
    `);
};

/**
 * Find all roles for a membership
 * @param {number} membershipKey - Membership key
 * @returns {Promise<object[]>} Array of roles
 */
const findRolesByMembership = async (membershipKey) => {
    const result = await getPool().request()
        .input('membershipKey', sql.BigInt, membershipKey)
        .query(`
      SELECT r.* 
      FROM iam.MembershipRoles mr
      JOIN iam.Roles r ON r.RoleKey = mr.RoleKey
      WHERE mr.MembershipKey = @membershipKey
    `);
    return result.recordset;
};

/**
 * Check if membership has a specific role
 * @param {number} membershipKey - Membership key
 * @param {string} roleName - Role name
 * @returns {Promise<boolean>} True if has role
 */
const hasRole = async (membershipKey, roleName) => {
    const result = await getPool().request()
        .input('membershipKey', sql.BigInt, membershipKey)
        .input('roleName', sql.NVarChar(100), roleName)
        .query(`
      SELECT 1 
      FROM iam.MembershipRoles mr
      JOIN iam.Roles r ON r.RoleKey = mr.RoleKey
      WHERE mr.MembershipKey = @membershipKey AND r.Name = @roleName
    `);
    return result.recordset.length > 0;
};

module.exports = {
    attachRole,
    findRolesByMembership,
    hasRole,
};
