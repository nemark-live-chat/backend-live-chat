const { getPool, sql } = require('../../infra/sql/pool');
const crypto = require('crypto');

/**
 * Generate a unique site key for widget embed
 */
const generateSiteKey = () => {
  return crypto.randomBytes(12).toString('hex'); // 24 chars
};

const create = async (workspaceKey, data) => {
  const pool = getPool();

  const siteKey = generateSiteKey();
  const allowedDomainsJson = JSON.stringify(data.allowedDomains);
  const themeJson = JSON.stringify(data.theme);

  const result = await pool.request()
    .input('workspaceKey', sql.BigInt, workspaceKey)
    .input('siteKey', sql.NVarChar, siteKey)
    .input('name', sql.NVarChar, data.name)
    .input('allowedDomains', sql.NVarChar, allowedDomainsJson)
    .input('theme', sql.NVarChar, themeJson)
    .query(`
      INSERT INTO iam.Widgets (WorkspaceKey, SiteKey, Name, AllowedDomains, Theme)
      OUTPUT inserted.*
      VALUES (@workspaceKey, @siteKey, @name, @allowedDomains, @theme)
    `);

  return result.recordset[0];
};

const getById = async (workspaceKey, widgetId) => {
  const pool = getPool();
  const result = await pool.request()
    .input('workspaceKey', sql.BigInt, workspaceKey)
    .input('widgetId', sql.UniqueIdentifier, widgetId)
    .query(`
      SELECT * FROM iam.Widgets 
      WHERE WorkspaceKey = @workspaceKey AND WidgetId = @widgetId
    `);
  return result.recordset[0];
};

const update = async (workspaceKey, widgetId, data) => {
  const pool = getPool();
  const req = pool.request()
    .input('workspaceKey', sql.BigInt, workspaceKey)
    .input('widgetId', sql.UniqueIdentifier, widgetId);

  let updates = [];
  if (data.name) {
    req.input('name', sql.NVarChar, data.name);
    updates.push('Name = @name');
  }
  if (data.status) {
    req.input('status', sql.TinyInt, data.status);
    updates.push('Status = @status');
  }
  if (data.allowedDomains) {
    req.input('allowedDomains', sql.NVarChar, JSON.stringify(data.allowedDomains));
    updates.push('AllowedDomains = @allowedDomains');
  }
  if (data.theme) {
    req.input('theme', sql.NVarChar, JSON.stringify(data.theme));
    updates.push('Theme = @theme');
  }

  req.input('now', sql.DateTime2, new Date());
  updates.push('UpdatedAt = @now');

  if (updates.length === 0) return null;

  const query = `
    UPDATE iam.Widgets
    SET ${updates.join(', ')}
    OUTPUT inserted.*
    WHERE WorkspaceKey = @workspaceKey AND WidgetId = @widgetId
  `;

  const result = await req.query(query);
  return result.recordset[0];
};

/**
 * List all widgets for a workspace
 */
const list = async (workspaceKey) => {
  const pool = getPool();
  const result = await pool.request()
    .input('workspaceKey', sql.BigInt, workspaceKey)
    .query(`
      SELECT 
        WidgetId,
        WidgetKey,
        SiteKey,
        Name,
        AllowedDomains,
        Theme,
        Status,
        CreatedAt,
        UpdatedAt
      FROM iam.Widgets 
      WHERE WorkspaceKey = @workspaceKey
      ORDER BY CreatedAt DESC
    `);
  return result.recordset;
};

/**
 * List all widgets for a user (across all workspaces)
 * @param {number} userKey - User key
 * @returns {array} Widgets
 */
const getWidgetsByUser = async (userKey) => {
  const pool = getPool();
  const result = await pool.request()
    .input('userKey', sql.BigInt, userKey)
    .query(`
      SELECT 
        w.WidgetKey, w.WidgetId, w.Name, w.SiteKey,
        ws.WorkspaceId, ws.Name as WorkspaceName
      FROM iam.Widgets w
      INNER JOIN iam.Workspaces ws ON w.WorkspaceKey = ws.WorkspaceKey
      INNER JOIN iam.Memberships m ON m.WorkspaceKey = ws.WorkspaceKey
      WHERE m.UserKey = @userKey AND m.Status = 1 AND w.Status = 1
    `);
  return result.recordset;
};

module.exports = {
  create,
  getById,
  update,
  list,
  getWidgetsByUser
};
