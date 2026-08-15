// backend/src/modules/roles/roles.service.js
const prisma = require('../../config/database');
const { getPagination, buildPaginationMeta } = require('../../utils/paginate');

const ROLE_SELECT = {
  id: true, name: true, nameAr: true, displayName: true, displayNameAr: true,
  description: true, color: true, isSystem: true, uiShell: true, sortOrder: true,
  createdAt: true, updatedAt: true,
  _count: { select: { users: true } },
};

// ── Roles CRUD ────────────────────────────────────────────────────────────────

const listRoles = async () => {
  return prisma.role.findMany({ select: ROLE_SELECT, orderBy: { sortOrder: 'asc' } });
};

const getRoleById = async (id) => {
  const role = await prisma.role.findUnique({
    where: { id },
    select: {
      ...ROLE_SELECT,
      permissions: { select: { permission: true }, orderBy: { permission: { sortOrder: 'asc' } } },
    },
  });
  if (!role) throw Object.assign(new Error('Role not found'), { statusCode: 404 });
  return role;
};

const createRole = async (dto, actorId) => {
  const { name, nameAr, displayName, displayNameAr, description, color, uiShell, permissionIds } = dto;

  const role = await prisma.role.create({
    data: { name, nameAr, displayName, displayNameAr, description, color: color || '#6366f1', uiShell: uiShell || 'SIDEBAR', isSystem: false },
    select: ROLE_SELECT,
  });

  if (permissionIds?.length) {
    await prisma.rolePermission.createMany({
      data: permissionIds.map(permissionId => ({ roleId: role.id, permissionId })),
      skipDuplicates: true,
    });
  }

  await prisma.auditLog.create({
    data: { userId: actorId, action: 'CREATE', module: 'roles', entityId: role.id, entityType: 'Role',
      afterData: { name, displayName }, description: `Created role "${displayName}"` },
  });

  return role;
};

const updateRole = async (id, dto, actorId) => {
  const existing = await prisma.role.findUnique({ where: { id } });
  if (!existing) throw Object.assign(new Error('Role not found'), { statusCode: 404 });

  const { name, nameAr, displayName, displayNameAr, description, color, uiShell } = dto;

  // System roles: only allow uiShell and color changes
  const data = existing.isSystem
    ? { ...(uiShell && { uiShell }), ...(color && { color }) }
    : { ...(name && { name }), ...(nameAr && { nameAr }), ...(displayName && { displayName }),
        ...(displayNameAr && { displayNameAr }), ...(description !== undefined && { description }),
        ...(color && { color }), ...(uiShell && { uiShell }) };

  const role = await prisma.role.update({ where: { id }, data, select: ROLE_SELECT });

  await prisma.auditLog.create({
    data: { userId: actorId, action: 'UPDATE', module: 'roles', entityId: id, entityType: 'Role',
      description: `Updated role "${existing.displayName}"` },
  });

  return role;
};

const deleteRole = async (id, actorId) => {
  const role = await prisma.role.findUnique({ where: { id }, include: { _count: { select: { users: true } } } });
  if (!role) throw Object.assign(new Error('Role not found'), { statusCode: 404 });
  if (role.isSystem) throw Object.assign(new Error('System roles cannot be deleted'), { statusCode: 400 });
  if (role._count.users > 0) throw Object.assign(new Error('Cannot delete a role that has users assigned'), { statusCode: 400 });

  await prisma.role.delete({ where: { id } });

  await prisma.auditLog.create({
    data: { userId: actorId, action: 'DELETE', module: 'roles', entityId: id, entityType: 'Role',
      description: `Deleted role "${role.displayName}"` },
  });
};

// ── Permissions ───────────────────────────────────────────────────────────────

const listPermissions = async () => {
  const perms = await prisma.permission.findMany({ orderBy: { sortOrder: 'asc' } });
  // Group by module
  const grouped = perms.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = { module: p.module, moduleAr: p.moduleAr, permissions: [] };
    acc[p.module].permissions.push(p);
    return acc;
  }, {});
  return Object.values(grouped);
};

const getRolePermissions = async (roleId) => {
  const rps = await prisma.rolePermission.findMany({
    where: { roleId },
    select: { permissionId: true },
  });
  return rps.map(rp => rp.permissionId);
};

const updateRolePermissions = async (roleId, permissionIds, actorId) => {
  const role = await prisma.role.findUnique({ where: { id: roleId } });
  if (!role) throw Object.assign(new Error('Role not found'), { statusCode: 404 });

  // Replace all permissions
  await prisma.rolePermission.deleteMany({ where: { roleId } });

  if (permissionIds?.length) {
    await prisma.rolePermission.createMany({
      data: permissionIds.map(permissionId => ({ roleId, permissionId })),
      skipDuplicates: true,
    });
  }

  await prisma.auditLog.create({
    data: { userId: actorId, action: 'ASSIGN_PERMISSIONS', module: 'roles', entityId: roleId, entityType: 'Role',
      afterData: { permissionCount: permissionIds?.length || 0 },
      description: `Updated permissions for role "${role.displayName}"` },
  });

  return getRolePermissions(roleId);
};

module.exports = { listRoles, getRoleById, createRole, updateRole, deleteRole, listPermissions, getRolePermissions, updateRolePermissions };
