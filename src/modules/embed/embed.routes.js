const express = require('express');
const router = express.Router();
const controller = require('./embed.controller');
const { strictRateLimiter, widgetRateLimiter } = require('../../middlewares/rateLimit');

// ============================================
// PUBLIC ROUTES - No authentication required
// ============================================

// Widget script endpoints (cached, no rate limit needed)
router.get('/widget.js', controller.getWidgetScript);
router.get('/widget.min.js', controller.getWidgetScriptMinified);

// Snippet generation endpoints
router.get('/snippet', controller.getSnippet);
router.get('/snippet/preview', controller.getSnippetPreview);

// Iframe frame endpoint
router.get('/frame', controller.getFrame);

// Demo and admin pages
router.get('/demo', controller.getDemo);
router.get('/admin', controller.getAdmin);

// ============================================
// API ROUTES - With rate limiting
// ============================================

// Session endpoint for visitors (rate limited)
router.post('/session', strictRateLimiter, controller.createSession);

// Conversations list (for agents)
router.get('/conversations', controller.getConversations);

// Messages for a conversation with keyset cursor pagination (RECOMMENDED)
router.get('/conversations/:conversationId/messages', controller.getMessagesBySeq);

// Messages for a conversation (LEGACY - uses timestamp pagination)
router.get('/messages/:conversationId', controller.getMessages);

// Agent session (for testing admin console)
router.post('/agent-session', controller.createAgentSession);

// Agent send message
router.post('/agent-message', widgetRateLimiter, controller.sendAgentMessage);

module.exports = router;

