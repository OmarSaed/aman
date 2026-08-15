// backend/src/modules/auth/auth.controller.js
const authService = require('./auth.service');
const { success, error } = require('../../utils/response');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return error(res, 'Email and password are required', 400);

    const ip = req.ip || req.connection.remoteAddress;
    const ua = req.headers['user-agent'];
    const result = await authService.login(email.toLowerCase().trim(), password, ip, ua);
    return success(res, result, 'Login successful');
  } catch (err) { next(err); }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return error(res, 'Refresh token required', 400);
    const result = await authService.refresh(refreshToken);
    return success(res, result, 'Token refreshed');
  } catch (err) { next(err); }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    await authService.logout(refreshToken, req.user?.id);
    return success(res, null, 'Logged out successfully');
  } catch (err) { next(err); }
};

const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    return success(res, user);
  } catch (err) { next(err); }
};

module.exports = { login, refresh, logout, getMe };
