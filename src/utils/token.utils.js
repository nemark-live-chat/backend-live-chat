const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const env = require('../config/env');

const signAccessToken = (userKey) => {
  return jwt.sign(
    { sub: userKey },
    env.app.jwtSecret,
    { expiresIn: env.app.jwtExpiresIn }
  );
};

const signRefreshToken = () => {
  // Refresh token is just a random string that we hash and store
  return crypto.randomBytes(40).toString('hex');
};

const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

const verifyAccessToken = (token) => {
  return jwt.verify(token, env.app.jwtSecret);
};

module.exports = {
  signAccessToken,
  signRefreshToken,
  hashToken,
  verifyAccessToken
};
