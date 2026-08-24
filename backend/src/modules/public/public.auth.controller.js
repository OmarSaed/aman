const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const { successResponse } = require('../../utils/response');
const { signAccess, signRefresh, verifyRefresh } = require('../../config/jwt');
const prisma = new PrismaClient();

const httpError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const sanitizeCustomer = (customer) => {
  if (!customer) return customer;
  const { passwordHash, refreshTokens, ...safe } = customer;
  return {
    ...safe,
    isWholesale: customer.type === 'WHOLESALE',
    wholesalePending: customer.requestedType === 'WHOLESALE' && customer.type !== 'WHOLESALE' && customer.accountStatus === 'PENDING',
  };
};

const buildCustomerPayload = (customer) => ({
  sub: customer.id,
  kind: 'customer',
  email: customer.email,
  name: customer.name,
  type: customer.type,
  accountStatus: customer.accountStatus,
});

const issueTokens = async (customer) => {
  const payload = buildCustomerPayload(customer);
  const accessToken = signAccess(payload);
  const refreshToken = signRefresh({ sub: customer.id, kind: 'customer' });
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.customerRefreshToken.create({
    data: { customerId: customer.id, token: refreshToken, expiresAt },
  });
  return { accessToken, refreshToken, customer: sanitizeCustomer(customer) };
};

exports.register = async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    const phone = String(req.body?.phone || '').trim();
    const address = String(req.body?.address || '').trim();
    const companyName = String(req.body?.company || req.body?.companyName || '').trim();
    const requestedType = req.body?.type === 'WHOLESALE' ? 'WHOLESALE' : 'NORMAL';

    if (!name) throw httpError(400, 'Name is required');
    if (!email) throw httpError(400, 'Email is required');
    if (password.length < 6) throw httpError(400, 'Password must be at least 6 characters');

    const existing = await prisma.customer.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        passwordHash: { not: null },
      },
    });
    if (existing) throw httpError(409, 'An account with this email already exists');

    const passwordHash = await bcrypt.hash(password, 10);
    const isWholesaleRequest = requestedType === 'WHOLESALE';

    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        phone: phone || null,
        address: address || null,
        companyName: companyName || null,
        passwordHash,
        requestedType,
        type: 'NORMAL',
        accountStatus: isWholesaleRequest ? 'PENDING' : 'APPROVED',
      },
    });

    const tokens = await issueTokens(customer);
    return successResponse(res, tokens, isWholesaleRequest
      ? 'Account created. Wholesale pricing waits for admin approval.'
      : 'Account created', 201);
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!email || !password) throw httpError(400, 'Email and password are required');

    const customer = await prisma.customer.findFirst({
      where: {
        email: { equals: email, mode: 'insensitive' },
        passwordHash: { not: null },
      },
    });
    if (!customer || !customer.isActive) throw httpError(401, 'Invalid email or password');

    const valid = await bcrypt.compare(password, customer.passwordHash);
    if (!valid) throw httpError(401, 'Invalid email or password');

    const tokens = await issueTokens(customer);
    return successResponse(res, tokens, 'Signed in');
  } catch (error) {
    next(error);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const token = req.body?.refreshToken;
    if (!token) throw httpError(401, 'Refresh token required');
    let decoded;
    try {
      decoded = verifyRefresh(token);
    } catch {
      throw httpError(401, 'Invalid refresh token');
    }
    if (decoded.kind !== 'customer') throw httpError(401, 'Invalid refresh token');

    const stored = await prisma.customerRefreshToken.findUnique({ where: { token } });
    if (!stored || stored.expiresAt < new Date()) throw httpError(401, 'Refresh token expired');

    const customer = await prisma.customer.findUnique({ where: { id: decoded.sub } });
    if (!customer?.isActive || customer.accountStatus === 'NONE') {
      throw httpError(401, 'Customer account is not active');
    }

    const accessToken = signAccess(buildCustomerPayload(customer));
    return successResponse(res, { accessToken, customer: sanitizeCustomer(customer) });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const token = req.body?.refreshToken;
    if (token) {
      await prisma.customerRefreshToken.deleteMany({ where: { token } });
    }
    return successResponse(res, null, 'Signed out');
  } catch (error) {
    next(error);
  }
};

exports.me = async (req, res, next) => {
  try {
    return successResponse(res, sanitizeCustomer(req.customer));
  } catch (error) {
    next(error);
  }
};

exports.updateMe = async (req, res, next) => {
  try {
    const name = req.body?.name != null ? String(req.body.name).trim() : undefined;
    const phone = req.body?.phone != null ? String(req.body.phone).trim() : undefined;
    const address = req.body?.address != null ? String(req.body.address).trim() : undefined;
    const companyName = req.body?.company != null ? String(req.body.company).trim() : (req.body?.companyName != null ? String(req.body.companyName).trim() : undefined);
    const requestWholesale = !!req.body?.requestWholesale;

    const data = {};
    if (name) data.name = name;
    if (phone !== undefined) data.phone = phone || null;
    if (address !== undefined) data.address = address || null;
    if (companyName !== undefined) data.companyName = companyName || null;

    if (requestWholesale && req.customer.type !== 'WHOLESALE') {
      data.requestedType = 'WHOLESALE';
      data.accountStatus = 'PENDING';
    }

    const updated = await prisma.customer.update({
      where: { id: req.customer.id },
      data,
    });
    return successResponse(res, sanitizeCustomer(updated), 'Account updated');
  } catch (error) {
    next(error);
  }
};

exports.myOrders = async (req, res, next) => {
  try {
    const orders = await prisma.order.findMany({
      where: { customerId: req.customer.id, source: 'WEBSITE' },
      include: {
        items: { include: { product: { select: { name: true, sku: true, imageUrl: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return successResponse(res, orders);
  } catch (error) {
    next(error);
  }
};
