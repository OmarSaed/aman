// backend/src/modules/settings/settings.routes.js
const express = require('express');
const router = express.Router();
const controller = require('./settings.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/rbac.middleware');

router.use(authenticate);

// System Settings
router.get('/system', requirePermission('settings:view'), controller.getSystemSettings);
router.put('/system', requirePermission('settings:manage'), controller.updateSystemSettings);

// Maintenance
router.post('/maintenance/fix-customer-balances', requirePermission('settings:manage'), controller.fixCustomerBalances);
router.post('/maintenance/fix-stock', requirePermission('settings:manage'), controller.fixStock);

// Company Settings
router.get('/company', controller.getCompanySettings); // Accessible to all logged-in users generally
router.put('/company', requirePermission('settings:manage'), controller.updateCompanySettings);

module.exports = router;
