// backend/src/modules/suppliers/suppliers.routes.js
const express = require('express');
const router = express.Router();
const controller = require('./suppliers.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/rbac.middleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

// Suppliers
router.get('/', requirePermission('vendors:view'), controller.listSuppliers);
router.post('/', requirePermission('vendors:create'), controller.createSupplier);
router.put('/:id', requirePermission('vendors:update'), controller.updateSupplier);
router.delete('/:id',       authenticate, requirePermission('vendors:delete'), controller.deleteSupplier);

// ─── Supplier Account & Ledger ──────────────────────────────────────────────
router.get('/:id/account', authenticate, requirePermission('vendors:view'), controller.getSupplierAccount);
router.post('/payment',     authenticate, requirePermission('payments:process'), controller.addSupplierPayment);

// Supplier Prices
router.get('/products/:productId/prices', requirePermission('vendors:view'), controller.getSupplierPricesByProduct);
router.post('/prices', requirePermission('suppliers:manage-prices'), controller.addSupplierPrice);

// Purchase Orders
router.get('/orders', requirePermission('orders:view-all'), controller.listPurchaseOrders);
router.get('/orders/:id', requirePermission('orders:view-all'), controller.getPurchaseOrderById);
router.post('/orders', requirePermission('orders:create-po'), controller.createPurchaseOrder);
router.put('/orders/:id', requirePermission('orders:create-po'), controller.updatePurchaseOrder);
router.patch('/orders/:id/status', requirePermission('orders:receive-po'), controller.updatePurchaseOrderStatus);
router.post('/orders/:id/receive', requirePermission('orders:receive-po'), controller.receivePurchaseOrder);
router.delete('/orders/:id', requirePermission('orders:delete-po'), controller.deletePurchaseOrder);
router.post('/orders/import', requirePermission('orders:create-po'), upload.single('file'), controller.importPurchaseOrder);

module.exports = router;
