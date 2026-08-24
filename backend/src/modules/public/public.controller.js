const { PrismaClient } = require('@prisma/client');
const { successResponse } = require('../../utils/response');
const { paginate } = require('../../utils/paginate');
const { isApprovedWholesale } = require('./public.middleware');
const prisma = new PrismaClient();

const httpError = (statusCode, message) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  return err;
};

const toPublicProduct = (product, wholesale = false) => {
  const stockQty = (product.stocks || []).reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const wholesalePrice = Number(product.wholesalePrice || 0);
  const retail = Number(product.mainPrice || 0);
  const useWholesale = wholesale && wholesalePrice > 0;
  const boxQuantity = useWholesale ? (product.wholesaleBoxQuantity || 1) : 1;
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    shortDescription: product.shortDescription,
    longDescription: product.longDescription,
    imageUrl: product.imageUrl,
    price: useWholesale ? wholesalePrice : retail,
    boxQuantity,
    boxLocked: useWholesale && boxQuantity > 1,
    pricingTier: useWholesale ? 'WHOLESALE' : 'RETAIL',
    inStock: stockQty > 0,
    category: product.category
      ? { id: product.category.id, name: product.category.name }
      : null,
    brand: product.brand
      ? { id: product.brand.id, name: product.brand.name }
      : null,
  };
};

const wholesaleFor = async (req) => {
  if (!isApprovedWholesale(req.customer)) return false;
  const system = await prisma.systemSetting.findFirst();
  return system?.enableWholesalePricing !== false;
};

const publicProductInclude = {
  category: { select: { id: true, name: true } },
  brand: { select: { id: true, name: true } },
  stocks: { select: { quantity: true } },
};

exports.getCompany = async (_req, res, next) => {
  try {
    const [company, system] = await Promise.all([
      prisma.companySetting.findFirst(),
      prisma.systemSetting.findFirst(),
    ]);

    return successResponse(res, {
      companyName: company?.companyName || 'Aman',
      logoUrl: company?.logoUrl || null,
      address: company?.address || null,
      phoneNumber: company?.phoneNumber || null,
      email: company?.email || null,
      website: company?.website || null,
      openingHours: company?.openingHours || null,
      currency: system?.currency || company?.currency || 'USD',
      enableWholesalePricing: system?.enableWholesalePricing !== false,
    });
  } catch (error) {
    next(error);
  }
};

exports.listCategories = async (_req, res, next) => {
  try {
    const categories = await prisma.category.findMany({
      where: { parentCategoryId: null },
      include: {
        subCategories: {
          include: { _count: { select: { products: { where: { isActive: true } } } } },
          orderBy: { name: 'asc' },
        },
        _count: { select: { products: { where: { isActive: true } } } },
      },
      orderBy: { name: 'asc' },
    });

    const mapped = categories.map((category) => ({
      id: category.id,
      name: category.name,
      description: category.description,
      productCount: category._count.products,
      children: category.subCategories.map((child) => ({
        id: child.id,
        name: child.name,
        description: child.description,
        productCount: child._count.products,
      })),
    }));

    return successResponse(res, mapped);
  } catch (error) {
    next(error);
  }
};

exports.listProducts = async (req, res, next) => {
  try {
    const { page, limit, search, categoryId } = req.query;
    const filters = { isActive: true };
    const wholesale = await wholesaleFor(req);

    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        include: { subCategories: { select: { id: true } } },
      });
      if (!category) throw httpError(404, 'Category not found');
      const ids = [category.id, ...category.subCategories.map((child) => child.id)];
      filters.categoryId = { in: ids };
    }

    if (search) {
      filters.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { shortDescription: { contains: search, mode: 'insensitive' } },
        { brand: { name: { contains: search, mode: 'insensitive' } } },
        { category: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const result = await paginate(prisma.product, {
      where: filters,
      include: publicProductInclude,
      orderBy: { createdAt: 'desc' },
    }, page, limit || 24);

    return successResponse(res, {
      ...result,
      data: result.data.map((row) => toPublicProduct(row, wholesale)),
    });
  } catch (error) {
    next(error);
  }
};

exports.getProduct = async (req, res, next) => {
  try {
    const wholesale = await wholesaleFor(req);
    const product = await prisma.product.findFirst({
      where: { id: req.params.id, isActive: true },
      include: publicProductInclude,
    });
    if (!product) throw httpError(404, 'Product not found');

    let related = [];
    if (product.categoryId) {
      const relatedRows = await prisma.product.findMany({
        where: {
          isActive: true,
          categoryId: product.categoryId,
          id: { not: product.id },
        },
        include: publicProductInclude,
        take: 8,
        orderBy: { updatedAt: 'desc' },
      });
      related = relatedRows.map((row) => toPublicProduct(row, wholesale));
    }

    return successResponse(res, {
      ...toPublicProduct(product, wholesale),
      related,
    });
  } catch (error) {
    next(error);
  }
};

exports.createWebsiteOrder = async (req, res, next) => {
  try {
    const {
      customer: customerInput = {},
      items,
      notes,
      currency,
    } = req.body || {};

    const name = String(customerInput.name || req.customer?.name || '').trim();
    const phone = String(customerInput.phone || req.customer?.phone || '').trim();
    const email = String(customerInput.email || req.customer?.email || '').trim();
    const address = String(customerInput.address || req.customer?.address || '').trim();
    const companyName = String(customerInput.company || req.customer?.companyName || '').trim();

    if (!name) throw httpError(400, 'Customer name is required');
    if (!phone) throw httpError(400, 'Phone number is required');
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw httpError(400, 'Order must have at least one item');
    }

    const orderResult = await prisma.$transaction(async (tx) => {
      const system = await tx.systemSetting.findFirst();
      const company = await tx.companySetting.findFirst();
      const orderCurrency = currency || system?.currency || company?.currency || 'USD';
      const exchangeRate = Number(system?.exchangeRate || 1);

      let customer = req.customer
        ? await tx.customer.findUnique({ where: { id: req.customer.id } })
        : null;

      if (customer) {
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: {
            name: name || customer.name,
            phone: phone || customer.phone,
            email: email || customer.email,
            address: address || customer.address,
            companyName: companyName || customer.companyName,
          },
        });
      } else {
        customer = await tx.customer.findFirst({
          where: { phone, isActive: true, passwordHash: null },
          orderBy: { createdAt: 'desc' },
        });
        const displayName = companyName || name;
        if (customer) {
          customer = await tx.customer.update({
            where: { id: customer.id },
            data: {
              name: customer.name || displayName,
              email: email || customer.email,
              address: address || customer.address,
            },
          });
        } else {
          customer = await tx.customer.create({
            data: {
              name: displayName,
              phone,
              email: email || null,
              address: address || null,
              companyName: companyName || null,
              type: 'NORMAL',
              requestedType: 'NORMAL',
              accountStatus: 'NONE',
            },
          });
        }
      }

      const useWholesale = system?.enableWholesalePricing !== false && customer.type === 'WHOLESALE';
      let totalAmount = 0;
      const orderItemsData = [];

      for (const item of items) {
        const quantity = Number(item.quantity);
        if (!item.productId) throw httpError(400, 'Each item must include a productId');
        if (!Number.isFinite(quantity) || quantity <= 0) {
          throw httpError(400, 'Each item must have a quantity greater than 0');
        }

        const product = await tx.product.findFirst({
          where: { id: item.productId, isActive: true },
        });
        if (!product) throw httpError(400, `Product ${item.productId} is not available`);

        const boxQty = useWholesale ? (product.wholesaleBoxQuantity || 1) : 1;
        if (quantity < boxQty) {
          throw httpError(400, `Minimum quantity for ${product.name} is ${boxQty}`);
        }
        if (boxQty > 1 && quantity % boxQty !== 0) {
          throw httpError(400, `Quantity for ${product.name} must be in multiples of ${boxQty}`);
        }

        const wholesale = Number(product.wholesalePrice || 0);
        const retail = Number(product.mainPrice || 0);
        const price = useWholesale && wholesale > 0 ? wholesale : retail;
        const itemTotal = price * quantity;
        totalAmount += itemTotal;

        orderItemsData.push({
          productId: product.id,
          customName: null,
          quantity,
          unitPrice: price,
          totalPrice: itemTotal,
        });
      }

      const netAmount = totalAmount;
      const stamp = new Date();
      const y = stamp.getFullYear();
      const m = String(stamp.getMonth() + 1).padStart(2, '0');
      const d = String(stamp.getDate()).padStart(2, '0');
      const orderNumber = `WEB-${y}${m}${d}-${String(Date.now()).slice(-5)}`;
      const tierLabel = useWholesale ? 'Website wholesale order' : 'Website retail order';

      const noteParts = [
        tierLabel,
        `Contact: ${name}`,
        `Phone: ${phone}`,
        email ? `Email: ${email}` : null,
        companyName ? `Company: ${companyName}` : null,
        address ? `Address: ${address}` : null,
        notes ? `Notes: ${String(notes).trim()}` : null,
      ].filter(Boolean);

      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          userId: null,
          source: 'WEBSITE',
          totalAmount,
          discount: 0,
          taxAmount: 0,
          netAmount,
          paidAmount: 0,
          balanceDue: netAmount,
          currency: orderCurrency,
          exchangeRate,
          totalAmountBase: netAmount * exchangeRate,
          paidAmountBase: 0,
          status: 'PENDING',
          stockDeducted: false,
          paymentStatus: 'UNPAID',
          paymentMethod: 'WEBSITE',
          notes: noteParts.join('\n'),
          items: { create: orderItemsData },
        },
        include: {
          items: { include: { product: { select: { name: true, sku: true, imageUrl: true } } } },
          customer: { select: { id: true, name: true, phone: true, email: true, address: true, type: true } },
        },
      });

      return order;
    });

    return successResponse(res, {
      id: orderResult.id,
      orderNumber: orderResult.orderNumber,
      status: orderResult.status,
      currency: orderResult.currency,
      totalAmount: orderResult.totalAmount,
      netAmount: orderResult.netAmount,
      customer: orderResult.customer,
      items: orderResult.items.map((item) => ({
        name: item.product?.name || item.customName,
        sku: item.product?.sku || null,
        imageUrl: item.product?.imageUrl || null,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      })),
      createdAt: orderResult.createdAt,
    }, 'Website order received', 201);
  } catch (error) {
    next(error);
  }
};
