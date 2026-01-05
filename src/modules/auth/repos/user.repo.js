const { getPool, sql } = require('../../../infra/sql/pool');

const getRequest = (txn) => txn ? txn.request() : getPool().request();

const findByEmail = async (email) => {
  const result = await getPool().request()
    .input('email', sql.NVarChar, email)
    .query('SELECT * FROM iam.Users WHERE EmailNormalized = @email');
  return result.recordset[0];
};

const findById = async (userKey) => {
  const result = await getPool().request()
    .input('userKey', sql.BigInt, userKey)
    .query('SELECT * FROM iam.Users WHERE UserKey = @userKey');
  return result.recordset[0];
};

const createUser = async (userData, txn) => {
  const req = getRequest(txn);
  
  const result = await req
    .input('email', sql.NVarChar, userData.email)
    .input('emailNorm', sql.NVarChar, userData.email.toLowerCase()) // TODO: Better helper
    .input('displayName', sql.NVarChar, userData.displayName || null)
    .query(`
      INSERT INTO iam.Users (Email, EmailNormalized, DisplayName)
      OUTPUT inserted.*
      VALUES (@email, @emailNorm, @displayName)
    `);
    
  return result.recordset[0];
};



const getUserContext = async (userKey) => {
  const pool = getPool();
  
  // 1. Get Workspaces & Roles
  const membershipsResult = await pool.request()
    .input('userKey', sql.BigInt, userKey)
    .query(`
      SELECT 
        m.MembershipKey,
        w.WorkspaceId,
        w.Name AS WorkspaceName,
        r.Name AS RoleName
      FROM iam.Memberships m
      JOIN iam.Workspaces w ON w.WorkspaceKey = m.WorkspaceKey
      LEFT JOIN iam.MembershipRoles mr ON mr.MembershipKey = m.MembershipKey
      LEFT JOIN iam.Roles r ON r.RoleKey = mr.RoleKey
      WHERE m.UserKey = @userKey AND m.Status = 1 AND w.Status = 1
    `);

  // 2. Get Effective Permissions
  const permissionsResult = await pool.request()
    .input('userKey', sql.BigInt, userKey)
    .query(`
      SELECT 
        m.MembershipKey,
        p.Code AS PermissionCode,
        mep.ResourceKeyNN,
        mep.Effect
      FROM iam.Memberships m
      JOIN iam.MembershipEffectivePermissions mep ON mep.MembershipKey = m.MembershipKey
      JOIN iam.Permissions p ON p.PermissionKey = mep.PermissionKey
      WHERE m.UserKey = @userKey
        AND mep.Effect = 1 -- Only Allow
    `);

  // Aggregate
  const workspacesMap = new Map();

  membershipsResult.recordset.forEach(row => {
    if (!workspacesMap.has(row.MembershipKey)) {
      workspacesMap.set(row.MembershipKey, {
        membershipKey: row.MembershipKey,
        workspaceId: row.WorkspaceId,
        workspaceName: row.WorkspaceName,
        roles: [],
        permissions: []
      });
    }
    if (row.RoleName) {
      workspacesMap.get(row.MembershipKey).roles.push(row.RoleName);
    }
  });

  permissionsResult.recordset.forEach(row => {
    const ws = workspacesMap.get(row.MembershipKey);
    if (ws) {
      // Simple list of codes for now
      if (!ws.permissions.includes(row.PermissionCode)) {
        ws.permissions.push(row.PermissionCode);
      }
    }
  });

  return Array.from(workspacesMap.values());
};

module.exports = {
  findByEmail,
  findById,
  createUser,
  getUserContext
};
