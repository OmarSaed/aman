// backend/src/modules/auth/auth.service.js
const bcrypt   = require('bcryptjs');
const prisma   = require('../../config/database');
const { signAccess, signRefresh, verifyRefresh } = require('../../config/jwt');

const USER_SELECT = {
  id: true, name: true, nameAr: true, email: true,
  isActive: true, preferredLang: true, avatar: true, lastLoginAt: true,
  createdAt: true,
  role: {
    select: {
      id: true, name: true, displayName: true, displayNameAr: true,
      color: true, uiShell: true,
      permissions: { select: { permission: { select: { key: true } } } },
    },
  },
};

const buildTokenPayload = (user) => ({
  sub:         user.id,
  email:       user.email,
  name:        user.name,
  roleId:      user.role.id,
  roleName:    user.role.name,
  uiShell:     user.role.uiShell,
  permissions: user.role.permissions.map(rp => rp.permission.key),
});

const login = async (email, password, ipAddress, userAgent) => {
  const user = await prisma.user.findUnique({ where: { email }, select: { ...USER_SELECT, passwordHash: true } });

  if (!user || !user.isActive) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw Object.assign(new Error('Invalid email or password'), { statusCode: 401 });
  }

  const payload      = buildTokenPayload(user);
  const accessToken  = signAccess(payload);
  const refreshToken = signRefresh({ sub: user.id });

  // Store refresh token
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.create({ data: { userId: user.id, token: refreshToken, expiresAt } });

  // Update last login
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  // Audit
  await prisma.auditLog.create({
    data: { userId: user.id, action: 'LOGIN', module: 'auth', ipAddress, userAgent, description: `${user.name} logged in` },
  });

  const { passwordHash: _, ...safeUser } = user;
  return { user: safeUser, accessToken, refreshToken, permissions: payload.permissions };
};

const refresh = async (token) => {
  let decoded;
  try { decoded = verifyRefresh(token); } catch { throw Object.assign(new Error('Invalid refresh token'), { statusCode: 401 }); }

  const stored = await prisma.refreshToken.findUnique({ where: { token } });
  if (!stored || stored.expiresAt < new Date()) {
    throw Object.assign(new Error('Refresh token expired or not found'), { statusCode: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: decoded.sub }, select: USER_SELECT });
  if (!user || !user.isActive) throw Object.assign(new Error('User not found'), { statusCode: 401 });

  const payload     = buildTokenPayload(user);
  const accessToken = signAccess(payload);

  return { accessToken, user };
};

const logout = async (refreshToken, userId) => {
  await prisma.refreshToken.deleteMany({ where: { token: refreshToken } });
  if (userId) {
    await prisma.auditLog.create({
      data: { userId, action: 'LOGOUT', module: 'auth', description: 'User logged out' },
    });
  }
};

const getMe = async (userId) => {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: USER_SELECT });
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  return user;
};

module.exports = { login, refresh, logout, getMe };
