// backend/src/modules/auth/auth.routes.js
const router = require('express').Router();
const ctrl   = require('./auth.controller');
const { authenticate } = require('../../middleware/auth.middleware');

router.post('/login',   ctrl.login);
router.post('/refresh', ctrl.refresh);
router.post('/logout',  authenticate, ctrl.logout);
router.get('/me',       authenticate, ctrl.getMe);

module.exports = router;
