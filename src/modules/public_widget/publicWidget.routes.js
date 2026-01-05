const express = require('express');
const router = express.Router();
const controller = require('./publicWidget.controller');

// Note: /widget.js is mounted separately in main routes
// router.get('/widget.js', controller.getScript);

router.get('/:widgetId/config', controller.getConfig);
router.post('/:widgetId/messages', controller.postMessage);

module.exports = router;
