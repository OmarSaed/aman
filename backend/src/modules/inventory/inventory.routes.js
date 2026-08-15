// backend/src/modules/inventory/inventory.routes.js
const express = require('express');
const router = express.Router();
const controller = require('./inventory.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/rbac.middleware');

router.use(authenticate);

// Warehouses
router.get('/warehouses', requirePermission('inventory:manage-warehouses'), controller.listWarehouses);
router.post('/warehouses', requirePermission('inventory:manage-warehouses'), controller.createWarehouse);
router.put('/warehouses/:id', requirePermission('inventory:manage-warehouses'), controller.updateWarehouse);

// Reports / Reads
router.get('/stock', requirePermission('inventory:view-stock'), controller.getStockLevels);
router.get('/movements', requirePermission('inventory:view-movements'), controller.getStockMovements);

// Actions
router.post('/transfer', requirePermission('inventory:adjust-stock'), controller.transferStock);
router.post('/adjust', requirePermission('inventory:adjust-stock'), controller.adjustStock);

module.exports = router;
