// backend/src/modules/expenses/expenses.routes.js
const express = require('express');
const router  = express.Router();
const controller = require('./expenses.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/rbac.middleware');

// ─── Categories ──────────────────────────────────────────────────────────

router.get('/categories', 
  authenticate, 
  requirePermission('expenses:view'), 
  controller.listCategories
);

router.post('/categories', 
  authenticate, 
  requirePermission('expenses:manage-categories'), 
  controller.createCategory
);

// ─── Expenses ──────────────────────────────────────────────────────────────

router.get('/', 
  authenticate, 
  requirePermission('expenses:view'), 
  controller.listExpenses
);

router.post('/', 
  authenticate, 
  requirePermission('expenses:create'), 
  controller.createExpense
);

router.delete('/:id', 
  authenticate, 
  requirePermission('expenses:delete'), 
  controller.deleteExpense
);

module.exports = router;
