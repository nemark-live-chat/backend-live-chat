const express = require('express');
const router = express.Router();

// Mount Auth Module
router.use('/auth', require('./modules/auth/auth.routes'));

module.exports = router;
