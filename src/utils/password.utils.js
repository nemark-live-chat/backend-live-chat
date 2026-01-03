const bcrypt = require('bcryptjs');
const constants = require('../config/constants');
const AppError = require('./AppError');

const hashPassword = async (password) => {
  return await bcrypt.hash(password, constants.AUTH.SALT_ROUNDS);
};

const comparePassword = async (candidatePassword, userPasswordHash) => {
  if (!userPasswordHash) return false;
  return await bcrypt.compare(candidatePassword, userPasswordHash);
};

const validatePasswordPolicy = (password) => {
  // Rules:
  // - >= 8 chars
  // - 1 Uppercase
  // - 1 Lowercase
  // - 1 Number
  // - Not in blacklist (simple list)

  const minLength = constants.AUTH.PASSWORD_MIN_LENGTH;
  if (password.length < minLength) {
    throw new AppError(`Password must be at least ${minLength} characters`, 400);
  }
  if (!/[a-z]/.test(password)) {
    throw new AppError('Password must contain at least one lowercase letter', 400);
  }
  if (!/[A-Z]/.test(password)) {
    throw new AppError('Password must contain at least one uppercase letter', 400);
  }
  if (!/\d/.test(password)) {
    throw new AppError('Password must contain at least one number', 400);
  }

  const blacklist = ['123456', 'password', '12345678', 'qwerty'];
  if (blacklist.includes(password.toLowerCase())) {
    throw new AppError('Password is too common', 400);
  }
};

module.exports = {
  hashPassword,
  comparePassword,
  validatePasswordPolicy
};
