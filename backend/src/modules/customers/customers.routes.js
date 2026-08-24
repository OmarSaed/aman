// backend/src/modules/customers/customers.routes.js
const express = require('express');
const router = express.Router();
const customersController = require('./customers.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/rbac.middleware');

// All customer routes require authentication
router.use(authenticate);

// List and search customers
router.get('/', requirePermission('customers:view'), customersController.listCustomers);

// Create a new customer
router.post('/', requirePermission('customers:create'), customersController.createCustomer);

// Get customer account/ledger summary
router.get('/:id/account', requirePermission('customers:view'), customersController.getCustomerAccount);

// Add a manual payment/deposit
router.post('/payments', requirePermission('customers:update'), customersController.addPayment);

// Update customer info
router.put('/:id', requirePermission('customers:update'), customersController.updateCustomer);

router.patch('/:id/wholesale-review', requirePermission('customers:update'), customersController.reviewWholesale);

// Reset customer balance/history
router.post('/:id/reset', requirePermission('customers:update'), customersController.resetCustomer);

// Delete customer
router.delete('/:id', requirePermission('customers:delete'), customersController.deleteCustomer);

module.exports = router;
