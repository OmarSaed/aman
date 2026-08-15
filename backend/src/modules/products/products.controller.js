// backend/src/modules/products/products.controller.js
const { PrismaClient } = require('@prisma/client');
const { successResponse } = require('../../utils/response');
const { logAction } = require('../../utils/audit');
const { paginate } = require('../../utils/paginate');
const { recalculateProductCost } = require('../../utils/pricing');
const csv = require('csv-parser');
const stream = require('stream');

const prisma = new PrismaClient();

// ─── Categories ─────────────────────────────────────────────────────────────

exports.listCategories = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const query = {
      include: { parentCategory: { select: { name: true } } },
      orderBy: { createdAt: 'desc' }
    };

    if (page && limit) {
      const result = await paginate(prisma.category, query, page, limit);
      return res.status(200).json(result);
    }

    const categories = await prisma.category.findMany(query);
    return successResponse(res, categories);
  } catch (error) { next(error); }
};

exports.createCategory = async (req, res, next) => {
  try {
    const { name, description, parentCategoryId } = req.body;
    const existing = await prisma.category.findFirst({ where: { name } });
    if (existing) return res.status(400).json({ success: false, message: 'Category name already exists' });

    const category = await prisma.category.create({
      data: { name, description, parentCategoryId, createdBy: req.user.id }
    });
    await logAction(req.user.id, 'CREATE', 'products', category.id, 'Category', null, category, req);
    return successResponse(res, category, 'Category created', 201);
  } catch (error) { next(error); }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, parentCategoryId } = req.body;
    const old = await prisma.category.findUnique({ where: { id } });
    if (!old) return res.status(404).json({ success: false, message: 'Category not found' });

    const updated = await prisma.category.update({
      where: { id },
      data: { name, description, parentCategoryId, updatedBy: req.user.id }
    });
    await logAction(req.user.id, 'UPDATE', 'products', updated.id, 'Category', old, updated, req);
    return successResponse(res, updated, 'Category updated');
  } catch (error) { next(error); }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const old = await prisma.category.findUnique({ where: { id }, include: { products: true, subCategories: true } });
    if (!old) return res.status(404).json({ success: false, message: 'Category not found' });

    if (old.products.length > 0 || old.subCategories.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with associated products or sub-categories'
      });
    }

    await prisma.category.delete({ where: { id } });
    await logAction(req.user.id, 'DELETE', 'products', id, 'Category', old, null, req);
    return successResponse(res, null, 'Category deleted successfully');
  } catch (error) { next(error); }
};

// ─── Brands ─────────────────────────────────────────────────────────────────

exports.listBrands = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    if (page && limit) {
      const result = await paginate(prisma.brand, {
        orderBy: { createdAt: 'desc' }
      }, page, limit);
      return res.status(200).json(result);
    }
    const brands = await prisma.brand.findMany({ orderBy: { createdAt: 'desc' } });
    return successResponse(res, brands);
  } catch (error) { next(error); }
};

exports.createBrand = async (req, res, next) => {
  try {
    const { name, description } = req.body;
    const existing = await prisma.brand.findFirst({ where: { name } });
    if (existing) return res.status(400).json({ success: false, message: 'Brand name already exists' });

    const brand = await prisma.brand.create({
      data: { name, description, createdBy: req.user.id }
    });
    await logAction(req.user.id, 'CREATE', 'products', brand.id, 'Brand', null, brand, req);
    return successResponse(res, brand, 'Brand created', 201);
  } catch (error) { next(error); }
};

exports.updateBrand = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const old = await prisma.brand.findUnique({ where: { id } });
    if (!old) return res.status(404).json({ success: false, message: 'Brand not found' });

    const updated = await prisma.brand.update({
      where: { id },
      data: { name, description, updatedBy: req.user.id }
    });
    await logAction(req.user.id, 'UPDATE', 'products', updated.id, 'Brand', old, updated, req);
    return successResponse(res, updated, 'Brand updated');
  } catch (error) { next(error); }
};

exports.deleteBrand = async (req, res, next) => {
  try {
    const { id } = req.params;
    const old = await prisma.brand.findUnique({ where: { id }, include: { products: true } });
    if (!old) return res.status(404).json({ success: false, message: 'Brand not found' });

    if (old.products.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete brand with associated products'
      });
    }

    await prisma.brand.delete({ where: { id } });
    await logAction(req.user.id, 'DELETE', 'products', id, 'Brand', old, null, req);
    return successResponse(res, null, 'Brand deleted successfully');
  } catch (error) { next(error); }
};

// ─── Products ───────────────────────────────────────────────────────────────

exports.listProducts = async (req, res, next) => {
  try {
    const { page, limit, search, categoryId, brandId, all } = req.query;
    const filters = {};
    if (categoryId) filters.categoryId = categoryId;
    if (brandId) filters.brandId = brandId;
    if (search) {
      filters.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
        { category: { name: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const query = {
      where: filters,
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
        stocks: { include: { warehouse: { select: { name: true } } } },
        _count: { select: { supplierPrices: true } }
      },
      orderBy: { createdAt: 'desc' }
    };

    if (all === 'true') {
      const products = await prisma.product.findMany(query);
      return successResponse(res, { data: products });
    }

    const result = await paginate(prisma.product, query, page, limit);
    return successResponse(res, result);
  } catch (error) { next(error); }
};

exports.getProductById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
        stocks: { include: { warehouse: { select: { name: true } } } },
        supplierPrices: { include: { supplier: { select: { name: true } } }, orderBy: { date: 'desc' } },
        _count: { select: { supplierPrices: true } }
      }
    });
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
    return successResponse(res, product);
  } catch (error) { next(error); }
};

exports.createProduct = async (req, res, next) => {
  try {
    const { initialStock, categoryId, brandId, ...rest } = req.body;
    const existing = await prisma.product.findFirst({ where: { sku: rest.sku } });
    if (existing) return res.status(400).json({ success: false, message: 'Product SKU already exists' });

    const product = await prisma.product.create({
      data: { 
        ...rest, 
        categoryId: categoryId || null,
        brandId: brandId || null,
        lowStockThreshold: rest.lowStockThreshold || 1,
        createdBy: req.user.id 
      }
    });

    // Handle initial stock
    let totalInitialQty = 0;
    if (initialStock && Array.isArray(initialStock)) {
      totalInitialQty = initialStock.reduce((sum, s) => sum + parseInt(s.quantity || 0), 0);
      for (const stock of initialStock) {
        if (stock.warehouseId && stock.quantity > 0) {
          await prisma.productStock.create({
            data: {
              productId: product.id,
              warehouseId: stock.warehouseId,
              quantity: parseInt(stock.quantity),
              updatedBy: req.user.id
            }
          });
          // Log initial transaction
          await prisma.stockTransaction.create({
            data: {
              productId: product.id,
              warehouseId: stock.warehouseId,
              quantity: parseInt(stock.quantity),
              transactionType: 'Adjustment',
              notes: 'Initial stock intake',
              createdBy: req.user.id
            }
          });
        }
      }
    }

    // --- ADD INITIAL PRICE HISTORY ---
    if (totalInitialQty > 0) {
      await prisma.supplierProduct.create({
        data: {
          productId: product.id,
          supplierPrice: rest.costPrice,
          quantity: totalInitialQty,
          createdBy: req.user.id
        }
      });
    }

    await logAction(req.user.id, 'CREATE', 'products', product.id, 'Product', null, product, req);
    return successResponse(res, product, 'Product created successfully', 201);
  } catch (error) { next(error); }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { initialStock, categoryId, brandId, ...rest } = req.body;
    const old = await prisma.product.findUnique({ where: { id } });
    if (!old) return res.status(404).json({ success: false, message: 'Product not found' });

    // Ensure unique SKU
    if (rest.sku && rest.sku !== old.sku) {
      const existing = await prisma.product.findFirst({ where: { sku: rest.sku } });
      if (existing) return res.status(400).json({ success: false, message: 'Product SKU already exists' });
    }

    let updated = await prisma.product.update({
      where: { id },
      data: { 
        ...rest, 
        categoryId: categoryId || null,
        brandId: brandId || null,
        lowStockThreshold: rest.lowStockThreshold || 1,
        updatedBy: req.user.id 
      }
    });

    // If pricing strategy changed, we must immediately recalculate!
    if (rest.overridePricingStrategy !== undefined && rest.overridePricingStrategy !== old.overridePricingStrategy) {
      updated = await recalculateProductCost(id);
    }

    await logAction(req.user.id, 'UPDATE', 'products', updated.id, 'Product', old, updated, req);
    return successResponse(res, updated, 'Product updated successfully');
  } catch (error) { next(error); }
};

exports.deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const old = await prisma.product.findUnique({ where: { id } });
    if (!old) return res.status(404).json({ success: false, message: 'Product not found' });

    await prisma.product.delete({ where: { id } });
    await logAction(req.user.id, 'DELETE', 'products', id, 'Product', old, null, req);
    return successResponse(res, null, 'Product deleted successfully');
  } catch (error) {
    if (error.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete product because it is associated with historical transactions (e.g., Purchase Orders). Please make it inactive instead.'
      });
    }
    next(error);
  }
};

// ─── Bulk Import ────────────────────────────────────────────────────────────

// Fetch all warehouses once and cache within the request to avoid N+1 queries
async function resolveWarehouseByName(name, cache) {
  if (cache[name] !== undefined) return cache[name];
  const wh = await prisma.warehouse.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } }
  });
  cache[name] = wh ? wh.id : null;
  return cache[name];
}

exports.bulkImportProducts = async (req, res, next) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

  const results = [];
  const bufferStream = new stream.PassThrough();
  bufferStream.end(req.file.buffer);

  bufferStream
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      let created = 0;
      let updated = 0;
      let errors = 0;
      const warehouseCache = {};

      for (const row of results) {
        try {
          if (!row.sku || !row.name) { errors++; continue; }

          const payload = {
            name: row.name,
            sku: row.sku,
            barcode: row.barcode || null,
            shortDescription: row.shortDescription || null,
            costPrice: row.costPrice ? parseFloat(row.costPrice) : 0,
            mainPrice: row.mainPrice ? parseFloat(row.mainPrice) : 0,
            wholesalePrice: row.wholesalePrice ? parseFloat(row.wholesalePrice) : 0,
            wholesaleBoxQuantity: row.wholesaleBoxQuantity ? parseInt(row.wholesaleBoxQuantity) : 1,
            categoryId: row.categoryId || null,
            brandId: row.brandId || null,
          };

          let productId;
          const existing = await prisma.product.findUnique({ where: { sku: row.sku } });
          if (existing) {
            const updated_product = await prisma.product.update({
              where: { id: existing.id },
              data: { ...payload, updatedBy: req.user.id }
            });
            productId = updated_product.id;
            updated++;
          } else {
            const new_product = await prisma.product.create({
              data: { ...payload, createdBy: req.user.id }
            });
            productId = new_product.id;
            created++;
          }

          // ── Process stock_* columns ────────────────────────────────────────
          for (const [key, value] of Object.entries(row)) {
            if (!key.startsWith('stock_')) continue;
            const qty = parseInt(value);
            if (!qty || qty <= 0) continue;

            const warehouseName = key.slice('stock_'.length);
            const warehouseId = await resolveWarehouseByName(warehouseName, warehouseCache);
            if (!warehouseId) continue; // unknown warehouse — skip silently

            await prisma.productStock.upsert({
              where: { productId_warehouseId: { productId, warehouseId } },
              create: { productId, warehouseId, quantity: qty, updatedBy: req.user.id },
              update: {
                quantity: { increment: qty },
                updatedBy: req.user.id
              }
            });

            await prisma.stockTransaction.create({
              data: {
                productId,
                warehouseId,
                quantity: qty,
                transactionType: 'Adjustment',
                notes: 'Bulk import stock intake',
                createdBy: req.user.id
              }
            });
          }
        } catch (err) {
          errors++;
        }
      }

      await logAction(req.user.id, 'UPDATE', 'products', 'bulk-import', 'Product', null, { created, updated, errors }, req);
      return successResponse(res, { created, updated, errors }, 'Bulk import process finished');
    })
    .on('error', (err) => next(err));
};

// ─── Import Template Download ────────────────────────────────────────────────

exports.downloadImportTemplate = async (req, res, next) => {
  try {
    const warehouses = await prisma.warehouse.findMany({ orderBy: { name: 'asc' } });

    const baseHeaders = [
      'sku',
      'name',
      'barcode',
      'shortDescription',
      'costPrice',
      'mainPrice',
      'wholesalePrice',
      'wholesaleBoxQuantity',
      'categoryId',
      'brandId',
    ];

    const stockHeaders = warehouses.map(w => `stock_${w.name}`);
    const allHeaders = [...baseHeaders, ...stockHeaders];

    const exampleRow = [
      'PROD-001',
      'Example Product',
      '1234567890123',
      'Short description here',
      '50.00',
      '75.00',
      '65.00',
      '6',
      '', // categoryId – leave blank or paste UUID
      '', // brandId   – leave blank or paste UUID
      ...warehouses.map(() => '0'),
    ];

    const csvContent = [
      allHeaders.join(','),
      exampleRow.join(',')
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="products_import_template.csv"');
    return res.send(csvContent);
  } catch (error) { next(error); }
};

exports.generateAllMissingBarcodes = async (req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        OR: [
          { barcode: null },
          { barcode: '' }
        ]
      }
    });

    let updatedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const product of products) {
        // Generate unique 12-digit code: prefix 200 + random numeric
        const now = Date.now().toString();
        const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const newBarcode = `200${now.slice(-6)}${rand}`.slice(0, 12);

        await tx.product.update({
          where: { id: product.id },
          data: { barcode: newBarcode, updatedBy: req.user.id }
        });
        updatedCount++;
      }
    });

    await logAction(req.user.id, 'UPDATE', 'products', null, 'Product', null, { message: `Bulk generated ${updatedCount} barcodes` }, req);
    return successResponse(res, { updatedCount }, `Successfully generated ${updatedCount} barcodes`);
  } catch (error) { next(error); }
};

exports.getProductTransactions = async (req, res, next) => {
  try {
    const { id } = req.params;
    const transactions = await prisma.stockTransaction.findMany({
      where: { productId: id },
      include: {
        warehouse: { select: { name: true } },
        creator: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return successResponse(res, transactions);
  } catch (error) { next(error); }
};

exports.bulkUpdatePrices = async (req, res, next) => {
  try {
    const { productIds, costPrice, mainPrice, wholesalePrice, isPriceLocked } = req.body;
    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No products selected' });
    }

    const dataToUpdate = {};
    if (costPrice !== undefined) dataToUpdate.costPrice = parseFloat(costPrice);
    if (mainPrice !== undefined) dataToUpdate.mainPrice = parseFloat(mainPrice);
    if (wholesalePrice !== undefined) dataToUpdate.wholesalePrice = parseFloat(wholesalePrice);
    if (isPriceLocked !== undefined) dataToUpdate.isPriceLocked = isPriceLocked;
    
    if (Object.keys(dataToUpdate).length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    dataToUpdate.updatedBy = req.user.id;

    const result = await prisma.product.updateMany({
      where: { id: { in: productIds } },
      data: dataToUpdate
    });

    await logAction(req.user.id, 'UPDATE', 'products', 'bulk-update-prices', 'Product', null, { productIds, dataToUpdate }, req);
    return successResponse(res, { updatedCount: result.count }, `Successfully updated prices for ${result.count} products`);
  } catch (error) { next(error); }
};

exports.togglePriceLock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isPriceLocked } = req.body;

    const old = await prisma.product.findUnique({ where: { id } });
    if (!old) return res.status(404).json({ success: false, message: 'Product not found' });

    const updated = await prisma.product.update({
      where: { id },
      data: { 
        isPriceLocked,
        updatedBy: req.user.id 
      }
    });

    // If auto-pricing is turned ON (isPriceLocked = false), we should recalculate the price immediately.
    let finalProduct = updated;
    if (isPriceLocked === false) {
       finalProduct = await recalculateProductCost(id);
    }

    await logAction(req.user.id, 'UPDATE', 'products', finalProduct.id, 'Product', old, finalProduct, req);
    return successResponse(res, finalProduct, 'Product auto-pricing updated');
  } catch (error) { next(error); }
};

exports.batchUpdatePrices = async (req, res, next) => {
  try {
    const { updates } = req.body; // Array of { id, costPrice, mainPrice, wholesalePrice }

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No updates provided' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedProducts = [];
      for (const update of updates) {
        const { id, costPrice, mainPrice, wholesalePrice } = update;
        
        const data = { updatedBy: req.user.id };
        if (costPrice !== undefined) data.costPrice = parseFloat(costPrice);
        if (mainPrice !== undefined) data.mainPrice = parseFloat(mainPrice);
        if (wholesalePrice !== undefined) data.wholesalePrice = parseFloat(wholesalePrice);
        if (update.lowStockThreshold !== undefined) data.lowStockThreshold = parseInt(update.lowStockThreshold);

        const updated = await tx.product.update({
          where: { id },
          data
        });
        updatedProducts.push(updated);
      }
      return updatedProducts;
    });

    await logAction(req.user.id, 'UPDATE', 'products', 'batch-update-prices', 'Product', null, { updates }, req);
    return successResponse(res, { count: result.length }, `Successfully updated ${result.length} products`);
  } catch (error) { next(error); }
};
