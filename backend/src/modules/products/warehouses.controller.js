// backend/src/modules/products/warehouses.controller.js
const { PrismaClient } = require('@prisma/client');
const { successResponse } = require('../../utils/response');
const { logAction } = require('../../utils/audit');

const prisma = new PrismaClient();

exports.listWarehouses = async (req, res, next) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return successResponse(res, warehouses);
  } catch (error) { next(error); }
};

exports.createWarehouse = async (req, res, next) => {
  try {
    const { name, location, type } = req.body;
    const existing = await prisma.warehouse.findFirst({ where: { name } });
    if (existing) return res.status(400).json({ success: false, message: 'Warehouse name already exists' });

    const warehouse = await prisma.warehouse.create({
      data: { 
        name, 
        location, 
        type: type === 'WAREHOUSE' ? 'Warehouse' : (type === 'SHOWROOM' ? 'Showroom' : type),
        createdBy: req.user.id 
      }
    });
    await logAction(req.user.id, 'CREATE', 'warehouses', warehouse.id, 'Warehouse', null, warehouse, req);
    return successResponse(res, warehouse, 'Warehouse created successfully', 201);
  } catch (error) { next(error); }
};
