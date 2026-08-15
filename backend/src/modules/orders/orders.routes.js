// backend/src/modules/orders/orders.routes.js
const express = require('express');
const router = express.Router();
const controller = require('./orders.controller');
const { authenticate } = require('../../middleware/auth.middleware');

router.use(authenticate); // All order routes require authentication

router.get('/', controller.listOrders);
router.post('/', controller.createOrder);
router.get('/:id', controller.getOrder);
router.put('/:id', controller.updateOrder);
router.patch('/:id/status', controller.updateOrderStatus);
router.post('/:id/payments', controller.addOrderPayment);
router.delete('/:id', controller.deleteOrder);
router.get('/:id/export/excel', controller.exportOrderExcel);

module.exports = router;
