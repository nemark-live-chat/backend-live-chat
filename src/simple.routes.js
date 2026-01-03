const express = require('express');
const router = express.Router();

router.get('/test-swagger', (req, res) => {
    res.json({ message: 'Hello Swagger' });
});

module.exports = router;
