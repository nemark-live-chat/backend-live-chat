const Joi = require('joi');
const constants = require('../../config/constants');

const passwordRule = Joi.string().min(constants.AUTH.PASSWORD_MIN_LENGTH).required();

const register = Joi.object({
  email: Joi.string().email().required(),
  password: passwordRule,
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  displayName: Joi.string().max(100).optional(),
});

const login = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(), // Don't enforce policy on login, just string
});

const refresh = Joi.object({
  refreshToken: Joi.string().required(),
});

const changePassword = Joi.object({
  oldPassword: Joi.string().required(),
  newPassword: passwordRule,
});

const forgotPassword = Joi.object({
  email: Joi.string().email().required(),
});

const resetPassword = Joi.object({
  token: Joi.string().required(),
  newPassword: passwordRule,
});

const verifyPassword = Joi.object({
  password: Joi.string().required(),
});

module.exports = {
  register,
  login,
  refresh,
  changePassword,
  forgotPassword,
  resetPassword,
  verifyPassword
};
