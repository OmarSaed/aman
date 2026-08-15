// backend/src/modules/accounting/accounting.routes.js
const express = require('express');
const router  = express.Router();
const controller = require('./accounting.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/rbac.middleware');

/**
 * Unified Transactions API
 */
router.get('/transactions', 
  authenticate, 
  requirePermission('accounting:view'), 
  controller.listUnifiedTransactions
);

module.exports = router;
