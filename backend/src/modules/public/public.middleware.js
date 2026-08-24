const { verifyAccess } = require('../../config/jwt');
const { unauthorized } = require('../../utils/response');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const isApprovedWholesale = (customer) =>
  !!customer && customer.isActive !== false && customer.type === 'WHOLESALE';

const optionalCustomer = async (req, _res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return next();
  try {
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccess(token);
    if (decoded?.kind !== 'customer' || !decoded.sub) return next();
    const customer = await prisma.customer.findUnique({ where: { id: decoded.sub } });
    if (customer?.isActive && customer.accountStatus !== 'NONE') {
      req.customer = customer;
    }
  } catch {
    // Public routes still work without a valid customer token
  }
  next();
};

const requireCustomer = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return unauthorized(res, 'No token provided');
  }
  try {
    const token = authHeader.split(' ')[1];
    const decoded = verifyAccess(token);
    if (decoded?.kind !== 'customer' || !decoded.sub) {
      return unauthorized(res, 'Customer token required');
    }
    const customer = await prisma.customer.findUnique({ where: { id: decoded.sub } });
    if (!customer || !customer.isActive || customer.accountStatus === 'NONE') {
      return unauthorized(res, 'Customer account is not active');
    }
    req.customer = customer;
    next();
  } catch {
    return unauthorized(res, 'Invalid or expired token');
  }
};

module.exports = { optionalCustomer, requireCustomer, isApprovedWholesale };
