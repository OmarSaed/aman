// backend/src/modules/inventory/inventory.controller.js
const { PrismaClient } = require('@prisma/client');
const { successResponse } = require('../../utils/response');
const { logAction } = require('../../utils/audit');
const { paginate } = require('../../utils/paginate');
const prisma = new PrismaClient();

// ─── Warehouses ─────────────────────────────────────────────────────────────

exports.listWarehouses = async (req, res, next) => {
  try {
    const warehouses = await prisma.warehouse.findMany({ orderBy: { createdAt: 'desc' } });
    return successResponse(res, warehouses);
  } catch (error) { next(error); }
};

exports.createWarehouse = async (req, res, next) => {
  try {
    const { name, location, type } = req.body;
    const existing = await prisma.warehouse.findFirst({ where: { name } });
    if (existing) return res.status(400).json({ success: false, message: 'Warehouse name already exists' });

    const warehouse = await prisma.warehouse.create({
      data: { name, location, type, createdBy: req.user.id }
    });
    
    await logAction(req.user.id, 'CREATE', 'inventory', warehouse.id, 'Warehouse', null, warehouse, req);
    return successResponse(res, warehouse, 'Warehouse created successfully', 201);
  } catch (error) { next(error); }
};

exports.updateWarehouse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, location, type } = req.body;
    const warehouse = await prisma.warehouse.findUnique({ where: { id } });
    if (!warehouse) return res.status(404).json({ success: false, message: 'Warehouse not found' });

    const updated = await prisma.warehouse.update({
      where: { id },
      data: { name, location, type, updatedBy: req.user.id }
    });

    await logAction(req.user.id, 'UPDATE', 'inventory', updated.id, 'Warehouse', warehouse, updated, req);
    return successResponse(res, updated, 'Warehouse updated successfully');
  } catch (error) { next(error); }
};

// ─── Stock Levels ───────────────────────────────────────────────────────────

exports.getStockLevels = async (req, res, next) => {
  try {
    const { page, limit, productId, warehouseId } = req.query;
    
    // Using prisma pagination utility
    const filters = {};
    if (productId) filters.productId = productId;
    if (warehouseId) filters.warehouseId = warehouseId;

    const query = {
      where: filters,
      include: {
        product: { select: { name: true, sku: true, imageUrl: true } },
        warehouse: { select: { name: true, type: true } }
      },
      orderBy: { updatedAt: 'desc' }
    };

    const result = await paginate(prisma.productStock, query, page, limit);
    return successResponse(res, result);
  } catch (error) { next(error); }
};

exports.getStockMovements = async (req, res, next) => {
  try {
    const { page, limit, productId, warehouseId } = req.query;
    const filters = {};
    if (productId) filters.productId = productId;
    if (warehouseId) filters.warehouseId = warehouseId;

    const query = {
      where: filters,
      include: {
        product: { select: { name: true, sku: true } },
        warehouse: { select: { name: true, type: true } },
        creator: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    };

    const result = await paginate(prisma.stockTransaction, query, page, limit);
    return successResponse(res, result);
  } catch (error) { next(error); }
};

// ─── Stock Transactions ─────────────────────────────────────────────────────

exports.transferStock = async (req, res, next) => {
  try {
    const { productId, fromWarehouseId, toWarehouseId, quantity, notes } = req.body;
    if (!productId || !fromWarehouseId || !toWarehouseId || !quantity || quantity <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid transfer parameters' });
    }
    if (fromWarehouseId === toWarehouseId) {
      return res.status(400).json({ success: false, message: 'Source and destination cannot be the same' });
    }

    const sysConfig = await prisma.systemSetting.findFirst();

    await prisma.$transaction(async (tx) => {
      // 1. Check Source Stock
      const sourceStock = await tx.productStock.findUnique({
        where: { productId_warehouseId: { productId, warehouseId: fromWarehouseId } }
      });
      if ((!sourceStock || sourceStock.quantity < quantity) && !sysConfig.allowNegativeStock) {
        throw new Error('Insufficient stock in source warehouse');
      }

      // 2. Deduct from Source
      const updatedSource = await tx.productStock.upsert({
        where: { productId_warehouseId: { productId, warehouseId: fromWarehouseId } },
        update: { quantity: { decrement: quantity }, updatedBy: req.user.id },
        create: { productId, warehouseId: fromWarehouseId, quantity: -quantity, updatedBy: req.user.id }
      });

      // 3. Add to Destination
      const updatedDest = await tx.productStock.upsert({
        where: { productId_warehouseId: { productId, warehouseId: toWarehouseId } },
        update: { quantity: { increment: quantity }, updatedBy: req.user.id },
        create: { productId, warehouseId: toWarehouseId, quantity, updatedBy: req.user.id }
      });

      // 4. Log transactions
      await tx.stockTransaction.create({
        data: {
          productId, warehouseId: fromWarehouseId, quantity: -quantity,
          transactionType: 'Transfer', notes: `Transfer to ${toWarehouseId}. ${notes || ''}`,
          createdBy: req.user.id
        }
      });

      await tx.stockTransaction.create({
        data: {
          productId, warehouseId: toWarehouseId, quantity,
          transactionType: 'Transfer', notes: `Transfer from ${fromWarehouseId}. ${notes || ''}`,
          createdBy: req.user.id
        }
      });
    });

    return successResponse(res, null, 'Stock transferred successfully');
  } catch (error) { 
    if (error.message.includes('Insufficient stock')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error); 
  }
};

exports.adjustStock = async (req, res, next) => {
  try {
    const { productId, warehouseId, quantity, notes } = req.body; // quantity can be negative
    if (!productId || !warehouseId || !quantity) {
      return res.status(400).json({ success: false, message: 'Invalid adjust parameters' });
    }

    const sysConfig = await prisma.systemSetting.findFirst();

    await prisma.$transaction(async (tx) => {
      const stock = await tx.productStock.findUnique({
        where: { productId_warehouseId: { productId, warehouseId } }
      });
      const currentQty = stock ? stock.quantity : 0;
      if (currentQty + quantity < 0 && !sysConfig.allowNegativeStock) {
        throw new Error('Adjustment would result in negative stock, which is disabled');
      }

      await tx.productStock.upsert({
        where: { productId_warehouseId: { productId, warehouseId } },
        update: { quantity: { increment: quantity }, updatedBy: req.user.id },
        create: { productId, warehouseId, quantity, updatedBy: req.user.id }
      });

      await tx.stockTransaction.create({
        data: {
          productId, warehouseId, quantity,
          transactionType: 'Adjustment', notes,
          createdBy: req.user.id
        }
      });
    });

    return successResponse(res, null, 'Stock adjusted successfully');
  } catch (error) {
    if (error.message.includes('negative stock')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error); 
  }
};
