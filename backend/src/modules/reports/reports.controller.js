// backend/src/modules/reports/reports.controller.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse } = require('../../utils/response');

const toNum = (v) => v ? Number(v) : 0;

exports.getSalesReports = async (req, res, next) => {
  try {
    const totalOrders = await prisma.order.count();

    const [paidAmountAgg, netAmountAgg, discountAgg, balanceDueAgg] = await Promise.all([
      prisma.order.aggregate({ _sum: { paidAmount: true } }),
      prisma.order.aggregate({ _sum: { netAmount: true } }),
      prisma.order.aggregate({ _sum: { discount: true } }),
      prisma.order.aggregate({ _sum: { balanceDue: true } })
    ]);

    const recentOrders = await prisma.order.findMany({
      take: 15,
      orderBy: { createdAt: 'desc' },
      include: { customer: { select: { name: true } } }
    });

    return successResponse(res, {
      summary: {
        paidAmount:  toNum(paidAmountAgg._sum.paidAmount),
        netAmount:   toNum(netAmountAgg._sum.netAmount),
        discount:    toNum(discountAgg._sum.discount),
        balanceDue:  toNum(balanceDueAgg._sum.balanceDue)
      },
      totalOrders,
      recentOrders: recentOrders.map(o => ({
        ...o,
        netAmount:   toNum(o.netAmount),
        discount:    toNum(o.discount),
        paidAmount:  toNum(o.paidAmount),
        balanceDue:  toNum(o.balanceDue),
        totalAmount: toNum(o.totalAmount),
      }))
    });
  } catch (err) { next(err); }
};

exports.getPurchasesReports = async (req, res, next) => {
  try {
    const totalPOs = await prisma.purchaseOrder.count();
    const sumAgg = await prisma.purchaseOrder.aggregate({
      _sum: { totalAmount: true }
    });

    const recentPOs = await prisma.purchaseOrder.findMany({
      take: 15,
      orderBy: { createdAt: 'desc' },
      include: { supplier: { select: { name: true } } }
    });

    return successResponse(res, {
      summary: { totalAmount: toNum(sumAgg._sum.totalAmount) },
      totalPOs,
      recentPOs: recentPOs.map(po => ({ ...po, totalAmount: toNum(po.totalAmount) }))
    });
  } catch (err) { next(err); }
};

exports.getInventoryReports = async (req, res, next) => {
  try {
    const productsCount = await prisma.product.count();
    const stockAgg = await prisma.productStock.aggregate({ _sum: { quantity: true } });

    const inventoryDist = await prisma.productStock.findMany({
      take: 20,
      orderBy: { quantity: 'desc' },
      include: {
        product:   { select: { name: true, sku: true, mainPrice: true } },
        warehouse: { select: { name: true } }
      }
    });

    return successResponse(res, {
      totalProducts:    productsCount,
      totalStockUnits:  toNum(stockAgg._sum.quantity),
      inventoryDist: inventoryDist.map(inv => ({
        ...inv,
        product: { ...inv.product, mainPrice: toNum(inv.product.mainPrice) }
      }))
    });
  } catch (err) { next(err); }
};

exports.getCustomerReports = async (req, res, next) => {
  try {
    const customersCount = await prisma.customer.count();
    const balanceAgg = await prisma.customer.aggregate({ _sum: { balance: true } });

    const topDebtors = await prisma.customer.findMany({
      where: { balance: { gt: 0 } },
      orderBy: { balance: 'desc' },
      take: 20
    });

    return successResponse(res, {
      totalCustomers:          customersCount,
      totalOutstandingBalance: toNum(balanceAgg._sum.balance),
      topDebtors: topDebtors.map(c => ({ ...c, balance: toNum(c.balance) }))
    });
  } catch (err) { next(err); }
};

exports.getStockTransactionsReport = async (req, res, next) => {
  try {
    const transactions = await prisma.stockTransaction.findMany({
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        product:   { select: { name: true, sku: true } },
        warehouse: { select: { name: true } },
        creator:   { select: { name: true } }
      }
    });

    return successResponse(res, {
      transactions: transactions.map(t => ({
        ...t,
        quantity: toNum(t.quantity)
      }))
    });
  } catch (err) { next(err); }
};

exports.getCashflowReports = async (req, res, next) => {
  try {
    const [salesCashAgg, salesCardAgg, expensesAgg, supplierAgg, customerAgg] = await Promise.all([
      prisma.cashSession.aggregate({ _sum: { totalSalesCash: true } }),
      prisma.cashSession.aggregate({ _sum: { totalSalesCard: true } }),
      prisma.cashSession.aggregate({ _sum: { totalExpenses: true } }),
      prisma.cashSession.aggregate({ _sum: { totalSupplierPayments: true } }),
      prisma.cashSession.aggregate({ _sum: { totalCustomerPayments: true } }),
    ]);

    const expensesGlobalAgg = await prisma.expense.aggregate({ _sum: { amount: true } });

    return successResponse(res, {
      sessionsSummary: {
        totalSalesCash:        toNum(salesCashAgg._sum.totalSalesCash),
        totalSalesCard:        toNum(salesCardAgg._sum.totalSalesCard),
        totalExpenses:         toNum(expensesAgg._sum.totalExpenses),
        totalSupplierPayments: toNum(supplierAgg._sum.totalSupplierPayments),
        totalCustomerPayments: toNum(customerAgg._sum.totalCustomerPayments),
      },
      totalExpensesGlobal: toNum(expensesGlobalAgg._sum.amount)
    });
  } catch (err) { next(err); }
};

exports.getChartData = async (req, res, next) => {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const now = new Date();
    const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    // 1. Sales & Profit Trend (Last 30 Days)
    const salesData = await prisma.order.findMany({
      where: { date: { gte: thirtyDaysAgo } },
      include: { items: { include: { product: true } } },
      orderBy: { date: 'asc' }
    });

    const dailyStats = salesData.reduce((acc, order) => {
      const day = order.date.toISOString().split('T')[0];
      if (!acc[day]) acc[day] = { revenue: 0, cost: 0, profit: 0 };
      
      const revenue = toNum(order.netAmount);
      const cost = order.items.reduce((sum, item) => sum + (item.quantity * toNum(item.product.costPrice)), 0);
      
      acc[day].revenue += revenue;
      acc[day].cost += cost;
      acc[day].profit += (revenue - cost);
      return acc;
    }, {});

    const salesTrend = Object.keys(dailyStats).map(date => ({
      date,
      ...dailyStats[date]
    }));

    // 2. Growth Rates (This Month vs Last Month)
    const thisMonthSales = await prisma.order.aggregate({
      where: { date: { gte: firstDayThisMonth } },
      _sum: { netAmount: true }
    });
    const lastMonthSales = await prisma.order.aggregate({
      where: { date: { gte: firstDayLastMonth, lt: firstDayThisMonth } },
      _sum: { netAmount: true }
    });

    const revenueGrowth = lastMonthSales._sum.netAmount > 0 
      ? ((toNum(thisMonthSales._sum.netAmount) / toNum(lastMonthSales._sum.netAmount)) - 1) * 100 
      : 100;

    // 3. Inventory Health (Stock Value & Low Stock)
    const stockData = await prisma.productStock.findMany({
      include: { product: true }
    });

    const totalInventoryValue = stockData.reduce((sum, s) => sum + (s.quantity * toNum(s.product.costPrice)), 0);
    const lowStockItems = stockData.filter(s => s.quantity <= (s.product.lowStockThreshold || 1)).length;

    // 4. Expense Categories (Pie)
    const expensesByCategory = await prisma.expense.groupBy({
      by: ['categoryId'],
      _sum: { amount: true },
    });
    const categories = await prisma.expenseCategory.findMany();
    const expenseChart = expensesByCategory.map(ec => {
      const cat = categories.find(c => c.id === ec.categoryId);
      return {
        name: cat ? (cat.nameAr || cat.name) : 'Other',
        value: toNum(ec._sum.amount)
      };
    });

    // 5. Top 5 Products
    const topProductsRaw = await prisma.orderItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, totalPrice: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5
    });
    const products = await prisma.product.findMany({
      where: { id: { in: topProductsRaw.map(p => p.productId) } },
      select: { id: true, name: true }
    });
    const topProductsChart = topProductsRaw.map(tp => {
      const p = products.find(prod => prod.id === tp.productId);
      return {
        name: p ? p.name : 'Unknown',
        qty: tp._sum.quantity,
        revenue: toNum(tp._sum.totalPrice)
      };
    });

    return successResponse(res, {
      salesTrend,
      expenseChart,
      topProductsChart,
      kpis: {
        revenueGrowth: revenueGrowth.toFixed(1),
        totalInventoryValue,
        lowStockItems,
        totalProfit: salesTrend.reduce((sum, d) => sum + d.profit, 0)
      }
    });
  } catch (err) { next(err); }
};

const XLSX = require('xlsx');

exports.exportCustomReport = async (req, res, next) => {
  try {
    const { module, columns, startDate, endDate } = req.body;
    if (!module || !columns || !columns.length) {
      return res.status(400).json({ success: false, message: 'Module and columns are required' });
    }

    let data = [];
    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = { gte: new Date(startDate), lte: new Date(endDate) };
    }

    if (module === 'products') {
      const productsData = await prisma.product.findMany({
        include: { category: true, brand: true, stocks: true }
      });
      data = productsData.map(p => ({
        ...p,
        totalQuantity: p.stocks ? p.stocks.reduce((acc, s) => acc + s.quantity, 0) : 0
      }));
    } else if (module === 'stock') {
      data = await prisma.productStock.findMany({
        include: { product: true, warehouse: true }
      });
    } else if (module === 'orders') {
      const ordersData = await prisma.order.findMany({
        where: dateFilter,
        include: { 
          customer: true, 
          creator: true,
          payments: {
            where: { type: 'SALE' }
          }
        }
      });
      data = ordersData.map(item => {
        const custBal = item.customer ? Number(item.customer.balance) : 0;
        
        let balanceAfterOrder = '';
        if (item.paymentMethod === 'ON_ACCOUNT') {
          const saleTx = item.payments && item.payments.length ? item.payments[0] : null;
          if (saleTx) {
            balanceAfterOrder = Number(saleTx.balanceAfter);
          } else {
            balanceAfterOrder = custBal + Number(item.netAmount);
          }
        }

        const customer = item.customer ? {
          ...item.customer,
          balance: custBal > 0 ? custBal : 0,
          deposit: custBal < 0 ? Math.abs(custBal) : 0
        } : null;

        return {
          ...item,
          customer,
          balanceAfterOrder
        };
      });
    }

    // Map data to selected columns
    const reportData = data.map(item => {
      const row = {};
      columns.forEach(col => {
        let val;
        // Handle nested paths if needed (e.g. category.name)
        if (col.includes('.')) {
          const [p1, p2] = col.split('.');
          val = item[p1] ? item[p1][p2] : '';
        } else {
          val = item[col];
        }

        // Convert Prisma Decimal to number so Excel can render it
        if (val && typeof val === 'object' && !(val instanceof Date)) {
          if (val.toNumber) {
            val = val.toNumber();
          } else if (val.d && val.e !== undefined) {
            val = Number(val);
          }
        }

        if (col === 'lowStockThreshold' && val == null) {
          val = 1;
        }
        
        row[col] = val;
      });
      return row;
    });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(reportData);
    XLSX.utils.book_append_sheet(wb, ws, 'Report');
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=custom_report_${Date.now()}.xlsx`);
    return res.send(buffer);
  } catch (err) { next(err); }
};
