const express = require('express');
const router = express.Router();
const controller = require('./embed.controller');

// Public routes - no authentication required

// Widget script endpoints
router.get('/widget.js', controller.getWidgetScript);
router.get('/widget.min.js', controller.getWidgetScriptMinified);

// Snippet generation endpoints
router.get('/snippet', controller.getSnippet);
router.get('/snippet/preview', controller.getSnippetPreview);

module.exports = router;
