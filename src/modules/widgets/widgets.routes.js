const express = require('express');
const router = express.Router();
const controller = require('./widgets.controller');
const validate = require('../../middlewares/validate');
const schema = require('./widgets.validate');
const authenticate = require('../../middlewares/authenticate');
const authorize = require('../../middlewares/authorize');
const resolveWorkspace = require('../../middlewares/resolveWorkspace');

// All routes require auth + workspace context
router.use(authenticate);
router.use(resolveWorkspace);

router.post('/',
  authorize('widget.manage'),
  validate(schema.createWidget),
  controller.create
);

router.get('/:widgetId',
  authorize('widget.read'),
  controller.getOne
);

router.patch('/:widgetId',
  authorize('widget.manage'),
  validate(schema.updateWidget),
  controller.update
);

router.get('/:widgetId/embed',
  authorize('widget.read'),
  controller.getEmbed
);

module.exports = router;
