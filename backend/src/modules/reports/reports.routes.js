// backend/src/modules/reports/reports.routes.js
const express = require('express');
const router = express.Router();
const reportsController = require('./reports.controller');
const { authenticate } = require('../../middleware/auth.middleware');

router.use(authenticate);

router.get('/sales',     reportsController.getSalesReports);
router.get('/purchases', reportsController.getPurchasesReports);
router.get('/inventory', reportsController.getInventoryReports);
router.get('/customers', reportsController.getCustomerReports);
router.get('/cashflow',  reportsController.getCashflowReports);
router.get('/stock-transactions', reportsController.getStockTransactionsReport);
router.get('/charts',    reportsController.getChartData);
router.post('/export',    reportsController.exportCustomReport);

module.exports = router;
