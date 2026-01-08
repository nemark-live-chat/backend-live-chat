const express = require('express');
const router = express.Router();

// Mount Auth Module
router.use('/auth', require('./modules/auth/auth.routes'));

// Mount Workspaces Module (no workspace context required)
router.use('/workspaces', require('./modules/workspaces/workspaces.routes'));

// Mount Widgets Module (requires workspace context)
router.use('/widgets', require('./modules/widgets/widgets.routes'));
router.use('/public/widgets', require('./modules/public_widget/publicWidget.routes'));

// Embed module (public, no auth)
router.use('/embed', require('./modules/embed/embed.routes'));

// Legacy: Serve Widget Script at Root (for backwards compatibility)
const publicController = require('./modules/public_widget/publicWidget.controller');
router.get('/widget.js', publicController.getScript);


module.exports = router;

