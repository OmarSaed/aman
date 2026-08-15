// backend/src/modules/users/users.routes.js
const router = require('express').Router();
const ctrl   = require('./users.controller');
const { authenticate }      = require('../../middleware/auth.middleware');
const { requirePermission } = require('../../middleware/rbac.middleware');

router.use(authenticate);

router.get('/',           requirePermission('users:view'),          ctrl.list);
router.get('/stats',      requirePermission('users:view'),          ctrl.getStats);
router.get('/:id',        requirePermission('users:view'),          ctrl.getById);
router.post('/',          requirePermission('users:create'),         ctrl.create);
router.put('/:id',        requirePermission('users:update'),         ctrl.update);
router.patch('/:id/status',requirePermission('users:toggle-status'),ctrl.toggleStatus);
router.delete('/:id',     requirePermission('users:delete'),         ctrl.remove);

module.exports = router;
