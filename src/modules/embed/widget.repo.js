const { getPool, sql } = require('../../infra/sql/pool');

/**
 * Get widget by SiteKey
 * @param {string} siteKey 
 */
const getWidgetBySiteKey = async (siteKey) => {
    const pool = getPool();
    const result = await pool.request()
        .input('siteKey', sql.NVarChar, siteKey)
        .query(`
      SELECT 
        WidgetKey, WidgetId, WorkspaceKey, Name, Status, 
        AllowedDomains, Theme, SiteKey
      FROM iam.Widgets
      WHERE SiteKey = @siteKey AND Status = 1
    `);
    return result.recordset[0] || null;
};

module.exports = {
    getWidgetBySiteKey
};
