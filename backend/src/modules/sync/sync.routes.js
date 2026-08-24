const express = require('express');
const router = express.Router();
const controller = require('./sync.controller');
const { requireSyncKey } = require('./sync.middleware');

router.get('/ping', requireSyncKey, controller.ping);
router.post('/push', requireSyncKey, controller.push);

module.exports = router;
