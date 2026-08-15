// backend/src/utils/audit.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Logs an action to the audit_logs table.
 * 
 * @param {string|null} userId - ID of the user performing the action
 * @param {string} action - Action enum ('CREATE', 'UPDATE', 'DELETE', etc.)
 * @param {string} module - Module where the action occurred
 * @param {string|null} entityId - ID of the entity affected
 * @param {string|null} entityType - Model name of the entity
 * @param {object|null} beforeData - Data state before the action
 * @param {object|null} afterData - Data state after the action
 * @param {object} req - Express request object for IP and User-Agent
 * @param {string|null} description - Human readable description
 */
exports.logAction = async (
  userId,
  action,
  module,
  entityId = null,
  entityType = null,
  beforeData = null,
  afterData = null,
  req = {},
  description = null
) => {
  try {
    const ipAddress = req.ip || req.connection?.remoteAddress || null;
    const userAgent = req.headers ? req.headers['user-agent'] : null;

    // Fire and forget, we don't need to await or block the request thread
    prisma.auditLog.create({
      data: {
        userId,
        action,
        module,
        entityId: entityId ? String(entityId) : null,
        entityType,
        beforeData: beforeData ? beforeData : null,
        afterData: afterData ? afterData : null,
        ipAddress,
        userAgent,
        description
      }
    }).catch(err => {
      console.error('Failed to write audit log:', err.message);
    });
  } catch (error) {
    console.error('Audit Log Error:', error.message);
  }
};
