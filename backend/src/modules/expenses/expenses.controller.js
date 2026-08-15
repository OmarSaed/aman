// backend/src/modules/expenses/expenses.controller.js
const { PrismaClient } = require('@prisma/client');
const { successResponse } = require('../../utils/response');
const { logAction } = require('../../utils/audit');
const { paginate } = require('../../utils/paginate');
const prisma = new PrismaClient();

// ─── Expense Categories ──────────────────────────────────────────────────

exports.listCategories = async (req, res, next) => {
  try {
    const categories = await prisma.expenseCategory.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { expenses: true } } }
    });
    return successResponse(res, categories);
  } catch (error) { next(error); }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name, nameAr, description } = req.body;
    
    const category = await prisma.expenseCategory.create({
      data: { name, nameAr, description, createdBy: req.user.id }
    });
    
    await logAction(req.user.id, 'CREATE', 'expenses', category.id, 'ExpenseCategory', null, category, req);
    return successResponse(res, category, 'Expense Category created', 201);
  } catch (error) { next(error); }
};

// ─── Expenses ──────────────────────────────────────────────────────────────

exports.listExpenses = async (req, res, next) => {
  try {
    const { page, limit, categoryId, startDate, endDate, method, search } = req.query;
    const filters = {};
    
    if (categoryId) filters.categoryId = categoryId;
    if (method) filters.paymentMethod = method;
    
    if (search) {
      filters.OR = [
        { notes: { contains: search, mode: 'insensitive' } },
        { reference: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (startDate || endDate) {
      filters.date = {};
      if (startDate) filters.date.gte = new Date(startDate);
      if (endDate) filters.date.lte = new Date(endDate);
    }

    const query = {
      where: filters,
      orderBy: { date: 'desc' },
      include: { 
        category: { select: { name: true, nameAr: true } },
        creator: { select: { name: true } }
      }
    };

    // ── Calculate Stats ───────────────────────────────────────────
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todaySum, monthSum, totalSum] = await Promise.all([
      prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: startOfToday } } }),
      prisma.expense.aggregate({ _sum: { amount: true }, where: { date: { gte: startOfMonth } } }),
      prisma.expense.aggregate({ _sum: { amount: true } })
    ]);

    const stats = {
      today: todaySum._sum.amount || 0,
      month: monthSum._sum.amount || 0,
      total: totalSum._sum.amount || 0
    };

    if (page && limit) {
      const result = await paginate(prisma.expense, query, page, limit);
      return res.status(200).json({
        ...result,
        stats
      });
    }

    const expenses = await prisma.expense.findMany(query);
    return successResponse(res, { data: expenses, stats });
  } catch (error) { next(error); }
};

exports.createExpense = async (req, res, next) => {
  try {
    const { categoryId, amount, date, notes, paymentMethod, reference } = req.body;
    
    const expense = await prisma.expense.create({
      data: {
        categoryId,
        amount: parseFloat(amount),
        date: date ? new Date(date) : new Date(),
        notes,
        paymentMethod: paymentMethod || 'CASH',
        reference,
        createdBy: req.user.id
      }
    });

    await logAction(req.user.id, 'CREATE', 'expenses', expense.id, 'Expense', null, expense, req);
    return successResponse(res, expense, 'Expense recorded successfully', 201);
  } catch (error) { next(error); }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    const { id } = req.params;
    const old = await prisma.expense.findUnique({ where: { id } });
    
    if (!old) return res.status(404).json({ success: false, message: 'Expense not found' });

    await prisma.expense.delete({ where: { id } });
    await logAction(req.user.id, 'DELETE', 'expenses', id, 'Expense', old, null, req);
    
    return successResponse(res, null, 'Expense deleted successfully');
  } catch (error) { next(error); }
};
