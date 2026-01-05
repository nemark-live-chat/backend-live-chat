const { getPool, sql } = require('../../../infra/sql/pool');

const getRequest = (txn) => txn ? txn.request() : getPool().request();

const createWorkspace = async (name, txn) => {
  const result = await getRequest(txn)
    .input('name', sql.NVarChar, name)
    .query(`
      INSERT INTO iam.Workspaces (Name, Status)
      OUTPUT inserted.*
      VALUES (@name, 1) -- 1 = Active
    `);
  return result.recordset[0];
};

const createRole = async (workspaceKey, name, txn) => {
  const result = await getRequest(txn)
    .input('workspaceKey', sql.Int, workspaceKey)
    .input('name', sql.NVarChar, name)
    .query(`
      INSERT INTO iam.Roles (WorkspaceKey, Name)
      OUTPUT inserted.*
      VALUES (@workspaceKey, @name)
    `);
  return result.recordset[0];
};

const createMembership = async (workspaceKey, userKey, txn) => {
  const result = await getRequest(txn)
    .input('workspaceKey', sql.Int, workspaceKey)
    .input('userKey', sql.BigInt, userKey)
    .query(`
      INSERT INTO iam.Memberships (WorkspaceKey, UserKey, Status)
      OUTPUT inserted.*
      VALUES (@workspaceKey, @userKey, 1) -- 1 = Active
    `);
  return result.recordset[0];
};

const addRoleToMembership = async (membershipKey, roleKey, txn) => {
  await getRequest(txn)
    .input('membershipKey', sql.Int, membershipKey)
    .input('roleKey', sql.Int, roleKey)
    .query(`
      INSERT INTO iam.MembershipRoles (MembershipKey, RoleKey)
      VALUES (@membershipKey, @roleKey)
    `);
};

// Grant all available permissions to the role
const grantAllPermissionsToRole = async (workspaceKey, roleKey, txn) => {
  await getRequest(txn)
    .input('workspaceKey', sql.Int, workspaceKey)
    .input('roleKey', sql.Int, roleKey)
    .query(`
      INSERT INTO iam.RolePermissionGrants (RoleKey, PermissionKey, Effect)
      SELECT @roleKey, PermissionKey, 1 -- 1 = Allow
      FROM iam.Permissions
      -- We grant global permissions or workspace specific ones? 
      -- Assuming table iam.Permissions lists all assignable permissions.
    `);
};

const rebuildMembershipEffectivePermissions = async (membershipKey, txn) => {
  await getRequest(txn)
    .input('membershipKey', sql.Int, membershipKey)
    .execute('iam.RebuildMembershipEffectivePermissions');
};

module.exports = {
  createWorkspace,
  createRole,
  createMembership,
  addRoleToMembership,
  grantAllPermissionsToRole,
  rebuildMembershipEffectivePermissions
};
