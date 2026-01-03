const constants = {
  PERMISSION: {
    ALLOW: 1,
    DENY: 2, // NOTE: Schema uses 1=Allow, 2=Deny
  },
  USER_STATUS: {
    ACTIVE: 1,
    SUSPENDED: 2,
    DELETED: 3,
  },
  AUTH: {
    SALT_ROUNDS: 10,
    MAX_LOGIN_ATTEMPTS: 5,
    LOCKOUT_DURATION_MINUTES: 15,
    PASSWORD_MIN_LENGTH: 8,
  }
};

module.exports = constants;
