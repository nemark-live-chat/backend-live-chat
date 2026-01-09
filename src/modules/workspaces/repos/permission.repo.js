const { getPool, sql } = require('../../../infra/sql/pool');
const AppError = require('../../../utils/AppError');

/**
 * Get permission keys by their codes
 * Validates that ALL codes exist in the database
 * @param {string[]} codes - Array of permission codes
 * @returns {Promise<number[]>} Array of permission keys
 * @throws {AppError} 500 if any permission code is missing
 */
const getPermissionKeysByCodes = async (codes) => {
    if (!codes || codes.length === 0) {
        return [];
    }

    const pool = getPool();

    // Build dynamic query with parameters
    // SQL Server doesn't support array parameters directly, so we use a table-valued approach
    const result = await pool.request()
        .query(`
      SELECT PermissionKey, Code 
      FROM iam.Permissions 
      WHERE Code IN (${codes.map((_, i) => `'${codes[i].replace(/'/g, "''")}'`).join(', ')})
    `);

    const foundCodes = new Set(result.recordset.map(r => r.Code));
    const missingCodes = codes.filter(code => !foundCodes.has(code));

    if (missingCodes.length > 0) {
        throw new AppError(
            `Permission seed misconfigured. Missing permissions: ${missingCodes.join(', ')}`,
            500
        );
    }

    return result.recordset.map(r => r.PermissionKey);
};

/**
 * Get all permissions from database
 * @returns {Promise<object[]>} Array of all permissions
 */
const getAllPermissions = async () => {
    const result = await getPool().request()
        .query('SELECT * FROM iam.Permissions ORDER BY Code');
    return result.recordset;
};

/**
 * Find permission by code
 * @param {string} code - Permission code
 * @returns {Promise<object|null>} Permission or null
 */
const findByCode = async (code) => {
    const result = await getPool().request()
        .input('code', sql.NVarChar(150), code)
        .query('SELECT * FROM iam.Permissions WHERE Code = @code');
    return result.recordset[0] || null;
};

module.exports = {
    getPermissionKeysByCodes,
    getAllPermissions,
    findByCode,
};
