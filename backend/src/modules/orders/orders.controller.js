// backend/src/modules/orders/orders.controller.js
const { PrismaClient } = require('@prisma/client');
const { successResponse } = require('../../utils/response');
const { logAction } = require('../../utils/audit');
const { paginate } = require('../../utils/paginate');
const prisma = new PrismaClient();

exports.createOrder = async (req, res, next) => {
  try {
    let { 
      customerId, 
      items, 
      status = 'DRAFT', 
      discount = 0, 
      taxAmount = 0,
      currency = 'EGP',
      exchangeRate = 1.0,
      initialPayment = 0,
      paymentMethod = 'CASH',
      notes,
      stockDeducted = false
    } = req.body;

    if (status === 'DRAFT') {
      initialPayment = 0;
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must have at least one item' });
    }

    const orderResult = await prisma.$transaction(async (tx) => {
      // 1. Get Customer to determine pricing
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer) throw new Error('Customer not found');

      // 2. Process Items and Calculate Totals
      let totalAmount = 0;
      const orderItemsData = [];
      
      for (const item of items) {
        if (Number(item.quantity) <= 0) {
          const identifier = item.customName || item.productId || 'unknown item';
          throw new Error(`Quantity for ${identifier} must be greater than 0`);
        }

        let price = 0;
        if (!item.productId) {
          // Custom Item
          if (!item.customName || item.customName.trim() === '') {
            throw new Error('Custom item must have a name');
          }
          price = item.price !== undefined && item.price !== null ? Number(item.price) : 0;
          const itemTotal = price * item.quantity;
          totalAmount += itemTotal;

          orderItemsData.push({
            productId:  null,
            customName: item.customName,
            quantity:   item.quantity,
            unitPrice:  price,
            totalPrice: itemTotal
          });
        } else {
          // Normal Product
          const product = await tx.product.findUnique({ 
            where: { id: item.productId }
          });
          if (!product) throw new Error(`Product ${item.productId} not found`);

          // Use provided price if available (POS/Form), otherwise derive from product
          price = item.price !== undefined && item.price !== null
            ? Number(item.price)
            : (customer.type === 'WHOLESALE' ? Number(product.wholesalePrice) : Number(product.mainPrice));

          if (price < Number(product.costPrice)) {
            throw new Error(`Price for product ${product.name} cannot be below its cost price (${product.costPrice})`);
          }

          const itemTotal = price * item.quantity;
          totalAmount += itemTotal;

          orderItemsData.push({
            productId:  item.productId,
            customName: null,
            quantity:   item.quantity,
            unitPrice:  price,
            totalPrice: itemTotal
          });
        }
      }

      const netAmount  = Math.max(0, Number(totalAmount) - Number(discount) + Number(taxAmount));
      const balanceDue = Math.max(0, netAmount - Number(initialPayment));
      
      // Multi-currency calculation
      const totalAmountBase = Number(netAmount) * Number(exchangeRate);
      const paidAmountBase = Number(initialPayment) * Number(exchangeRate);

      // 3. Generate Order Number (Simple logic: ORD-timestamp)
      const orderNumber = `ORD-${Date.now()}`;

      const isStockDeductionRequired = status === 'CONFIRMED' || status === 'COMPLETED' || (status === 'DRAFT' && stockDeducted === true);

      // 4. Create Order
      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId,
          userId: req.user.id,
          totalAmount,
          discount,
          taxAmount,
          netAmount,
          paidAmount: initialPayment,
          balanceDue,
          currency,
          exchangeRate,
          totalAmountBase,
          paidAmountBase,
          status,
          stockDeducted: isStockDeductionRequired,
          paymentStatus: paymentMethod === 'ON_ACCOUNT' ? 'ON_ACCOUNT' : (Number(initialPayment) >= netAmount ? 'PAID' : (Number(initialPayment) > 0 ? 'PARTIAL' : 'UNPAID')),
          notes,
          items: {
            create: orderItemsData
          }
        },
        include: { items: { include: { product: true } }, customer: true }
      });

      // 5. Handle stock deduction
      if (isStockDeductionRequired) {
        for (const item of orderItemsData) {
          // Skip stock deduction for custom items
          if (!item.productId) continue;

          // Standardize on a main warehouse for now or let POS choose. 
          // For now, iterate over first available warehouse if not specified
          const warehouse = await tx.warehouse.findFirst();
          if (!warehouse) throw new Error('No warehouse found to deduct stock');

          await tx.productStock.upsert({
            where: { productId_warehouseId: { productId: item.productId, warehouseId: warehouse.id } },
            update: { quantity: { decrement: item.quantity }, updatedBy: req.user.id },
            create: { productId: item.productId, warehouseId: warehouse.id, quantity: -item.quantity, updatedBy: req.user.id }
          });

          await tx.stockTransaction.create({
            data: {
              productId: item.productId,
              warehouseId: warehouse.id,
              quantity: -item.quantity,
              transactionType: 'Sale',
              referenceId: order.id,
              notes: `Order ${order.orderNumber}`,
              createdBy: req.user.id
            }
          });
        }
      }

      // 6. Handle Debt & Payments (ONLY for CONFIRMED or COMPLETED orders)
      if (status === 'CONFIRMED' || status === 'COMPLETED') {
        if (netAmount > 0) {
          await tx.customer.update({
            where: { id: customerId },
            data: { balance: { increment: netAmount } }
          });
          
          await tx.customerTransaction.create({
            data: {
              customerId,
              type: 'SALE',
              date: new Date(Date.now() - 1000), // Ensure SALE comes before PAYMENT

              amount: netAmount,
              balanceAfter: Number(customer.balance) + netAmount,
              referenceId: order.id,
              orderId: order.id,
              notes: `Order ${order.orderNumber} - Total Value`,
              createdBy: req.user.id
            }
          });
        }

        if (initialPayment > 0) {
          // Check for open daybox if payment is cash
          let sessionId = null;
          if (paymentMethod === 'CASH') {
             const session = await tx.cashSession.findFirst({
               where: { userId: req.user.id || '', status: 'OPEN' }
             });
             if (!session) throw new Error('You must open the daybox before accepting cash payments');
             sessionId = session.id;

             // Update session totals
             await tx.cashSession.update({
               where: { id: sessionId },
               data: { 
                 totalSalesCash: { increment: initialPayment },
                 expectedBalance: { increment: initialPayment }
               }
             });
          }

          await tx.customer.update({
            where: { id: customerId },
            data: { balance: { decrement: initialPayment } }
          });

          await tx.customerTransaction.create({
            data: {
              customerId,
              type: 'PAYMENT',
              date: new Date(),

              amount: initialPayment,
              balanceAfter: Number(customer.balance) + netAmount - initialPayment,
              referenceId: order.id,
              orderId: order.id,
              sessionId,
              notes: `Order ${order.orderNumber} - Initial Payment`,
              createdBy: req.user.id
            }
          });
        }
      }

      return order;
    });

    await logAction(req.user.id, 'CREATE', 'orders', orderResult.id, 'Order', null, orderResult, req);
    return successResponse(res, orderResult, 'Order created successfully', 201);
  } catch (error) {
    next(error);
  }
};

exports.listOrders = async (req, res, next) => {
  try {
    const { page, limit, status, customerId, search } = req.query;
    const filters = {};
    if (status) filters.status = status;
    if (customerId) filters.customerId = customerId;
    if (search) {
      filters.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        {
          items: {
            some: {
              product: {
                OR: [
                  { name: { contains: search, mode: 'insensitive' } },
                  { sku: { contains: search, mode: 'insensitive' } }
                ]
              }
            }
          }
        }
      ];
    }

    const query = {
      where: filters,
      include: {
        customer: { select: { name: true, phone: true } },
        creator: { select: { name: true } },
        items: {
          include: {
            product: { select: { costPrice: true } }
          }
        },
        _count: { select: { items: true } }
      },
      orderBy: { createdAt: 'desc' }
    };

    const result = await paginate(prisma.order, query, page, limit);
    return successResponse(res, result);
  } catch (error) { next(error); }
};

exports.getOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        customer: true,
        creator: true,
        payments: true
      }
    });

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    return successResponse(res, order);
  } catch (error) { next(error); }
};

exports.updateOrderStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const order = await prisma.order.findUnique({ 
      where: { id },
      include: { items: true }
    });
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    // logic for changing status (especially DRAFT -> CONFIRMED)
    if (order.status === 'DRAFT' && (status === 'CONFIRMED' || status === 'COMPLETED')) {
      const updatedOrder = await prisma.$transaction(async (tx) => {
        // Deduct stock, log transactions, etc. only if stock was not already deducted!
        if (!order.stockDeducted) {
          for (const item of order.items) {
            // Skip stock deduction for custom items
            if (!item.productId) continue;

            const warehouse = await tx.warehouse.findFirst();
            if (!warehouse) throw new Error('No warehouse found to deduct stock');

            await tx.productStock.upsert({
              where: { productId_warehouseId: { productId: item.productId, warehouseId: warehouse.id } },
              update: { quantity: { decrement: item.quantity }, updatedBy: req.user.id },
              create: { productId: item.productId, warehouseId: warehouse.id, quantity: -item.quantity, updatedBy: req.user.id }
            });

            await tx.stockTransaction.create({
              data: {
                productId: item.productId,
                warehouseId: warehouse.id,
                quantity: -item.quantity,
                transactionType: 'Sale',
                referenceId: order.id,
                notes: `Order confirmed: ${order.orderNumber}`,
                createdBy: req.user.id
              }
            });
          }
        }

        // Logic for customer balance updates if not already handled
        if (Number(order.netAmount) > 0) {
          const customer = await tx.customer.findUnique({ where: { id: order.customerId } });
          await tx.customer.update({
            where: { id: order.customerId },
            data: { balance: { increment: order.netAmount } }
          });
          
          await tx.customerTransaction.create({
            data: {
              customerId: order.customerId,
              type: 'SALE',
              date: new Date(Date.now() - 1000),

              amount: order.netAmount,
              balanceAfter: Number(customer.balance) + Number(order.netAmount),
              referenceId: order.id,
              orderId: order.id,
              notes: `Order confirmed: ${order.orderNumber} - Total Value`,
              createdBy: req.user.id
            }
          });
        }

        if (Number(order.paidAmount) > 0) {
          const customerAfterSale = await tx.customer.findUnique({ where: { id: order.customerId } });
          await tx.customer.update({
            where: { id: order.customerId },
            data: { balance: { decrement: order.paidAmount } }
          });

          await tx.customerTransaction.create({
            data: {
              customerId: order.customerId,
              type: 'PAYMENT',
              date: new Date(),

              amount: order.paidAmount,
              balanceAfter: Number(customerAfterSale.balance) - Number(order.paidAmount),
              referenceId: order.id,
              orderId: order.id,
              notes: `Order confirmed: ${order.orderNumber} - Initial Payment`,
              createdBy: req.user.id
            }
          });
        }
        
        return await tx.order.update({
          where: { id },
          data: { status, stockDeducted: true, updatedAt: new Date() }
        });
      });
      
      return successResponse(res, updatedOrder, 'Order status updated and stock adjusted');
    }

    const updated = await prisma.order.update({
      where: { id },
      data: { status, updatedAt: new Date() }
    });

    return successResponse(res, updated, 'Order status updated');
  } catch (error) { next(error); }
};

exports.updateOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { 
      customerId, items, discount = 0, taxAmount = 0,
      currency = 'USD', exchangeRate = 1.0, notes, paymentMethod,
      status, stockDeducted
    } = req.body;

    const existingOrder = await prisma.order.findUnique({ 
      where: { id },
      include: { items: true, customer: true }
    });
    if (!existingOrder) return res.status(404).json({ success: false, message: 'Order not found' });
    if (existingOrder.status === 'CANCELLED') return res.status(400).json({ success: false, message: 'Cannot edit cancelled orders' });

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must have at least one item' });
    }

    const newStatus = status || existingOrder.status;

    const orderResult = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.findUnique({ where: { id: customerId } });
      if (!customer) throw new Error('Customer not found');

      const warehouse = await tx.warehouse.findFirst();
      if (!warehouse) throw new Error('No warehouse found for stock adjustments');

      // 1. CALCULATE NEW TOTALS & VALIDATE ITEMS FIRST
      let totalAmount = 0;
      const orderItemsData = [];
      
      for (const item of items) {
        if (Number(item.quantity) <= 0) {
          const identifier = item.customName || item.productId || 'unknown item';
          throw new Error(`Quantity for ${identifier} must be greater than 0`);
        }

        let price = 0;
        if (!item.productId) {
          // Custom Item
          if (!item.customName || item.customName.trim() === '') {
            throw new Error('Custom item must have a name');
          }
          price = item.price !== undefined && item.price !== null ? Number(item.price) : 0;
          const itemTotal = price * item.quantity;
          totalAmount += itemTotal;

          orderItemsData.push({
            productId:  null,
            customName: item.customName,
            quantity:   item.quantity,
            unitPrice:  price,
            totalPrice: itemTotal
          });
        } else {
          // Normal Product
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product) throw new Error(`Product ${item.productId} not found`);

          price = item.price !== undefined && item.price !== null 
            ? Number(item.price) 
            : (customer.type === 'WHOLESALE' ? Number(product.wholesalePrice) : Number(product.mainPrice));

          if (price < Number(product.costPrice)) {
            throw new Error(`Price for product ${product.name} cannot be below its cost price (${product.costPrice})`);
          }

          const itemTotal = price * item.quantity;
          totalAmount += itemTotal;

          orderItemsData.push({
            productId:  item.productId,
            customName: null,
            quantity:   item.quantity,
            unitPrice:  price,
            totalPrice: itemTotal
          });
        }
      }

      const netAmount  = Math.max(0, Number(totalAmount) - Number(discount) + Number(taxAmount));
      const oldPaid = Number(existingOrder.paidAmount);
      let newPaid = oldPaid;
      if (newStatus === 'DRAFT') {
        newPaid = 0;
      }
      const balanceDue = Math.max(0, netAmount - newPaid);
      
      const totalAmountBase = Number(netAmount) * Number(exchangeRate);
      const paidAmountBase = newPaid * Number(exchangeRate);

      const newStockDeducted = newStatus === 'CONFIRMED' || newStatus === 'COMPLETED' || 
                               (newStatus === 'DRAFT' && (stockDeducted === true || (stockDeducted === undefined && existingOrder.stockDeducted)));

      // 2. APPLY DIFFERENCE-BASED STOCK ADJUSTMENTS
      const oldStockDeducted = existingOrder.stockDeducted;

      if (!oldStockDeducted && newStockDeducted) {
        // Case A: Stock was not previously deducted but is now required -> Deduct full quantity of all new items
        for (const newItem of orderItemsData) {
          if (!newItem.productId) continue;
          await tx.productStock.upsert({
            where: { productId_warehouseId: { productId: newItem.productId, warehouseId: warehouse.id } },
            update: { quantity: { decrement: newItem.quantity }, updatedBy: req.user.id },
            create: { productId: newItem.productId, warehouseId: warehouse.id, quantity: -newItem.quantity, updatedBy: req.user.id }
          });

          await tx.stockTransaction.create({
            data: {
              productId: newItem.productId,
              warehouseId: warehouse.id,
              quantity: -newItem.quantity,
              transactionType: 'Sale',
              referenceId: id,
              notes: `Stock deduction for order update: ${existingOrder.orderNumber}`,
              createdBy: req.user.id
            }
          });
        }
      } else if (oldStockDeducted && !newStockDeducted) {
        // Case B: Stock was previously deducted but is no longer required -> Revert full quantity of all old items
        for (const oldItem of existingOrder.items) {
          if (!oldItem.productId) continue;
          await tx.productStock.upsert({
            where: { productId_warehouseId: { productId: oldItem.productId, warehouseId: warehouse.id } },
            update: { quantity: { increment: oldItem.quantity }, updatedBy: req.user.id },
            create: { productId: oldItem.productId, warehouseId: warehouse.id, quantity: oldItem.quantity, updatedBy: req.user.id }
          });

          await tx.stockTransaction.create({
            data: {
              productId: oldItem.productId,
              warehouseId: warehouse.id,
              quantity: oldItem.quantity,
              transactionType: 'Adjustment',
              referenceId: id,
              notes: `Stock reversion for order update: ${existingOrder.orderNumber}`,
              createdBy: req.user.id
            }
          });
        }
      } else if (oldStockDeducted && newStockDeducted) {
        // Case C: Stock was previously deducted and remains deducted -> Deduct or revert only the delta differences
        const quantityDelta = {};
        for (const oldItem of existingOrder.items) {
          if (!oldItem.productId) continue;
          quantityDelta[oldItem.productId] = (quantityDelta[oldItem.productId] || 0) + oldItem.quantity;
        }
        for (const newItem of orderItemsData) {
          if (!newItem.productId) continue;
          quantityDelta[newItem.productId] = (quantityDelta[newItem.productId] || 0) - newItem.quantity;
        }

        for (const [prodId, delta] of Object.entries(quantityDelta)) {
          if (delta > 0) {
            // Delta is positive -> Quantity decreased -> Revert delta back to stock
            await tx.productStock.upsert({
              where: { productId_warehouseId: { productId: prodId, warehouseId: warehouse.id } },
              update: { quantity: { increment: delta }, updatedBy: req.user.id },
              create: { productId: prodId, warehouseId: warehouse.id, quantity: delta, updatedBy: req.user.id }
            });

            await tx.stockTransaction.create({
              data: {
                productId: prodId,
                warehouseId: warehouse.id,
                quantity: delta,
                transactionType: 'Adjustment',
                referenceId: id,
                notes: `Stock adjustment (quantity decreased) for order update: ${existingOrder.orderNumber}`,
                createdBy: req.user.id
              }
            });
          } else if (delta < 0) {
            // Delta is negative -> Quantity increased -> Deduct absolute delta from stock
            const absDelta = Math.abs(delta);
            await tx.productStock.upsert({
              where: { productId_warehouseId: { productId: prodId, warehouseId: warehouse.id } },
              update: { quantity: { decrement: absDelta }, updatedBy: req.user.id },
              create: { productId: prodId, warehouseId: warehouse.id, quantity: -absDelta, updatedBy: req.user.id }
            });

            await tx.stockTransaction.create({
              data: {
                productId: prodId,
                warehouseId: warehouse.id,
                quantity: delta, // negative value representing sale deduction
                transactionType: 'Sale',
                referenceId: id,
                notes: `Stock deduction (quantity increased) for order update: ${existingOrder.orderNumber}`,
                createdBy: req.user.id
              }
            });
          }
        }
      }

      // 3. APPLY DIFFERENCE-BASED CUSTOMER BALANCE ADJUSTMENTS
      const wasConfirmed = existingOrder.status === 'CONFIRMED' || existingOrder.status === 'COMPLETED';
      const isConfirmed = newStatus === 'CONFIRMED' || newStatus === 'COMPLETED';

      if (!wasConfirmed && isConfirmed) {
        // Case A: Transitioning from Draft -> Confirmed -> Apply full order value and register payments
        if (netAmount > 0) {
          const cust = await tx.customer.findUnique({ where: { id: customerId } });
          await tx.customer.update({
            where: { id: customerId },
            data: { balance: { increment: netAmount } }
          });

          await tx.customerTransaction.create({
            data: {
              customerId,
              type: 'SALE',
              date: new Date(Date.now() - 1000), // Ensure SALE comes before PAYMENT

              amount: netAmount,
              balanceAfter: Number(cust.balance) + netAmount,
              referenceId: id,
              orderId: id,
              notes: `Order confirmed: ${existingOrder.orderNumber} - Total Value`,
              createdBy: req.user.id
            }
          });
        }

        if (oldPaid > 0) {
          const cust = await tx.customer.findUnique({ where: { id: customerId } });
          await tx.customer.update({
            where: { id: customerId },
            data: { balance: { decrement: oldPaid } }
          });

          await tx.customerTransaction.create({
            data: {
              customerId,
              type: 'PAYMENT',
              date: new Date(),

              amount: oldPaid,
              balanceAfter: Number(cust.balance) - oldPaid,
              referenceId: id,
              orderId: id,
              notes: `Order confirmed: ${existingOrder.orderNumber} - Applied Payments`,
              createdBy: req.user.id
            }
          });
        }
      } else if (wasConfirmed && !isConfirmed) {
        // Case B: Transitioning from Confirmed -> Draft -> Revert full order value and applied payments
        const oldNetAmount = Number(existingOrder.netAmount);
        if (oldNetAmount > 0) {
          const cust = await tx.customer.findUnique({ where: { id: existingOrder.customerId } });
          await tx.customer.update({
            where: { id: existingOrder.customerId },
            data: { balance: { decrement: oldNetAmount } }
          });

          await tx.customerTransaction.create({
            data: {
              customerId: existingOrder.customerId,
              type: 'ADJUSTMENT',
              amount: -oldNetAmount,
              balanceAfter: Number(cust.balance) - oldNetAmount,
              referenceId: id,
              orderId: id,
              notes: `Order reverted to Draft: ${existingOrder.orderNumber} - Total Value Reversion`,
              createdBy: req.user.id
            }
          });
        }

        if (oldPaid > 0) {
          const cust = await tx.customer.findUnique({ where: { id: existingOrder.customerId } });
          await tx.customer.update({
            where: { id: existingOrder.customerId },
            data: { balance: { increment: oldPaid } }
          });

          await tx.customerTransaction.create({
            data: {
              customerId: existingOrder.customerId,
              type: 'ADJUSTMENT',
              amount: oldPaid,
              balanceAfter: Number(cust.balance) + oldPaid,
              referenceId: id,
              orderId: id,
              notes: `Order reverted to Draft: ${existingOrder.orderNumber} - Applied Payments Reversion`,
              createdBy: req.user.id
            }
          });
        }
      } else if (wasConfirmed && isConfirmed) {
        // Case C: Order is already Confirmed and stays Confirmed -> Apply delta difference on netAmount
        const delta = netAmount - Number(existingOrder.netAmount);
        if (delta > 0) {
          const cust = await tx.customer.findUnique({ where: { id: customerId } });
          await tx.customer.update({
            where: { id: customerId },
            data: { balance: { increment: delta } }
          });

          await tx.customerTransaction.create({
            data: {
              customerId,
              type: 'SALE',
              date: new Date(Date.now() - 1000), // Ensure SALE comes before PAYMENT

              amount: delta,
              balanceAfter: Number(cust.balance) + delta,
              referenceId: id,
              orderId: id,
              notes: `Order updated (value increased): ${existingOrder.orderNumber} - Net Delta`,
              createdBy: req.user.id
            }
          });
        } else if (delta < 0) {
          const absDelta = Math.abs(delta);
          const cust = await tx.customer.findUnique({ where: { id: customerId } });
          await tx.customer.update({
            where: { id: customerId },
            data: { balance: { decrement: absDelta } }
          });

          await tx.customerTransaction.create({
            data: {
              customerId,
              type: 'ADJUSTMENT',
              amount: delta, // negative value representing deduction from balance
              balanceAfter: Number(cust.balance) - absDelta,
              referenceId: id,
              orderId: id,
              notes: `Order updated (value decreased): ${existingOrder.orderNumber} - Net Delta`,
              createdBy: req.user.id
            }
          });
        }
      }

      // 4. UPDATE ORDER RECORD
      await tx.orderItem.deleteMany({ where: { orderId: id } });

      const updated = await tx.order.update({
        where: { id },
        data: {
          customerId,
          totalAmount, discount, taxAmount, netAmount,
          balanceDue, paidAmount: newPaid,
          currency, exchangeRate, totalAmountBase, paidAmountBase,
          notes,
          status: newStatus,
          stockDeducted: newStockDeducted,
          paymentMethod: paymentMethod || existingOrder.paymentMethod,
          paymentStatus: balanceDue <= 0 ? 'PAID' : (newPaid > 0 ? 'PARTIAL' : (paymentMethod === 'ON_ACCOUNT' || existingOrder.paymentMethod === 'ON_ACCOUNT' ? 'ON_ACCOUNT' : 'UNPAID')),
          items: { create: orderItemsData }
        },
        include: { items: { include: { product: true } }, customer: true }
      });
      return updated;
    });

    await logAction(req.user.id, 'UPDATE', 'orders', orderResult.id, 'Order', existingOrder, orderResult, req);
    return successResponse(res, orderResult, 'Order updated successfully');
  } catch (error) { next(error); }
};

exports.addOrderPayment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod = 'CASH', notes } = req.body;
    
    if (amount <= 0) return res.status(400).json({ success: false, message: 'Amount must be greater than 0' });

    const existingOrder = await prisma.order.findUnique({ where: { id }, include: { customer: true } });
    if (!existingOrder) return res.status(404).json({ success: false, message: 'Order not found' });
    if (existingOrder.status === 'DRAFT' || existingOrder.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: `Cannot add payment to ${existingOrder.status} order` });
    }
    
    const paymentResult = await prisma.$transaction(async (tx) => {
      let sessionId = null;
      if (paymentMethod === 'CASH') {
          const session = await tx.cashSession.findFirst({
            where: { userId: req.user.id || '', status: 'OPEN' }
          });
          if (!session) throw new Error('You must open the daybox before accepting cash payments');
          sessionId = session.id;

         await tx.cashSession.update({
           where: { id: sessionId },
           data: { 
             totalSalesCash: { increment: amount },
             expectedBalance: { increment: amount }
           }
         });
      } else if (paymentMethod === 'CARD') {
          const session = await tx.cashSession.findFirst({
            where: { userId: req.user.id || '', status: 'OPEN' }
          });
         if (session) {
           sessionId = session.id;
           await tx.cashSession.update({
             where: { id: sessionId },
             data: { totalSalesCard: { increment: amount } }
           });
         }
      }

      const balanceRemaining = Number(existingOrder.balanceDue) - Number(amount);
      const newPaidAmount = Number(existingOrder.paidAmount) + Number(amount);
      
      const newPaymentStatus = balanceRemaining <= 0 ? 'PAID' : 'PARTIAL';

      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          paidAmount: newPaidAmount,
          balanceDue: balanceRemaining,
          paymentStatus: newPaymentStatus,
          updatedAt: new Date()
        }
      });

      await tx.customer.update({
        where: { id: existingOrder.customerId },
        data: { balance: { decrement: amount } }
      });
      
      const cust = await tx.customer.findUnique({ where: { id: existingOrder.customerId } });
      
      const txLog = await tx.customerTransaction.create({
        data: {
          customerId: existingOrder.customerId,
          type: 'PAYMENT',
          amount: amount,
          balanceAfter: cust.balance,
          referenceId: existingOrder.id,
          orderId: existingOrder.id,
          sessionId,
          notes: notes || `Payment for order ${existingOrder.orderNumber}`,
          createdBy: req.user.id
        }
      });

      return { order: updatedOrder, transaction: txLog };
    });

    await logAction(req.user.id, 'CREATE', 'orders', paymentResult.transaction.id, 'CustomerTransaction', null, paymentResult.transaction, req);
    return successResponse(res, paymentResult.order, 'Payment added successfully');
  } catch (error) { next(error); }
};

exports.deleteOrder = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true, customer: true }
    });

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    await prisma.$transaction(async (tx) => {
      // 1. Revert Inventory (if stock was deducted)
      if (order.stockDeducted) {
        // Use first warehouse for now (system default)
        const warehouse = await tx.warehouse.findFirst();
        if (warehouse) {
          for (const item of order.items) {
            // Skip stock reversion for custom items
            if (!item.productId) continue;

            await tx.productStock.upsert({
              where: { productId_warehouseId: { productId: item.productId, warehouseId: warehouse.id } },
              update: { quantity: { increment: item.quantity }, updatedBy: req.user.id },
              create: { productId: item.productId, warehouseId: warehouse.id, quantity: item.quantity, updatedBy: req.user.id }
            });
          }
        }
        // Delete stock transactions related to this order
        await tx.stockTransaction.deleteMany({
          where: { 
            OR: [
              { referenceId: id },
              { notes: { contains: order.orderNumber } }
            ]
          }
        });
      }

      // 2. Revert Customer Balance & Daybox Sessions
      const transactions = await tx.customerTransaction.findMany({ where: { orderId: id } });
      let balanceAdjustment = 0;

      for (const t of transactions) {
        if (t.type === 'SALE') {
          // A SALE transaction increased the customer's debt (balance)
          // To revert, we subtract the amount
          balanceAdjustment -= Number(t.amount);
        } else if (t.type === 'PAYMENT') {
          // A PAYMENT transaction decreased the customer's debt (balance)
          // To revert, we add back the amount
          balanceAdjustment += Number(t.amount);
          
          // Revert Daybox impact if it was a cash/card payment in a session
          if (t.sessionId) {
            const session = await tx.cashSession.findUnique({ where: { id: t.sessionId } });
            if (session && session.status === 'OPEN') {
               // We only revert if session is still open, otherwise it's closed and balanced
               await tx.cashSession.update({
                 where: { id: t.sessionId },
                 data: {
                   totalSalesCash: { decrement: t.amount },
                   expectedBalance: { decrement: t.amount }
                 }
               });
            }
          }
        } else if (t.type === 'ADJUSTMENT') {
          // An ADJUSTMENT transaction modified the balance
          // To revert, we subtract the amount (if amount is negative, subtracting it adds to the balance)
          balanceAdjustment -= Number(t.amount);
        }
      }

      // Update customer balance
      if (balanceAdjustment !== 0) {
        await tx.customer.update({
          where: { id: order.customerId },
          data: { balance: { increment: balanceAdjustment } }
        });
      }

      // 3. Delete related records
      await tx.customerTransaction.deleteMany({ where: { orderId: id } });
      await tx.orderItem.deleteMany({ where: { orderId: id } });
      await tx.order.delete({ where: { id } });
    });

    await logAction(req.user.id, 'DELETE', 'orders', id, 'Order', order, null, req);
    return successResponse(res, null, 'Order deleted and balance/stock reverted successfully');
  } catch (error) { 
    next(error); 
  }
};

exports.exportOrderExcel = async (req, res, next) => {
  try {
    const { id } = req.params;
    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: true } },
        customer: true,
        creator: true,
        payments: true
      }
    });

    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const xlsx = require('xlsx');

    const companySettings = await prisma.companySetting.findFirst();
    const companyName = companySettings?.companyName || 'Aman ERP';

    // Order Summary Data (Formatted as a receipt)
    const receiptAoA = [
      [companyName, '', '', ''],
      [companySettings?.address || '', '', '', ''],
      [companySettings?.phoneNumber || '', '', '', ''],
      ['', '', '', ''],
      ['SALES RECEIPT', '', '', ''],
      [`#${order.orderNumber}`, '', '', ''],
      ['', '', '', ''],
      ['Date:', new Date(order.createdAt).toLocaleString(), '', ''],
      ['Customer:', order.customer?.name || '-', '', ''],
      ['Status:', order.status, '', ''],
      ['Payment:', order.paymentStatus, '', ''],
      ['----------------------------------------', '', '', ''],
      ['Product', 'Qty', 'Unit Price', 'Total']
    ];

    order.items.forEach(item => {
      receiptAoA.push([
        item.customName || item.product?.name || 'Unknown',
        item.quantity,
        Number(item.unitPrice),
        Number(item.totalPrice)
      ]);
    });

    receiptAoA.push(['----------------------------------------', '', '', '']);
    receiptAoA.push(['', '', 'Subtotal:', Number(order.totalAmount)]);
    
    if (Number(order.discount) > 0) {
      receiptAoA.push(['', '', 'Discount:', -Number(order.discount)]);
    }
    if (Number(order.taxAmount) > 0) {
      receiptAoA.push(['', '', 'Tax:', Number(order.taxAmount)]);
    }
    
    receiptAoA.push(['', '', 'NET TOTAL:', Number(order.netAmount)]);
    receiptAoA.push(['', '', 'Paid:', Number(order.paidAmount)]);
    receiptAoA.push(['', '', 'Balance Due:', Number(order.balanceDue)]);
    receiptAoA.push(['', '', '', '']);
    receiptAoA.push([companySettings?.posFooterMessage || 'Thank you for your business!', '', '', '']);

    // Order Items Data
    const orderItems = order.items.map(item => ({
      'Product Name': item.customName || item.product?.name || 'Unknown',
      'SKU': item.product?.sku || '-',
      'Quantity': item.quantity,
      'Unit Price': Number(item.unitPrice),
      'Total Price': Number(item.totalPrice)
    }));

    // Payments Data
    const orderPayments = order.payments.map(payment => ({
      'Date': payment.date.toISOString(),
      'Type': payment.type,
      'Amount': Number(payment.amount),
      'Notes': payment.notes || ''
    }));

    const wb = xlsx.utils.book_new();
    
    const wsSummary = xlsx.utils.aoa_to_sheet(receiptAoA);
    
    // Add Merges for styling
    wsSummary['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }, // Company Name
      { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } }, // Address
      { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } }, // Phone
      { s: { r: 4, c: 0 }, e: { r: 4, c: 3 } }, // SALES RECEIPT
      { s: { r: 5, c: 0 }, e: { r: 5, c: 3 } }, // Order Number
      { s: { r: 7, c: 1 }, e: { r: 7, c: 3 } }, // Date
      { s: { r: 8, c: 1 }, e: { r: 8, c: 3 } }, // Customer
      { s: { r: 11, c: 0 }, e: { r: 11, c: 3 } }, // Separator 1
    ];
    
    const sep2Row = 13 + order.items.length;
    wsSummary['!merges'].push({ s: { r: sep2Row, c: 0 }, e: { r: sep2Row, c: 3 } });
    
    const footerRow = receiptAoA.length - 1;
    wsSummary['!merges'].push({ s: { r: footerRow, c: 0 }, e: { r: footerRow, c: 3 } });

    // Set Column Widths
    wsSummary['!cols'] = [
      { wch: 30 }, // Product
      { wch: 8 },  // Qty
      { wch: 15 }, // Unit Price
      { wch: 15 }, // Total
    ];

    xlsx.utils.book_append_sheet(wb, wsSummary, 'Receipt');

    if (orderItems.length > 0) {
      const wsItems = xlsx.utils.json_to_sheet(orderItems);
      xlsx.utils.book_append_sheet(wb, wsItems, 'Order Items');
    }

    if (orderPayments.length > 0) {
      const wsPayments = xlsx.utils.json_to_sheet(orderPayments);
      xlsx.utils.book_append_sheet(wb, wsPayments, 'Payments');
    }

    const excelBuffer = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', `attachment; filename=Order_${order.orderNumber}.xlsx`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(excelBuffer);
  } catch (error) {
    next(error);
  }
};
