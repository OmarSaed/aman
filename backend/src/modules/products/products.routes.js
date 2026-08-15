// backend/src/modules/products/products.routes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const controller = require('./products.controller');
const warehouseController = require('./warehouses.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/rbac.middleware');

const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);

// Categories
router.get('/categories', requirePermission('inventory:view-products'), controller.listCategories);
router.post('/categories', requirePermission('inventory:create-products'), controller.createCategory);
router.put('/categories/:id', requirePermission('inventory:update-products'), controller.updateCategory);
router.delete('/categories/:id', requirePermission('inventory:delete-products'), controller.deleteCategory);

// Brands
router.get('/brands', requirePermission('inventory:view-products'), controller.listBrands);
router.post('/brands', requirePermission('inventory:create-products'), controller.createBrand);
router.put('/brands/:id', requirePermission('inventory:update-products'), controller.updateBrand);
router.delete('/brands/:id', requirePermission('inventory:delete-products'), controller.deleteBrand);

// Warehouses
router.get('/warehouses/all', requirePermission('inventory:view-products'), warehouseController.listWarehouses);
router.post('/warehouses', requirePermission('inventory:create-products'), warehouseController.createWarehouse);

// Bulk Import & Template  — MUST be before /:id wildcard
router.get('/import-template', requirePermission('inventory:view-products'), controller.downloadImportTemplate);
router.post('/bulk-import', requirePermission('products:import'), upload.single('file'), controller.bulkImportProducts);

// Barcodes  — MUST be before /:id wildcard
router.post('/barcodes/generate-missing', requirePermission('inventory:update-products'), controller.generateAllMissingBarcodes);

// Bulk updates  — MUST be before /:id wildcard
router.patch('/bulk-update-prices', requirePermission('inventory:update-products'), controller.bulkUpdatePrices);
router.patch('/batch-update-prices', requirePermission('inventory:update-products'), controller.batchUpdatePrices);

// Products — wildcard /:id routes go LAST
router.get('/', requirePermission('inventory:view-products'), controller.listProducts);
router.post('/', requirePermission('inventory:create-products'), controller.createProduct);
router.get('/:id/transactions', requirePermission('inventory:view-products'), controller.getProductTransactions);
router.get('/:id', requirePermission('inventory:view-products'), controller.getProductById);
router.put('/:id', requirePermission('inventory:update-products'), controller.updateProduct);
router.delete('/:id', requirePermission('inventory:delete-products'), controller.deleteProduct);

router.patch('/:id/toggle-price-lock', requirePermission('inventory:update-products'), controller.togglePriceLock);

module.exports = router;
