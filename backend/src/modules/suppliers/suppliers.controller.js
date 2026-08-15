// backend/src/modules/suppliers/suppliers.controller.js
const { PrismaClient } = require('@prisma/client');
const { successResponse } = require('../../utils/response');
const { logAction } = require('../../utils/audit');
const { paginate } = require('../../utils/paginate');
const { recalculateProductCost } = require('../../utils/pricing');
const prisma = new PrismaClient();
const XLSX = require('xlsx');

// ─── Suppliers ──────────────────────────────────────────────────────────────

exports.listSuppliers = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    if (page && limit) {
      const result = await paginate(prisma.supplier, {
        orderBy: { createdAt: 'desc' }
      }, page, limit);
      return res.status(200).json(result);
    }
    const suppliers = await prisma.supplier.findMany({ orderBy: { createdAt: 'desc' } });
    return successResponse(res, suppliers);
  } catch (error) { next(error); }
};

exports.createSupplier = async (req, res, next) => {
  try {
    const { name, contactInfo } = req.body;
    const existing = await prisma.supplier.findFirst({ where: { name } });
    if (existing) return res.status(400).json({ success: false, message: 'Supplier name already exists' });

    const supplier = await prisma.supplier.create({
      data: { name, contactInfo, createdBy: req.user.id }
    });
    
    await logAction(req.user.id, 'CREATE', 'suppliers', supplier.id, 'Supplier', null, supplier, req);
    return successResponse(res, supplier, 'Supplier created', 201);
  } catch (error) { next(error); }
};

exports.updateSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, contactInfo } = req.body;
    const old = await prisma.supplier.findUnique({ where: { id } });
    if (!old) return res.status(404).json({ success: false, message: 'Supplier not found' });

    const updated = await prisma.supplier.update({
      where: { id },
      data: { name, contactInfo, updatedBy: req.user.id }
    });

    await logAction(req.user.id, 'UPDATE', 'suppliers', updated.id, 'Supplier', old, updated, req);
    return successResponse(res, updated, 'Supplier updated');
  } catch (error) { next(error); }
};

exports.deleteSupplier = async (req, res, next) => {
  try {
    const { id } = req.params;
    const old = await prisma.supplier.findUnique({ 
      where: { id }, 
      include: { purchaseOrders: true } 
    });
    if (!old) return res.status(404).json({ success: false, message: 'Supplier not found' });

    if (old.purchaseOrders && old.purchaseOrders.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete supplier with associated purchase orders' 
      });
    }

    await prisma.supplier.delete({ where: { id } });
    await logAction(req.user.id, 'DELETE', 'suppliers', id, 'Supplier', old, null, req);
    return successResponse(res, null, 'Supplier deleted successfully');
  } catch (error) { next(error); }
};

// ─── Supplier Prices (Pricing Strategy Application) ───────────────────────────

exports.addSupplierPrice = async (req, res, next) => {
  try {
    const { supplierId, productId, supplierPrice } = req.body;
    if (!supplierId || !productId || !supplierPrice) return res.status(400).json({ success: false, message: 'Missing parameters' });

    let updatedProduct;

    await prisma.$transaction(async (tx) => {
      // 1. Add price history (quantity: 0 indicates a manual/static price)
      await tx.supplierProduct.create({
        data: { supplierId, productId, supplierPrice, quantity: 0, createdBy: req.user.id }
      });

      // 2. Recalculate cost
      updatedProduct = await recalculateProductCost(productId, tx);

      await tx.auditLog.create({
        data: {
          userId: req.user.id, action: 'UPDATE', module: 'products',
          entityId: productId, entityType: 'Product', 
          description: `Supplier price added and cost recalculated. New Cost: ${updatedProduct.costPrice}`
        }
      });
    });

    return successResponse(res, updatedProduct, 'Supplier price added and cost recalculated');
  } catch (error) { next(error); }
};

exports.getSupplierPricesByProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const prices = await prisma.supplierProduct.findMany({
      where: { productId },
      include: { supplier: { select: { name: true } }, creator: { select: { name: true } } },
      orderBy: { date: 'desc' }
    });
    return successResponse(res, prices);
  } catch (error) { next(error); }
};

// ─── Purchase Orders ────────────────────────────────────────────────────────

exports.listPurchaseOrders = async (req, res, next) => {
  try {
    const { page, limit, status } = req.query;
    const filters = {};
    if (status) filters.status = status;

    const query = {
      where: filters,
      include: { supplier: { select: { name: true } }, items: true },
      orderBy: { createdAt: 'desc' }
    };

    const result = await paginate(prisma.purchaseOrder, query, page, limit);
    return successResponse(res, result);
  } catch (error) { next(error); }
};

exports.getPurchaseOrderById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: { include: { product: true } }
      }
    });
    if (!po) return res.status(404).json({ success: false, message: 'Purchase Order not found' });
    return successResponse(res, po);
  } catch (error) { next(error); }
};

exports.updatePurchaseOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { supplierId, expectedDate, notes, items, poNumber } = req.body;
    
    // Validate
    const old = await prisma.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
    if (!old) return res.status(404).json({ success: false, message: 'Purchase Order not found' });
    
    if (old.status === 'Received' || old.status === 'Cancelled') {
      return res.status(400).json({ success: false, message: 'Cannot edit Received or Cancelled Purchase Orders' });
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.quantityOrdered * parseFloat(item.unitPrice)), 0);

    const updatedPo = await prisma.$transaction(async (tx) => {
      await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
      
      return await tx.purchaseOrder.update({
        where: { id },
        data: {
          poNumber: poNumber ? poNumber.trim() : old.poNumber, supplierId, expectedDate: expectedDate ? new Date(expectedDate) : null, notes, totalAmount, updatedBy: req.user.id,
          items: {
            create: items.map(i => ({ productId: i.productId, quantityOrdered: i.quantityOrdered, unitPrice: i.unitPrice }))
          }
        },
        include: { items: true }
      });
    });

    await logAction(req.user.id, 'UPDATE', 'orders', updatedPo.id, 'PurchaseOrder', old, updatedPo, req);
    return successResponse(res, updatedPo, 'Purchase Order updated successfully');
  } catch (error) { next(error); }
};

exports.createPurchaseOrder = async (req, res, next) => {
  try {
    const { supplierId, expectedDate, notes, items, poNumber: customPoNumber } = req.body; // items = [{ productId, quantityOrdered, unitPrice }]
    if (!supplierId || !items || !items.length) {
      return res.status(400).json({ success: false, message: 'Supplier and items are required' });
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.quantityOrdered * parseFloat(item.unitPrice)), 0);
    const poNumber = customPoNumber ? customPoNumber.trim() : 'PO-' + Date.now();

    const po = await prisma.purchaseOrder.create({
      data: {
        poNumber, supplierId, expectedDate: expectedDate ? new Date(expectedDate) : null, notes, totalAmount, createdBy: req.user.id,
        items: {
          create: items.map(i => ({ productId: i.productId, quantityOrdered: i.quantityOrdered, unitPrice: i.unitPrice }))
        }
      },
      include: { items: true }
    });

    await logAction(req.user.id, 'CREATE', 'orders', po.id, 'PurchaseOrder', null, po, req);
    return successResponse(res, po, 'Purchase Order created', 201);
  } catch (error) { next(error); }
};

exports.deletePurchaseOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const po = await prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) return res.status(404).json({ success: false, message: 'PO not found' });
    
    if (po.status !== 'Cancelled' && po.status !== 'Returned') {
      return res.status(400).json({ success: false, message: 'Can only delete Cancelled or Returned POs' });
    }

    await prisma.purchaseOrder.delete({ where: { id } });
    await logAction(req.user.id, 'DELETE', 'orders', id, 'PurchaseOrder', po, null, req);
    
    return successResponse(res, null, 'Purchase Order deleted successfully');
  } catch (error) { next(error); }
};

exports.receivePurchaseOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { warehouseId, receiveItems } = req.body; // receiveItems = [{ itemId, quantityReceived }]

    if (!warehouseId || !receiveItems) return res.status(400).json({ success: false, message: 'WarehouseId and receiveItems required' });

    let updatedPo;
    await prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.findUnique({ where: { id }, include: { items: true } });
      if (!po) throw new Error('Purchase Order not found');
      if (po.status === 'Received' || po.status === 'Cancelled') throw new Error(`Cannot receive PO in ${po.status} status`);

      // 1. Early PO status update
      updatedPo = await tx.purchaseOrder.update({
        where: { id },
        data: { status: 'Received', updatedBy: req.user.id }
      });

      // 1.5 Update Supplier Balance & Create Transaction
      const supplier = await tx.supplier.findUnique({ where: { id: po.supplierId } });
      const numericTotal = parseFloat(po.totalAmount);
      const newBalance = parseFloat(supplier.balance) - numericTotal; // Purchase decreases balance

      await tx.supplierTransaction.create({
        data: {
          supplierId: po.supplierId,
          type: 'PURCHASE',
          amount: numericTotal,
          balanceAfter: newBalance,
          referenceId: po.poNumber,
          notes: `Purchase Order ${po.poNumber} received`,
          createdBy: req.user.id
        }
      });

      await tx.supplier.update({
        where: { id: po.supplierId },
        data: { balance: newBalance }
      });

      for (const reqItem of receiveItems) {
        const poItem = po.items.find(i => i.id === reqItem.itemId);
        if (!poItem) continue;

        // Update item received qty
        await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: { quantityReceived: reqItem.quantityReceived }
        });

        if (reqItem.quantityReceived > 0) {
          // Increment Stock
          await tx.productStock.upsert({
            where: { productId_warehouseId: { productId: poItem.productId, warehouseId } },
            update: { quantity: { increment: reqItem.quantityReceived }, updatedBy: req.user.id },
            create: { productId: poItem.productId, warehouseId, quantity: reqItem.quantityReceived, updatedBy: req.user.id }
          });

          // Log transaction
          await tx.stockTransaction.create({
            data: {
              productId: poItem.productId, warehouseId, quantity: reqItem.quantityReceived,
              transactionType: 'Purchase', referenceId: po.poNumber, notes: 'Received against PO', createdBy: req.user.id
            }
          });

          // Record this purchase price in history
          await tx.supplierProduct.create({
            data: {
              supplierId: po.supplierId,
              productId: poItem.productId,
              supplierPrice: poItem.unitPrice,
              quantity: reqItem.quantityReceived,
              createdBy: req.user.id
            }
          });

          // Trigger recalculation (Will now successfully find the PO because we updated its status above)
          await recalculateProductCost(poItem.productId, tx);
        }
      }

      await logAction(req.user.id, 'UPDATE', 'orders', updatedPo.id, 'PurchaseOrder', { status: po.status }, { status: 'Received' }, req);
    });

    return successResponse(res, updatedPo, 'Purchase Order received successfully');
  } catch (error) { 
    if (error.message.includes('not found') || error.message.includes('Cannot')) {
      return res.status(400).json({ success: false, message: error.message });
    }
    next(error); 
  }
};
exports.updatePurchaseOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // status: Draft, Sent, Received, Cancelled, Returned

    const po = await prisma.purchaseOrder.findUnique({
      where: { id },
      include: { items: true }
    });
    if (!po) return res.status(404).json({ success: false, message: 'PO not found' });

    // --- HANDLE RETURN / CANCELLATION (REVERSAL) LOGIC ---
    if ((status === 'Returned' || status === 'Cancelled') && (po.status === 'Received' || po.status === 'Partial')) {
      await prisma.$transaction(async (tx) => {
        // Find all Purchase transactions for this PO
        const txs = await tx.stockTransaction.findMany({
          where: { referenceId: po.poNumber, transactionType: 'Purchase' }
        });

        for (const stockTx of txs) {
          // 1. Reverse stock (Decrement)
          await tx.productStock.upsert({
            where: { productId_warehouseId: { productId: stockTx.productId, warehouseId: stockTx.warehouseId } },
            update: { quantity: { decrement: stockTx.quantity }, updatedBy: req.user.id },
            create: { productId: stockTx.productId, warehouseId: stockTx.warehouseId, quantity: -stockTx.quantity, updatedBy: req.user.id }
          });

          // 2. Add Transaction record
          await tx.stockTransaction.create({
            data: {
              productId: stockTx.productId,
              warehouseId: stockTx.warehouseId,
              quantity: -stockTx.quantity,
              transactionType: 'Return',
              referenceId: po.poNumber,
              notes: status === 'Cancelled' ? 'Stock reversed due to PO Cancellation' : 'Stock reversed due to PO Return',
              createdBy: req.user.id
            }
          });
        }

        // 3. Reverse Supplier Balance
        const supplier = await tx.supplier.findUnique({ where: { id: po.supplierId } });
        const numericTotal = parseFloat(po.totalAmount);
        const newBalance = parseFloat(supplier.balance) + numericTotal; // Reversing a purchase increases balance (debt decreases)

        await tx.supplierTransaction.create({
          data: {
            supplierId: po.supplierId,
            type: 'RETURN',
            amount: numericTotal,
            balanceAfter: newBalance,
            referenceId: po.poNumber,
            notes: status === 'Cancelled' ? `PO ${po.poNumber} cancelled after receipt (Reversed)` : `PO ${po.poNumber} returned/reversed`,
            createdBy: req.user.id
          }
        });

        await tx.supplier.update({
          where: { id: po.supplierId },
          data: { balance: newBalance }
        });

        // 4. Update PO status
        await tx.purchaseOrder.update({
          where: { id },
          data: { status, updatedBy: req.user.id }
        });

        // 5. Recalculate costs for all items
        for (const item of po.items) {
          await recalculateProductCost(item.productId, tx);
        }
      });
    } else {
      // Simple status update for non-received orders
      await prisma.purchaseOrder.update({
        where: { id },
        data: { status, updatedBy: req.user.id }
      });
    }

    await logAction(req.user.id, 'UPDATE', 'orders', id, 'PurchaseOrder', { status: po.status }, { status }, req);
    return successResponse(res, null, `Status updated to ${status}`);
  } catch (error) { next(error); }
};

exports.importPurchaseOrder = async (req, res, next) => {
  try {
    const { supplierId, expectedDate, notes, autoReceive, warehouseId } = req.body;
    if (!req.file) return res.status(400).json({ success: false, message: 'Excel file is required' });
    if (!supplierId || supplierId === 'undefined') return res.status(400).json({ success: false, message: 'Supplier ID is required' });

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (!rows || rows.length === 0) return res.status(400).json({ success: false, message: 'Excel file is empty or invalid' });

    const items = [];
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const identifier = (row.SKU || row.sku || row.Barcode || row.barcode || row['Item Code'] || row['Item'])?.toString().trim();
      const qtyArg = row.Quantity || row.quantity || row.Qty || row.qty || row.Amount || row.AmountOrdered;
      const qty = parseInt(qtyArg) || 0;
      const priceArg = row.UnitPrice || row.unitPrice || row.Price || row.price || row['Unit Price'];
      const price = parseFloat(priceArg) || 0;

      if (!identifier) {
        errors.push(`Row ${i + 2}: Missing SKU or Barcode identifier`);
        continue;
      }

      const product = await prisma.product.findFirst({
        where: {
          OR: [
            { sku: identifier },
            { barcode: identifier }
          ]
        }
      });

      if (!product) {
        errors.push(`Row ${i + 2}: Product "${identifier}" not found in system`);
        continue;
      }

      if (qty <= 0) {
        errors.push(`Row ${i + 2}: Invalid quantity (${qtyArg}) for "${identifier}"`);
        continue;
      }

      items.push({
        productId: product.id,
        productName: product.name,
        quantityOrdered: qty,
        unitPrice: price || parseFloat(product.costPrice) || 0
      });
    }

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: 'Import validation failed', errors });
    }

    const totalAmount = items.reduce((sum, item) => sum + (item.quantityOrdered * item.unitPrice), 0);
    const poNumber = 'PO-' + Date.now();

    const po = await prisma.$transaction(async (tx) => {
      const newPo = await tx.purchaseOrder.create({
        data: {
          poNumber,
          supplierId,
          expectedDate: expectedDate ? new Date(expectedDate) : null,
          notes: notes || `Imported via Excel on ${new Date().toLocaleString()}`,
          totalAmount,
          createdBy: req.user.id,
          items: {
            create: items.map(i => ({
              productId: i.productId,
              quantityOrdered: i.quantityOrdered,
              unitPrice: i.unitPrice
            }))
          }
        },
        include: { items: true }
      });

      if ((autoReceive === 'true' || autoReceive === true) && warehouseId && warehouseId !== 'undefined') {
        // Update PO status to Received FIRST so pricing queries see it
        await tx.purchaseOrder.update({
          where: { id: newPo.id },
          data: { status: 'Received' }
        });

        for (const item of newPo.items) {
          await tx.purchaseOrderItem.update({
            where: { id: item.id },
            data: { quantityReceived: item.quantityOrdered }
          });
          await tx.productStock.upsert({
            where: { productId_warehouseId: { productId: item.productId, warehouseId } },
            update: { quantity: { increment: item.quantityOrdered }, updatedBy: req.user.id },
            create: { productId: item.productId, warehouseId, quantity: item.quantityOrdered, updatedBy: req.user.id }
          });
          await tx.stockTransaction.create({
            data: {
              productId: item.productId,
              warehouseId,
              quantity: item.quantityOrdered,
              transactionType: 'Purchase',
              referenceId: poNumber,
              createdBy: req.user.id
            }
          });
          await tx.supplierProduct.create({
            data: {
              supplierId: newPo.supplierId,
              productId: item.productId,
              supplierPrice: item.unitPrice,
              quantity: item.quantityOrdered,
              createdBy: req.user.id
            }
          });
          await recalculateProductCost(item.productId, tx);
        }
      }
      return newPo;
    });

    await logAction(req.user.id, 'CREATE', 'orders', po.id, 'PurchaseOrder', null, { poNumber: po.poNumber, itemsImported: items.length }, req);
    return successResponse(res, po, `Successfully imported PO with ${items.length} items`, 201);
  } catch (error) { next(error); }
};

// ─── Supplier Account & Ledger ──────────────────────────────────────────────

exports.getSupplierAccount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page, limit } = req.query;

    const supplier = await prisma.supplier.findUnique({ where: { id } });
    if (!supplier) return res.status(404).json({ success: false, message: 'Supplier not found' });

    const query = {
      where: { supplierId: id },
      orderBy: { date: 'desc' },
      include: { creator: { select: { name: true } } }
    };

    if (page && limit) {
      const result = await paginate(prisma.supplierTransaction, query, page, limit);
      return res.status(200).json({ supplier, ...result });
    }

    const transactions = await prisma.supplierTransaction.findMany(query);
    return successResponse(res, { supplier, transactions });
  } catch (error) { next(error); }
};

exports.addSupplierPayment = async (req, res, next) => {
  try {
    const { supplierId, amount, notes, date } = req.body;
    
    if (!supplierId || !amount) {
      return res.status(400).json({ success: false, message: 'Supplier ID and amount are required' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const supplier = await tx.supplier.findUnique({ where: { id: supplierId } });
      if (!supplier) throw new Error('Supplier not found');

      const numericAmount = parseFloat(amount);
      const newBalance = parseFloat(supplier.balance) + numericAmount; // Payment increases balance (reduces debt)

      const transaction = await tx.supplierTransaction.create({
        data: {
          supplierId,
          type: 'PAYMENT',
          amount: numericAmount,
          balanceAfter: newBalance,
          notes,
          date: date ? new Date(date) : new Date(),
          createdBy: req.user.id
        }
      });

      const updatedSupplier = await tx.supplier.update({
        where: { id: supplierId },
        data: { balance: newBalance }
      });

      return { transaction, updatedSupplier };
    });

    await logAction(req.user.id, 'CREATE', 'suppliers', result.transaction.id, 'SupplierTransaction', null, result.transaction, req);
    return successResponse(res, result, 'Payment recorded successfully');
  } catch (error) {
    if (error.message === 'Supplier not found') return res.status(404).json({ success: false, message: error.message });
    next(error);
  }
};
