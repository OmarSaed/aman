// backend/src/modules/roles/roles.controller.js
const rolesService = require('./roles.service');
const { success, created, error } = require('../../utils/response');

const listRoles = async (req, res, next) => {
  try { return success(res, await rolesService.listRoles()); } catch (err) { next(err); }
};
const getRoleById = async (req, res, next) => {
  try { return success(res, await rolesService.getRoleById(req.params.id)); } catch (err) { next(err); }
};
const createRole = async (req, res, next) => {
  try {
    const { name, displayName } = req.body;
    if (!name || !displayName) return error(res, 'name and displayName are required', 400);
    return created(res, await rolesService.createRole(req.body, req.user.id), 'Role created');
  } catch (err) { next(err); }
};
const updateRole = async (req, res, next) => {
  try { return success(res, await rolesService.updateRole(req.params.id, req.body, req.user.id), 'Role updated'); }
  catch (err) { next(err); }
};
const deleteRole = async (req, res, next) => {
  try { await rolesService.deleteRole(req.params.id, req.user.id); return success(res, null, 'Role deleted'); }
  catch (err) { next(err); }
};
const listPermissions = async (req, res, next) => {
  try { return success(res, await rolesService.listPermissions()); } catch (err) { next(err); }
};
const getRolePermissions = async (req, res, next) => {
  try { return success(res, await rolesService.getRolePermissions(req.params.id)); } catch (err) { next(err); }
};
const updateRolePermissions = async (req, res, next) => {
  try {
    const { permissionIds } = req.body;
    if (!Array.isArray(permissionIds)) return error(res, 'permissionIds must be an array', 400);
    const result = await rolesService.updateRolePermissions(req.params.id, permissionIds, req.user.id);
    return success(res, result, 'Permissions updated');
  } catch (err) { next(err); }
};

module.exports = { listRoles, getRoleById, createRole, updateRole, deleteRole, listPermissions, getRolePermissions, updateRolePermissions };
