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

module.exports = {
  findByEmail,
  findById,
  createUser
};
