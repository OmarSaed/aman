// backend/src/modules/daybox/daybox.controller.js
const { PrismaClient } = require('@prisma/client');
const { successResponse } = require('../../utils/response');
const { logAction } = require('../../utils/audit');
const prisma = new PrismaClient();

exports.openSession = async (req, res, next) => {
  try {
    const { openingBalance, notes } = req.body;

    // 1. Check if an open session already exists for this user
    const existing = await prisma.cashSession.findFirst({
      where: { userId: req.user.id || '', status: 'OPEN' }
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You already have an open session. Please close it first.' });
    }

    // 2. Create new session
    const session = await prisma.cashSession.create({
      data: {
        userId: req.user.id,
        openingBalance: openingBalance || 0,
        expectedBalance: openingBalance || 0,
        notes
      }
    });

    await logAction(req.user.id, 'CREATE', 'daybox', session.id, 'CashSession', null, session, req);
    return successResponse(res, session, 'Daybox session opened successfully', 201);
  } catch (error) { next(error); }
};

exports.getActiveSession = async (req, res, next) => {
  try {
    const session = await prisma.cashSession.findFirst({
      where: { userId: req.user.id || '', status: 'OPEN' },
      include: {
        user: { select: { name: true } },
        _count: {
          select: { transactions: true, expenses: true, supplierPayments: true }
        }
      }
    });
    return successResponse(res, session);
  } catch (error) { next(error); }
};

exports.getSessionSummary = async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await prisma.cashSession.findUnique({
      where: { id },
      include: {
        transactions: { include: { customer: { select: { name: true } } } },
        expenses: { include: { category: { select: { name: true } } } },
        supplierPayments: { include: { supplier: { select: { name: true } } } }
      }
    });

    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    return successResponse(res, session);
  } catch (error) { next(error); }
};

exports.closeSession = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { actualBalance, notes } = req.body;

    const session = await prisma.cashSession.findUnique({ where: { id } });
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    if (session.status === 'CLOSED') return res.status(400).json({ success: false, message: 'Session is already closed' });

    const difference = Number(actualBalance) - Number(session.expectedBalance);

    const updated = await prisma.cashSession.update({
      where: { id },
      data: {
        actualBalance,
        difference,
        closingDate: new Date(),
        status: 'CLOSED',
        notes: notes || session.notes
      }
    });

    await logAction(req.user.id, 'UPDATE', 'daybox', updated.id, 'CashSession', session, updated, req);
    return successResponse(res, updated, 'Daybox session closed successfully');
  } catch (error) { next(error); }
};

exports.listSessions = async (req, res, next) => {
  try {
    const { userId } = req.query;
    const filters = {};
    if (userId) filters.userId = userId;

    const sessions = await prisma.cashSession.findMany({
      where: filters,
      include: { user: { select: { name: true } } },
      orderBy: { openingDate: 'desc' },
      take: 50
    });

    return successResponse(res, sessions);
  } catch (error) { next(error); }
};
