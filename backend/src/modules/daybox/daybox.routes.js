// backend/src/modules/daybox/daybox.routes.js
const express = require('express');
const router = express.Router();
const controller = require('./daybox.controller');
const { authenticate } = require('../../middleware/auth.middleware');

router.use(authenticate);

router.get('/', controller.listSessions);
router.post('/open', controller.openSession);
router.get('/active', controller.getActiveSession);
router.get('/:id/summary', controller.getSessionSummary);
router.patch('/:id/close', controller.closeSession);

module.exports = router;
