// backend/src/modules/users/users.controller.js
const usersService = require('./users.service');
const { success, created, paginated, error } = require('../../utils/response');

const list = async (req, res, next) => {
  try {
    const result = await usersService.list(req.query);
    return paginated(res, result.data, result.pagination);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const user = await usersService.getById(req.params.id);
    return success(res, user);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { name, email, password, roleId } = req.body;
    if (!name || !email || !password || !roleId) {
      return error(res, 'name, email, password, and roleId are required', 400);
    }
    const user = await usersService.create(req.body, req.user.id);
    return created(res, user, 'User created successfully');
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const user = await usersService.update(req.params.id, req.body, req.user.id);
    return success(res, user, 'User updated successfully');
  } catch (err) { next(err); }
};

const toggleStatus = async (req, res, next) => {
  try {
    const user = await usersService.toggleStatus(req.params.id, req.user.id);
    return success(res, user, `User ${user.isActive ? 'activated' : 'deactivated'}`);
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await usersService.remove(req.params.id, req.user.id);
    return success(res, null, 'User deleted successfully');
  } catch (err) { next(err); }
};

const getStats = async (req, res, next) => {
  try {
    const stats = await usersService.getStats();
    return success(res, stats);
  } catch (err) { next(err); }
};

module.exports = { list, getById, create, update, toggleStatus, remove, getStats };
