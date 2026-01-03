require('dotenv').config();

const env = {
  app: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET || 'default_secret_please_change_in_prod',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m', // Short-lived access
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d', // Rotation
  },
  sql: {
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    server: process.env.SQL_SERVER || 'localhost',
    database: process.env.SQL_DATABASE,
    options: {
      encrypt: process.env.SQL_ENCRYPT === 'true',
      trustServerCertificate: process.env.SQL_TRUST_CERT === 'true',
    },
    pool: {
      max: 10,
      min: 0,
      idleTimeoutMillis: 30000
    }
  },
  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/chat_db',
  }
};

module.exports = env;
