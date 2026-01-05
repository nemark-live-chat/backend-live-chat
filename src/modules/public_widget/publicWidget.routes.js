const express = require('express');
const router = express.Router();
const controller = require('./publicWidget.controller');
const { widgetRateLimiter } = require('../../middlewares/rateLimit');

// Apply rate limiting to all public widget routes
router.use(widgetRateLimiter);

// Note: /widget.js is mounted separately in main routes

// New iframe-based widget endpoints
router.post('/init', controller.initConversation);
router.get('/messages/:conversationId', controller.getMessages);
router.post('/messages', controller.sendMessage);

// Legacy endpoints (widgetId based)
router.get('/:widgetId/config', controller.getConfig);
router.post('/:widgetId/messages', controller.postMessage);

module.exports = router;
