const express = require('express');
const router = express.Router();
const controller = require('./legacy.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/rbac.middleware');

router.use(authenticate);
router.use(requirePermission('products:import'));

router.get('/status', controller.status);
router.post('/upload', controller.uploadMiddleware, controller.uploadBackup);
router.post('/use-project-backup', controller.useProjectBackup);
router.post('/restore', controller.restore);
router.get('/categories', controller.listCategories);
router.get('/preview', controller.preview);
router.post('/sync', controller.sync);

module.exports = router;
