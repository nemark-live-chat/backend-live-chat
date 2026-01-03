const { getPool, sql } = require('../../../infra/sql/pool');

const getRequest = (txn) => txn ? txn.request() : getPool().request();

const createCredential = async (userKey, hash, txn) => {
  const req = getRequest(txn);
  await req
    .input('userKey', sql.BigInt, userKey)
    .input('hash', sql.NVarChar, hash)
    .input('algo', sql.NVarChar, 'bcrypt') // Hardcoded for now
    .query(`
      INSERT INTO iam.UserCredentials (UserKey, PasswordHash, PasswordAlgo)
      VALUES (@userKey, @hash, @algo)
    `);
};

const getCredential = async (userKey) => {
  const result = await getPool().request()
    .input('userKey', sql.BigInt, userKey)
    .query('SELECT * FROM iam.UserCredentials WHERE UserKey = @userKey');
  return result.recordset[0];
};

const updatePassword = async (userKey, newHash, txn) => {
  const req = getRequest(txn);
  await req
    .input('userKey', sql.BigInt, userKey)
    .input('hash', sql.NVarChar, newHash)
    .query(`
      UPDATE iam.UserCredentials
      SET PasswordHash = @hash,
          MustChangePassword = 0,
          FailedLoginAttempts = 0, -- Reset on success change
          LockUntil = NULL
      WHERE UserKey = @userKey
    `);
};

const incrementFailedAttempts = async (userKey, lockoutDurationMinutes) => {
  // Logic: Inc count. If >= 5, set LockUntil.
  // We can do this in one query or logic in Service.
  // Query is safer for race conditions, but logic implies we need to know CURRENT count.
  // Simple update pattern:
  
  // Note: We need to handle the case where we just lock it right here.
  
  // "5 times -> lock 15m"
  const MAX_ATTEMPTS = 5;
  
  // We execute a stored update to fail + lock if needed
  await getPool().request()
    .input('userKey', sql.BigInt, userKey)
    .input('now', sql.DateTime2, new Date())
    .input('lockDuration', sql.Int, lockoutDurationMinutes)
    .query(`
      UPDATE iam.UserCredentials
      SET FailedLoginAttempts = FailedLoginAttempts + 1,
          LockUntil = CASE 
            WHEN FailedLoginAttempts + 1 >= ${MAX_ATTEMPTS} 
            THEN DATEADD(minute, @lockDuration, @now) 
            ELSE LockUntil 
          END
      WHERE UserKey = @userKey
    `);
};

const resetFailedAttempts = async (userKey) => {
  await getPool().request()
    .input('userKey', sql.BigInt, userKey)
    .query(`
      UPDATE iam.UserCredentials
      SET FailedLoginAttempts = 0, LockUntil = NULL
      WHERE UserKey = @userKey
    `);
};

module.exports = {
  createCredential,
  getCredential,
  updatePassword,
  incrementFailedAttempts,
  resetFailedAttempts
};
