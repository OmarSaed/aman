// backend/src/modules/users/users.service.js
const bcrypt = require('bcryptjs');
const prisma  = require('../../config/database');
const { getPagination, buildPaginationMeta } = require('../../utils/paginate');

const USER_SELECT = {
  id: true, name: true, nameAr: true, email: true,
  isActive: true, preferredLang: true, avatar: true,
  lastLoginAt: true, createdAt: true, updatedAt: true,
  role: { select: { id: true, name: true, displayName: true, displayNameAr: true, color: true, uiShell: true } },
};

const list = async (query) => {
  const { page, limit, skip } = getPagination(query);
  const { search, roleId, isActive } = query;

  const where = {
    ...(search && {
      OR: [
        { name:  { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { nameAr:{ contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(roleId   && { roleId }),
    ...(isActive !== undefined && { isActive: isActive === 'true' }),
  };

  const [data, total] = await Promise.all([
    prisma.user.findMany({ where, select: USER_SELECT, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where }),
  ]);

  return { data, pagination: buildPaginationMeta(total, page, limit) };
};

const getById = async (id) => {
  const user = await prisma.user.findUnique({ where: { id }, select: USER_SELECT });
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  return user;
};

const create = async (dto, actorId) => {
  const { name, nameAr, email, password, roleId, preferredLang } = dto;

  // validate role exists
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw Object.assign(new Error('Role not found'), { statusCode: 400 });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: { name, nameAr, email: email.toLowerCase().trim(), passwordHash, roleId, preferredLang: preferredLang || 'en' },
    select: USER_SELECT,
  });

  await prisma.auditLog.create({
    data: { userId: actorId, action: 'CREATE', module: 'users', entityId: user.id, entityType: 'User',
      afterData: { name, email, roleId }, description: `Created user ${name}` },
  });

  return user;
};

const update = async (id, dto, actorId) => {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  const { name, nameAr, email, password, roleId, preferredLang } = dto;

  const data = {
    ...(name          && { name }),
    ...(nameAr        && { nameAr }),
    ...(email         && { email: email.toLowerCase().trim() }),
    ...(roleId        && { roleId }),
    ...(preferredLang && { preferredLang }),
    ...(password      && { passwordHash: await bcrypt.hash(password, 12) }),
  };

  const user = await prisma.user.update({ where: { id }, data, select: USER_SELECT });

  await prisma.auditLog.create({
    data: { userId: actorId, action: 'UPDATE', module: 'users', entityId: id, entityType: 'User',
      beforeData: { name: existing.name, email: existing.email }, afterData: data,
      description: `Updated user ${user.name}` },
  });

  return user;
};

const toggleStatus = async (id, actorId) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });
  if (id === actorId) throw Object.assign(new Error('Cannot deactivate your own account'), { statusCode: 400 });

  const updated = await prisma.user.update({
    where: { id }, data: { isActive: !user.isActive }, select: USER_SELECT,
  });

  await prisma.auditLog.create({
    data: { userId: actorId, action: 'TOGGLE_STATUS', module: 'users', entityId: id, entityType: 'User',
      description: `${updated.isActive ? 'Activated' : 'Deactivated'} user ${user.name}` },
  });

  return updated;
};

const remove = async (id, actorId) => {
  if (id === actorId) throw Object.assign(new Error('Cannot delete your own account'), { statusCode: 400 });
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw Object.assign(new Error('User not found'), { statusCode: 404 });

  await prisma.user.delete({ where: { id } });

  await prisma.auditLog.create({
    data: { userId: actorId, action: 'DELETE', module: 'users', entityId: id, entityType: 'User',
      beforeData: { name: user.name, email: user.email }, description: `Deleted user ${user.name}` },
  });
};

const getStats = async () => {
  const [total, active, byRole] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.groupBy({ by: ['roleId'], _count: true }),
  ]);
  const roles = await prisma.role.findMany({ select: { id: true, displayName: true, color: true } });
  const byRoleMapped = byRole.map(r => ({
    ...roles.find(role => role.id === r.roleId),
    count: r._count,
  }));
  return { total, active, inactive: total - active, byRole: byRoleMapped };
};

module.exports = { list, getById, create, update, toggleStatus, remove, getStats };
