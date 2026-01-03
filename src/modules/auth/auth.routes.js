const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const validate = require('../../middlewares/validate');
const schemas = require('./auth.validate');
const authenticate = require('../../middlewares/authenticate');
const limiters = require('../../middlewares/rateLimiter');

// A. Account
router.post('/register', limiters.auth, validate(schemas.register), authController.register);
router.post('/login', limiters.auth, validate(schemas.login), authController.login);
router.post('/logout', authenticate, authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);
router.get('/me', authenticate, authController.me);

// B. Token
router.post('/refresh', limiters.auth, validate(schemas.refresh), authController.refreshToken);
router.post('/verify-token', authenticate, authController.verifyToken);

// C. Password
router.post('/change-password', authenticate, limiters.global, validate(schemas.changePassword), authController.changePassword);
router.post('/forgot-password', limiters.auth, validate(schemas.forgotPassword), authController.forgotPassword);
router.post('/reset-password', limiters.auth, validate(schemas.resetPassword), authController.resetPassword);

// D. Sessions
router.get('/sessions', authenticate, authController.listSessions);
router.delete('/sessions/:sessionId', authenticate, authController.revokeSession);
router.post('/verify-password', authenticate, validate(schemas.verifyPassword), authController.verifyPassword);

module.exports = router;
