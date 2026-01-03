const sql = require('mssql');
const env = require('../../config/env');

let pool = null;

const connectSql = async () => {
  try {
    if (pool) return pool;
    
    pool = await sql.connect(env.sql);
    
    pool.on('error', err => {
      console.error('SQL Pool Error:', err);
    });

    console.log('Connected to MSSQL');
    return pool;
  } catch (err) {
    console.error('Failed to connect to MSSQL:', err);
    throw err;
  }
};

const getPool = () => {
  if (!pool) throw new Error('Pool not initialized, call connectSql first');
  return pool;
};

module.exports = {
  connectSql,
  getPool,
  sql 
};
