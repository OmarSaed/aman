// backend/src/config/jwt.js
const jwt = require('jsonwebtoken');

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES  || '15m';
const REFRESH_EXPIRES= process.env.JWT_REFRESH_EXPIRES || '7d';

const signAccess = (payload) =>
  jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });

const signRefresh = (payload) =>
  jwt.sign(payload, REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES });

const verifyAccess = (token) =>
  jwt.verify(token, ACCESS_SECRET);

const verifyRefresh = (token) =>
  jwt.verify(token, REFRESH_SECRET);

module.exports = { signAccess, signRefresh, verifyAccess, verifyRefresh };
