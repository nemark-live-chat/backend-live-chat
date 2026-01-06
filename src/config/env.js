require('dotenv').config();

const env = {
  app: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET || 'default_secret_please_change_in_prod',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d', // Long-lived access per request
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
  },
  embed: {
    jwtSecret: process.env.EMBED_JWT_SECRET || process.env.JWT_SECRET || 'embed_secret_change_in_prod',
    tokenTTL: parseInt(process.env.EMBED_TOKEN_TTL_SECONDS, 10) || 86400, // 24 hours
    widgetCacheTTL: parseInt(process.env.EMBED_WIDGET_CACHE_SECONDS, 10) || 3600, // 1 hour
    devAllowAll: process.env.EMBED_DEV_ALLOW_ALL === 'true',
  },
  urls: {
    backend: process.env.BACKEND_PUBLIC_URL || 'http://localhost:3001',
    frontend: process.env.FRONTEND_PUBLIC_URL || 'http://localhost:3000',
  }
};

module.exports = env;

