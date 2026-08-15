// backend/src/modules/accounting/accounting.controller.js
const { PrismaClient } = require('@prisma/client');
const { successResponse } = require('../../utils/response');
const { paginate } = require('../../utils/paginate');
const prisma = new PrismaClient();

/**
 * Unified Ledger: Shows transactions from Customers, Suppliers, and Expenses
 */
exports.listUnifiedTransactions = async (req, res, next) => {
  try {
    const { page, limit, startDate, endDate } = req.query;
    
    const dateFilter = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    // Fetch data from three sources
    const [customerTrans, supplierTrans, expenses] = await Promise.all([
      prisma.customerTransaction.findMany({
        where: dateFilter.gte || dateFilter.lte ? { date: dateFilter } : {},
        include: { customer: { select: { name: true } } },
        orderBy: { date: 'desc' },
        take: limit ? parseInt(limit) : 50
      }),
      prisma.supplierTransaction.findMany({
        where: dateFilter.gte || dateFilter.lte ? { date: dateFilter } : {},
        include: { supplier: { select: { name: true } } },
        orderBy: { date: 'desc' },
        take: limit ? parseInt(limit) : 50
      }),
      prisma.expense.findMany({
        where: dateFilter.gte || dateFilter.lte ? { date: dateFilter } : {},
        include: { category: { select: { name: true, nameAr: true } } },
        orderBy: { date: 'desc' },
        take: limit ? parseInt(limit) : 50
      })
    ]);

    // Format and Combine
    let combined = [
      ...customerTrans.map(t => ({
        id: t.id,
        date: t.date,
        type: 'CUSTOMER_PAYMENT',
        subType: t.type,
        party: t.customer?.name,
        amount: parseFloat(t.amount),
        direction: t.type === 'PAYMENT' ? 'IN' : 'OUT',
        notes: t.notes,
        module: 'customers'
      })),
      ...supplierTrans.map(t => ({
        id: t.id,
        date: t.date,
        type: 'SUPPLIER_PAYMENT',
        subType: t.type,
        party: t.supplier?.name,
        amount: parseFloat(t.amount),
        direction: t.type === 'PAYMENT' ? 'OUT' : 'IN',
        notes: t.notes,
        module: 'suppliers'
      })),
      ...expenses.map(t => ({
        id: t.id,
        date: t.date,
        type: 'EXPENSE',
        subType: t.category?.name || 'General',
        party: 'Internal',
        amount: parseFloat(t.amount),
        direction: 'OUT',
        notes: t.notes,
        module: 'expenses'
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    // ── Apply Search Filter ──────────────────────────────────────────
    const { search } = req.query;
    if (search) {
      const q = search.toLowerCase();
      combined = combined.filter(t => 
        (t.party?.toLowerCase() || '').includes(q) ||
        (t.notes?.toLowerCase() || '').includes(q) ||
        (t.type?.toLowerCase() || '').includes(q) ||
        (t.subType?.toLowerCase() || '').includes(q)
      );
    }

    // Simple slicing for "pseudo-pagination" of combined results
    const p = page ? parseInt(page) : 1;
    const l = limit ? parseInt(limit) : 50;
    const paginated = combined.slice((p - 1) * l, p * l);

    return successResponse(res, {
      data: paginated,
      pagination: {
        total: combined.length,
        page: p,
        totalPages: Math.ceil(combined.length / l),
        limit: l
      }
    });
  } catch (error) { next(error); }
};
