// import-products.js
// Run from the backend folder:
//   node ../import-products.js
//
// What it does:
//  - Reads ProductsWithStock_20260401180337.xlsx from the project root
//  - Creates/finds Categories and Brands by name automatically
//  - Upserts each product (create if new SKU, update if existing)
//  - Sets stock (AvailableStock column) in the FIRST warehouse found in the DB
//  - Logs a summary at the end

require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

// ─── Config ──────────────────────────────────────────────────────────────────
const FILE_PATH = path.resolve(__dirname, 'backend/ProductsWithStock_20260401180337.xlsx');

// If you want to target a specific warehouse by name, set it here.
// Leave as null to use the first warehouse in the DB.
const TARGET_WAREHOUSE_NAME = null;

// ─── Helpers ─────────────────────────────────────────────────────────────────
const categoryCache = {};
const brandCache    = {};

async function getOrCreateCategory(name) {
  const key = name.trim();
  if (!key) return null;
  if (categoryCache[key]) return categoryCache[key];

  let cat = await prisma.category.findFirst({ where: { name: { equals: key, mode: 'insensitive' } } });
  if (!cat) {
    cat = await prisma.category.create({ data: { name: key } });
    console.log(`  📁 Created category: "${key}"`);
  }
  categoryCache[key] = cat.id;
  return cat.id;
}

async function getOrCreateBrand(name) {
  const key = name.trim();
  if (!key) return null;
  if (brandCache[key]) return brandCache[key];

  let brand = await prisma.brand.findFirst({ where: { name: { equals: key, mode: 'insensitive' } } });
  if (!brand) {
    brand = await prisma.brand.create({ data: { name: key } });
    console.log(`  🏷️  Created brand: "${key}"`);
  }
  brandCache[key] = brand.id;
  return brand.id;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n📂 Reading Excel file…');
  const wb   = XLSX.readFile(FILE_PATH);
  const ws   = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  console.log(`   ✅ ${rows.length} rows found in sheet "${wb.SheetNames[0]}"\n`);

  // Resolve target warehouse
  const warehouse = TARGET_WAREHOUSE_NAME
    ? await prisma.warehouse.findFirst({ where: { name: { equals: TARGET_WAREHOUSE_NAME, mode: 'insensitive' } } })
    : await prisma.warehouse.findFirst({ orderBy: { createdAt: 'asc' } });

  if (!warehouse) {
    console.error('❌ No warehouse found in the database. Please create at least one warehouse first.');
    process.exit(1);
  }
  console.log(`🏭 Stock will be assigned to warehouse: "${warehouse.name}"\n`);

  let created  = 0;
  let updated  = 0;
  let skipped  = 0;
  let errors   = 0;
  const errorLog = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];

    try {
      // ── Required fields ────────────────────────────────────────────────────
      const name = String(row.Name || '').trim();
      const sku  = String(row.SKU  || '').trim();

      if (!name || !sku) {
        console.warn(`  ⚠️  Row ${i + 2}: missing Name or SKU — skipped`);
        skipped++;
        continue;
      }

      // ── Resolve relations ──────────────────────────────────────────────────
      const categoryId = await getOrCreateCategory(String(row.Category || ''));
      const brandId    = await getOrCreateBrand(String(row.Brand || ''));

      // ── Build product payload ──────────────────────────────────────────────
      const barcode = row.Barcode && String(row.Barcode).trim() !== String(row.SKU).trim()
        ? String(row.Barcode).trim()
        : null;

      const payload = {
        name,
        sku,
        barcode:              barcode || null,
        shortDescription:     row.Description ? String(row.Description).trim() || null : null,
        costPrice:            row.CostPrice    ? parseFloat(row.CostPrice)    : 0,
        mainPrice:            row.Price        ? parseFloat(row.Price)        : 0,
        wholesalePrice:       row.BoxPrice     ? parseFloat(row.BoxPrice)     : 0,
        wholesaleBoxQuantity: row.BoxQuantity  ? parseInt(row.BoxQuantity)    : 1,
        isActive:             String(row.IsActive || 'Yes').toLowerCase() === 'yes',
        categoryId:           categoryId || null,
        brandId:              brandId    || null,
      };

      // ── Upsert product ─────────────────────────────────────────────────────
      let productId;
      const existing = await prisma.product.findUnique({ where: { sku } });

      if (existing) {
        await prisma.product.update({ where: { id: existing.id }, data: payload });
        productId = existing.id;
        updated++;
      } else {
        const p = await prisma.product.create({ data: payload });
        productId = p.id;
        created++;
      }

      // ── Handle stock (AvailableStock column) ───────────────────────────────
      const qty = parseInt(row.AvailableStock || row.Stock || 0);
      if (qty > 0) {
        await prisma.productStock.upsert({
          where: { productId_warehouseId: { productId, warehouseId: warehouse.id } },
          create: { productId, warehouseId: warehouse.id, quantity: qty },
          update: { quantity: qty },
        });

        await prisma.stockTransaction.create({
          data: {
            productId,
            warehouseId: warehouse.id,
            quantity: qty,
            transactionType: 'Adjustment',
            notes: 'Imported from ProductsWithStock_20260401180337.xlsx',
          },
        });
      }

      process.stdout.write(`\r  ⏳ Processing row ${i + 1} / ${rows.length} …`);

    } catch (err) {
      errors++;
      errorLog.push({ row: i + 2, sku: String(row.SKU || ''), error: err.message });
    }
  }

  // ─── Summary ───────────────────────────────────────────────────────────────
  console.log('\n\n' + '─'.repeat(55));
  console.log('✅ Import complete!');
  console.log(`   Created : ${created}`);
  console.log(`   Updated : ${updated}`);
  console.log(`   Skipped : ${skipped}`);
  console.log(`   Errors  : ${errors}`);
  console.log('─'.repeat(55));

  if (errorLog.length > 0) {
    console.log('\n❌ Failed rows:');
    errorLog.forEach(e => console.log(`   Row ${e.row} (SKU: ${e.sku}): ${e.error}`));
  }
}

main()
  .catch(e => { console.error('\n💥 Fatal error:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
