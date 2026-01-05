const express = require('express');
const router = express.Router();

// Mount Auth Module
router.use('/auth', require('./modules/auth/auth.routes'));
router.use('/widgets', require('./modules/widgets/widgets.routes'));
router.use('/public/widgets', require('./modules/public_widget/publicWidget.routes'));

// Serve Widget Script at Root (as requested)
// We need to require the controller directly here to mount path parameter-less route if using Router.use
// OR we can just use a router for it.
const publicController = require('./modules/public_widget/publicWidget.controller');
router.get('/widget.js', publicController.getScript);


module.exports = router;
