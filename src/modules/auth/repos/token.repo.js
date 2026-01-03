const { getPool, sql } = require('../../../infra/sql/pool');

const createRefreshToken = async (data) => {
  // data: { userKey, tokenHash, expiresAt, familyId, ip, agent }
  await getPool().request()
    .input('userKey', sql.BigInt, data.userKey)
    .input('hash', sql.NVarChar, data.tokenHash)
    .input('expiresAt', sql.DateTime2, data.expiresAt)
    .input('familyId', sql.UniqueIdentifier, data.familyId || null)
    .input('ip', sql.NVarChar, data.ip || null)
    .input('agent', sql.NVarChar, data.agent || null)
    .query(`
      INSERT INTO iam.RefreshTokens (UserKey, TokenHash, ExpiresAt, FamilyId, CreatedByIp, UserAgent)
      VALUES (@userKey, @hash, @expiresAt, @familyId, @ip, @agent)
    `);
};

const findByHash = async (tokenHash) => {
  const result = await getPool().request()
    .input('hash', sql.NVarChar, tokenHash)
    .query(`
      SELECT * FROM iam.RefreshTokens 
      WHERE TokenHash = @hash
    `);
  return result.recordset[0];
};

const revokeByKey = async (tokenKey) => {
  await getPool().request()
    .input('key', sql.BigInt, tokenKey)
    .input('now', sql.DateTime2, new Date())
    .query(`
      UPDATE iam.RefreshTokens
      SET RevokedAt = @now
      WHERE RefreshTokenKey = @key
    `);
};

const revokeFamily = async (familyId) => {
  // Used for rotation reuse detection -> Burn all family
  await getPool().request()
    .input('fid', sql.UniqueIdentifier, familyId)
    .input('now', sql.DateTime2, new Date())
    .query(`
      UPDATE iam.RefreshTokens
      SET RevokedAt = @now
      WHERE FamilyId = @fid
    `);
};

const revokeAllForUser = async (userKey) => {
  await getPool().request()
    .input('userKey', sql.BigInt, userKey)
    .input('now', sql.DateTime2, new Date())
    .query(`
      UPDATE iam.RefreshTokens
      SET RevokedAt = @now
      WHERE UserKey = @userKey AND RevokedAt IS NULL
    `);
};

const listActiveSessions = async (userKey) => {
  const result = await getPool().request()
    .input('userKey', sql.BigInt, userKey)
    .input('now', sql.DateTime2, new Date())
    .query(`
      SELECT RefreshTokenKey, CreatedAt, ExpiresAt, CreatedByIp, UserAgent
      FROM iam.RefreshTokens
      WHERE UserKey = @userKey 
        AND RevokedAt IS NULL 
        AND ExpiresAt > @now
    `);
  return result.recordset;
};

module.exports = {
  createRefreshToken,
  findByHash,
  revokeByKey,
  revokeFamily,
  revokeAllForUser,
  listActiveSessions
};
