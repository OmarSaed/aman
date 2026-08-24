// backend/src/modules/customers/customers.controller.js
const { PrismaClient } = require('@prisma/client');
const { successResponse } = require('../../utils/response');
const { logAction } = require('../../utils/audit');
const { paginate } = require('../../utils/paginate');
const prisma = new PrismaClient();

const sanitizeCustomer = (customer) => {
  if (!customer) return customer;
  const { passwordHash, ...safe } = customer;
  return safe;
};

// ─── Customers ──────────────────────────────────────────────────────────────

exports.listCustomers = async (req, res, next) => {
  try {
    const { page, limit, search, type, accountStatus } = req.query;
    const filters = {};
    
    if (search) {
      filters.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    
    if (type) {
      filters.type = type;
    }
    if (accountStatus) {
      filters.accountStatus = accountStatus;
    }

    const query = {
      where: filters,
      orderBy: { createdAt: 'desc' }
    };

    if (page && limit) {
      const result = await paginate(prisma.customer, query, page, limit);
      return res.status(200).json({
        ...result,
        data: (result.data || []).map(sanitizeCustomer),
      });
    }

    const customers = await prisma.customer.findMany(query);
    return successResponse(res, customers.map(sanitizeCustomer));
  } catch (error) { next(error); }
};

exports.createCustomer = async (req, res, next) => {
  try {
    const { name, phone, email, address, type, isDefaultPos } = req.body;
    
    if (isDefaultPos) {
      await prisma.customer.updateMany({
        where: { isDefaultPos: true },
        data: { isDefaultPos: false }
      });
    }

    const customer = await prisma.customer.create({
      data: { 
        name, 
        phone, 
        email, 
        address, 
        type: type || 'NORMAL',
        isDefaultPos: !!isDefaultPos,
        createdBy: req.user.id 
      }
    });
    
    await logAction(req.user.id, 'CREATE', 'customers', customer.id, 'Customer', null, customer, req);
    return successResponse(res, sanitizeCustomer(customer), 'Customer created', 201);
  } catch (error) { next(error); }
};

exports.updateCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, email, address, type, isActive, isDefaultPos } = req.body;
    
    const old = await prisma.customer.findUnique({ where: { id } });
    if (!old) return res.status(404).json({ success: false, message: 'Customer not found' });

    if (isDefaultPos) {
      await prisma.customer.updateMany({
        where: { id: { not: id }, isDefaultPos: true },
        data: { isDefaultPos: false }
      });
    }

    const updated = await prisma.customer.update({
      where: { id },
      data: { 
        name, 
        phone, 
        email, 
        address, 
        type, 
        isActive,
        isDefaultPos: isDefaultPos !== undefined ? !!isDefaultPos : old.isDefaultPos,
        requestedType: type === 'WHOLESALE' ? 'WHOLESALE' : old.requestedType,
        accountStatus: type === 'WHOLESALE' && old.accountStatus !== 'NONE'
          ? 'APPROVED'
          : old.accountStatus,
        updatedBy: req.user.id 
      }
    });

    await logAction(req.user.id, 'UPDATE', 'customers', updated.id, 'Customer', old, updated, req);
    return successResponse(res, sanitizeCustomer(updated), 'Customer updated');
  } catch (error) { next(error); }
};

exports.deleteCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const old = await prisma.customer.findUnique({ 
      where: { id }, 
      include: { _count: { select: { transactions: true } } } 
    });
    
    if (!old) return res.status(404).json({ success: false, message: 'Customer not found' });

    if (old._count.transactions > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete customer with existing transactions. Deactivate instead.' 
      });
    }

    await prisma.customer.delete({ where: { id } });
    await logAction(req.user.id, 'DELETE', 'customers', id, 'Customer', old, null, req);
    return successResponse(res, null, 'Customer deleted successfully');
  } catch (error) { next(error); }
};

// ─── Customer Account & Ledger ──────────────────────────────────────────────

exports.getCustomerAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page, limit, search } = req.query;
    
    const customer = await prisma.customer.findUnique({ where: { id } });
    if (!customer) return res.status(404).json({ success: false, message: 'Customer not found' });

    const filters = { customerId: id };
    if (search) {
      filters.notes = { contains: search, mode: 'insensitive' };
    }

    const query = {
      where: filters,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      include: { creator: { select: { name: true } } }
    };

    if (page && limit) {
      const result = await paginate(prisma.customerTransaction, query, page, limit);
      return res.status(200).json({ customer: sanitizeCustomer(customer), ...result });
    }

    const transactions = await prisma.customerTransaction.findMany(query);
    return successResponse(res, { customer: sanitizeCustomer(customer), transactions });
  } catch (error) { next(error); }
};

exports.addPayment = async (req, res, next) => {
  try {
    const { customerId, amount, notes, date } = req.body;
    
    if (!customerId || !amount) {
      return res.status(400).json({ success: false, message: 'Customer ID and amount are required' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer) throw new Error('Customer not found');

      const numericAmount = parseFloat(amount);
      const newBalance = parseFloat(customer.balance) - numericAmount;

      // 1. Create Transaction record
      const transaction = await tx.customerTransaction.create({
        data: {
          customerId,
          type: 'PAYMENT',
          amount: numericAmount,
          balanceAfter: newBalance,
          notes,
          date: date ? new Date(date) : new Date(),
          createdBy: req.user.id
        }
      });

      // 2. Update Customer balance
      const updatedCustomer = await tx.customer.update({
        where: { id: customerId },
        data: { balance: newBalance }
      });

      return { transaction, updatedCustomer };
    });

    await logAction(req.user.id, 'CREATE', 'customers', result.transaction.id, 'CustomerTransaction', null, result.transaction, req);
    
    return successResponse(res, result, 'Payment added successfully');
  } catch (error) {
    if (error.message === 'Customer not found') return res.status(404).json({ success: false, message: error.message });
    next(error);
  }
};

exports.resetCustomer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { deleteHistory } = req.body;
    
    await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id } });
      if (!customer) throw new Error('Customer not found');

      if (deleteHistory) {
        const ordersToReset = await tx.order.findMany({
          where: { customerId: id },
          include: { items: true }
        });

        for (const order of ordersToReset) {
          for (const item of order.items) {
            const stockRecord = await tx.productStock.findFirst({
              where: { productId: item.productId }
            });
            let targetWarehouseId = null;

            if (stockRecord) {
              targetWarehouseId = stockRecord.warehouseId;
              await tx.productStock.update({
                where: { id: stockRecord.id },
                data: { quantity: stockRecord.quantity + item.quantity }
              });
            } else {
              const defaultWarehouse = await tx.warehouse.findFirst();
              if (defaultWarehouse) {
                targetWarehouseId = defaultWarehouse.id;
                await tx.productStock.create({
                  data: {
                    productId: item.productId,
                    warehouseId: targetWarehouseId,
                    quantity: item.quantity
                  }
                });
              }
            }

            if (targetWarehouseId) {
              await tx.stockTransaction.create({
                data: {
                  productId: item.productId,
                  warehouseId: targetWarehouseId,
                  transactionType: 'Return',
                  quantity: item.quantity,
                  referenceId: order.orderNumber,
                  notes: `Customer balance zeroing: ${customer.name}`,
                  createdBy: req.user.id
                }
              });
            }
          }
        }

        // Delete all orders for the customer
        await tx.order.deleteMany({ where: { customerId: id } });
        // Delete all transactions for the customer
        await tx.customerTransaction.deleteMany({ where: { customerId: id } });
        // Reset balance to 0
        await tx.customer.update({
          where: { id },
          data: { balance: 0, updatedBy: req.user.id }
        });
      } else {
        const currentBalance = parseFloat(customer.balance);
        if (currentBalance !== 0) {
          // Create an adjustment transaction to offset the current balance
          await tx.customerTransaction.create({
            data: {
              customerId: id,
              type: 'ADJUSTMENT',
              amount: -currentBalance,
              balanceAfter: 0,
              notes: 'Account Reset Adjustment',
              date: new Date(),
              createdBy: req.user.id
            }
          });
          // Update customer balance to 0
          await tx.customer.update({
            where: { id },
            data: { balance: 0, updatedBy: req.user.id }
          });
        }
      }
    });

    await logAction(req.user.id, 'UPDATE', 'customers', id, 'Customer', null, { reset: true, deleteHistory }, req);

    return successResponse(res, null, 'Customer account reset successfully');
  } catch (error) {
    if (error.message === 'Customer not found') return res.status(404).json({ success: false, message: error.message });
    next(error);
  }
};

exports.reviewWholesale = async (req, res, next) => {
  try {
    const { id } = req.params;
    const action = String(req.body?.action || '').toLowerCase();
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be approve or reject' });
    }

    const old = await prisma.customer.findUnique({ where: { id } });
    if (!old) return res.status(404).json({ success: false, message: 'Customer not found' });

    const updated = await prisma.customer.update({
      where: { id },
      data: action === 'approve'
        ? { type: 'WHOLESALE', requestedType: 'WHOLESALE', accountStatus: 'APPROVED', updatedBy: req.user.id }
        : { type: 'NORMAL', accountStatus: 'REJECTED', updatedBy: req.user.id },
    });

    await logAction(req.user.id, 'UPDATE', 'customers', id, 'Customer', old, updated, req);
    return successResponse(res, sanitizeCustomer(updated), action === 'approve' ? 'Wholesale account approved' : 'Wholesale request rejected');
  } catch (error) { next(error); }
};
