// backend/src/modules/settings/settings.controller.js
const { PrismaClient } = require('@prisma/client');
const { successResponse } = require('../../utils/response');
const { logAction } = require('../../utils/audit');
const { recalculateProductCost } = require('../../utils/pricing');
const prisma = new PrismaClient();

// System Settings
exports.getSystemSettings = async (req, res, next) => {
  try {
    let settings = await prisma.systemSetting.findFirst();
    if (!settings) {
      settings = await prisma.systemSetting.create({ data: {} });
    }
    return successResponse(res, settings);
  } catch (error) { next(error); }
};

exports.updateSystemSettings = async (req, res, next) => {
  try {
    const { id, ...data } = req.body;
    let settings = await prisma.systemSetting.findFirst();
    if (!settings) throw new Error('System settings not found');

    const updated = await prisma.systemSetting.update({
      where: { id: settings.id },
      data: { ...data, updatedBy: req.user.id }
    });

    // If global pricing strategy changed, trigger background recalculation for all products
    if (data.defaultPricingStrategy && data.defaultPricingStrategy !== settings.defaultPricingStrategy) {
      // Run async to not block the request
      prisma.product.findMany({ select: { id: true } }).then(async (products) => {
        for (const p of products) {
          try {
            await recalculateProductCost(p.id, prisma);
          } catch (err) {
            console.error(`Failed to recalulate cost for product ${p.id}:`, err);
          }
        }
      });
    }

    await logAction(req.user.id, 'UPDATE', 'settings', updated.id, 'SystemSetting', settings, updated, req);
    return successResponse(res, updated, 'System settings updated successfully');
  } catch (error) { next(error); }
};

// Company Settings
exports.getCompanySettings = async (req, res, next) => {
  try {
    let settings = await prisma.companySetting.findFirst();
    if (!settings) {
      settings = await prisma.companySetting.create({ data: {} });
    }
    return successResponse(res, settings);
  } catch (error) { next(error); }
};

exports.updateCompanySettings = async (req, res, next) => {
  try {
    const { id, ...data } = req.body;
    let settings = await prisma.companySetting.findFirst();
    if (!settings) throw new Error('Company settings not found');

    const updated = await prisma.companySetting.update({
      where: { id: settings.id },
      data: { ...data, updatedBy: req.user.id }
    });

    await logAction(req.user.id, 'UPDATE', 'settings', updated.id, 'CompanySetting', settings, updated, req);
    return successResponse(res, updated, 'Company settings updated successfully');
  } catch (error) { next(error); }
};

// Maintenance
exports.fixCustomerBalances = async (req, res, next) => {
  try {
    const customers = await prisma.customer.findMany({ 
      include: { 
        transactions: { 
          orderBy: [{ date: 'asc' }, { createdAt: 'asc' }] 
        } 
      } 
    });
    
    for (const customer of customers) {
      let balance = 0;
      for (const t of customer.transactions) {
        if (t.type === 'SALE') balance += Number(t.amount);
        else if (t.type === 'PAYMENT') balance -= Number(t.amount);
        else if (t.type === 'RETURN') balance -= Number(t.amount);
        else if (t.type === 'ADJUSTMENT') balance += Number(t.amount);

        await prisma.customerTransaction.update({
          where: { id: t.id },
          data: { balanceAfter: balance }
        });
      }
      
      await prisma.customer.update({
        where: { id: customer.id },
        data: { balance }
      });
    }

    return successResponse(res, null, 'Customer balances fixed successfully');
  } catch (error) { next(error); }
};

exports.fixStock = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({ 
      include: { 
        stockTransactions: { 
          orderBy: { createdAt: 'asc' } 
        } 
      } 
    });
    
    for (const p of products) {
      const warehouseQuantities = {};
      
      for (const st of p.stockTransactions) {
        const wid = st.warehouseId;
        if (warehouseQuantities[wid] === undefined) warehouseQuantities[wid] = 0;
        
        warehouseQuantities[wid] += st.quantity;
      }
      
      for (const [wid, q] of Object.entries(warehouseQuantities)) {
        await prisma.productStock.upsert({
          where: { productId_warehouseId: { productId: p.id, warehouseId: wid } },
          update: { quantity: q },
          create: { productId: p.id, warehouseId: wid, quantity: q }
        });
      }
    }
    return successResponse(res, null, 'Stock calculations fixed successfully');
  } catch (error) { next(error); }
};
