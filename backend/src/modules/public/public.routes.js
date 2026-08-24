const express = require('express');
const router = express.Router();
const controller = require('./public.controller');
const auth = require('./public.auth.controller');
const { optionalCustomer, requireCustomer } = require('./public.middleware');

const orderHits = new Map();
const authHits = new Map();

const rateLimit = (bucket, windowMs, max, message) => (req, res, next) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  const stamps = (bucket.get(ip) || []).filter((time) => now - time < windowMs);
  if (stamps.length >= max) {
    return res.status(429).json({ success: false, message });
  }
  stamps.push(now);
  bucket.set(ip, stamps);
  next();
};

router.get('/company', controller.getCompany);
router.get('/categories', controller.listCategories);
router.get('/products', optionalCustomer, controller.listProducts);
router.get('/products/:id', optionalCustomer, controller.getProduct);
router.post(
  '/orders',
  optionalCustomer,
  rateLimit(orderHits, 10 * 60 * 1000, 8, 'Too many orders from this address. Please try again later.'),
  controller.createWebsiteOrder
);

router.post('/auth/register', rateLimit(authHits, 10 * 60 * 1000, 12, 'Too many attempts. Please try again later.'), auth.register);
router.post('/auth/login', rateLimit(authHits, 10 * 60 * 1000, 20, 'Too many attempts. Please try again later.'), auth.login);
router.post('/auth/refresh', auth.refresh);
router.post('/auth/logout', auth.logout);
router.get('/account/me', requireCustomer, auth.me);
router.put('/account/me', requireCustomer, auth.updateMe);
router.get('/account/orders', requireCustomer, auth.myOrders);

module.exports = router;
