const { getPool, sql } = require('../../infra/sql/pool');

const create = async (workspaceKey, data) => {
  const pool = getPool();
  
  const allowedDomainsJson = JSON.stringify(data.allowedDomains);
  const themeJson = JSON.stringify(data.theme);

  const result = await pool.request()
    .input('workspaceKey', sql.BigInt, workspaceKey)
    .input('name', sql.NVarChar, data.name)
    .input('allowedDomains', sql.NVarChar, allowedDomainsJson)
    .input('theme', sql.NVarChar, themeJson)
    .query(`
      INSERT INTO iam.Widgets (WorkspaceKey, Name, AllowedDomains, Theme)
      OUTPUT inserted.*
      VALUES (@workspaceKey, @name, @allowedDomains, @theme)
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

module.exports = {
  create,
  getById,
  update
};
