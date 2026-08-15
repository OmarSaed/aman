// backend/src/modules/roles/roles.routes.js
const router = require('express').Router();
const ctrl   = require('./roles.controller');
const { authenticate }      = require('../../middleware/auth.middleware');
const { requirePermission, requireAnyPermission } = require('../../middleware/rbac.middleware');

router.use(authenticate);

router.get('/',                          requirePermission('roles:view'),               ctrl.listRoles);
router.get('/permissions',               requirePermission('roles:view'),               ctrl.listPermissions);
router.get('/:id',                       requirePermission('roles:view'),               ctrl.getRoleById);
router.get('/:id/permissions',           requirePermission('roles:view'),               ctrl.getRolePermissions);
router.post('/',                         requirePermission('roles:create'),              ctrl.createRole);
router.put('/:id',                       requireAnyPermission('roles:update','roles:assign-permissions'), ctrl.updateRole);
router.put('/:id/permissions',           requirePermission('roles:assign-permissions'), ctrl.updateRolePermissions);
router.delete('/:id',                    requirePermission('roles:delete'),              ctrl.deleteRole);

module.exports = router;
