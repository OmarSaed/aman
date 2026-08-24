const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function norm(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function matchProduct(source, byBarcode, bySku, byName) {
  if (source.barcode && byBarcode.has(norm(source.barcode))) return byBarcode.get(norm(source.barcode));
  if (source.sku && bySku.has(norm(source.sku))) return bySku.get(norm(source.sku));
  if (source.name && byName.has(norm(source.name))) return byName.get(norm(source.name));
  return null;
}

async function loadAmanIndex() {
  const products = await prisma.product.findMany({
    select: {
      id: true,
      name: true,
      sku: true,
      barcode: true,
      costPrice: true,
      mainPrice: true,
      wholesalePrice: true,
      stocks: { select: { warehouseId: true, quantity: true } },
    },
  });
  const byBarcode = new Map();
  const bySku = new Map();
  const byName = new Map();
  for (const p of products) {
    if (p.barcode) byBarcode.set(norm(p.barcode), p);
    if (p.sku) bySku.set(norm(p.sku), p);
    if (p.name) byName.set(norm(p.name), p);
  }
  return { byBarcode, bySku, byName };
}

async function resolveSyncUserId(explicitUserId) {
  if (explicitUserId) {
    const user = await prisma.user.findUnique({ where: { id: explicitUserId } });
    if (user) return user.id;
  }
  const admin = await prisma.user.findUnique({ where: { email: 'admin@aman-erp.com' } });
  if (admin) return admin.id;
  const anyUser = await prisma.user.findFirst({ where: { isActive: true } });
  if (!anyUser) throw new Error('No active user found for sync audit trail');
  return anyUser.id;
}

async function applyProductSync({
  sourceRows,
  warehouseId,
  createMissing = false,
  updatePrices = true,
  updateStock = true,
  userId,
  categoryLabel = 'remote',
}) {
  if (updateStock && !warehouseId) {
    throw new Error('warehouseId is required when updateStock is true');
  }

  if (warehouseId) {
    const warehouse = await prisma.warehouse.findUnique({ where: { id: warehouseId } });
    if (!warehouse) throw new Error('Warehouse not found');
  }

  const actorId = await resolveSyncUserId(userId);
  const index = await loadAmanIndex();

  let updated = 0;
  let created = 0;
  let skipped = 0;
  const errors = [];

  for (const src of sourceRows) {
    try {
      let product = matchProduct(src, index.byBarcode, index.bySku, index.byName);

      if (!product && createMissing) {
        if (!src.sku && !src.barcode) { skipped++; continue; }
        const sku = src.sku || src.barcode || `LEGACY-${src.sourceId}`;
        const existsSku = await prisma.product.findUnique({ where: { sku } });
        if (existsSku) {
          product = existsSku;
        } else {
          product = await prisma.product.create({
            data: {
              name: src.name || sku,
              sku,
              barcode: src.barcode || null,
              costPrice: src.cost ?? 0,
              mainPrice: src.price ?? 0,
              wholesalePrice: src.wholesale || src.price || 0,
              createdBy: actorId,
            },
            include: { stocks: true },
          });
          created++;
          if (src.barcode) index.byBarcode.set(norm(src.barcode), product);
          index.bySku.set(norm(product.sku), product);
          index.byName.set(norm(product.name), product);
        }
      }

      if (!product) { skipped++; continue; }

      const data = { updatedBy: actorId };
      if (updatePrices) {
        data.costPrice = src.cost ?? 0;
        data.mainPrice = src.price ?? 0;
        data.wholesalePrice = src.wholesale ?? src.price ?? 0;
      }

      await prisma.product.update({ where: { id: product.id }, data });

      if (updateStock && warehouseId) {
        const existing = await prisma.productStock.findUnique({
          where: { productId_warehouseId: { productId: product.id, warehouseId } },
        });
        const nextQty = Math.round(Number(src.quantity) || 0);
        const prevQty = existing?.quantity || 0;
        await prisma.productStock.upsert({
          where: { productId_warehouseId: { productId: product.id, warehouseId } },
          create: { productId: product.id, warehouseId, quantity: nextQty, updatedBy: actorId },
          update: { quantity: nextQty, updatedBy: actorId },
        });
        const delta = nextQty - prevQty;
        if (delta !== 0) {
          await prisma.stockTransaction.create({
            data: {
              productId: product.id,
              warehouseId,
              quantity: delta,
              transactionType: 'Adjustment',
              notes: `Remote POS sync (${categoryLabel})`,
              createdBy: actorId,
            },
          });
        }
      }

      updated++;
    } catch (err) {
      errors.push({ sourceId: src.sourceId, name: src.name, error: err.message });
    }
  }

  return {
    category: categoryLabel,
    total: sourceRows.length,
    updated,
    created,
    skipped,
    errors: errors.length,
    errorRows: errors.slice(0, 50),
  };
}

module.exports = {
  norm,
  matchProduct,
  loadAmanIndex,
  applyProductSync,
};
