// import-products.js
// Place this file in the backend/ folder, then run:
//   node import-products.js

const path = require('path');
const fs   = require('fs');

// ─── Load Environment ────────────────────────────────────────────────────────
const rootEnv = path.join(__dirname, '../.env');
if (fs.existsSync(rootEnv)) {
  require('dotenv').config({ path: rootEnv });
  console.log('📝 Loaded configuration from root .env');
} else {
  require('dotenv').config();
  console.log('📝 Loaded configuration from backend .env');
}

const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');

// ─── Database connection ──────────────────────────────────────────────────────
let DB_URL = process.env.DATABASE_URL;

// If we don't have a full URL, build it from parts
if (!DB_URL) {
  const DB_USER = process.env.POSTGRES_USER || 'aman_user';
  const DB_PASS = process.env.POSTGRES_PASSWORD || 'aman_erp_password_2026';
  const DB_NAME = process.env.POSTGRES_DB || 'aman_erp';
  // Use 'postgres' if inside Docker, 'localhost' if outside
  const host = process.env.HOSTNAME ? 'postgres' : 'localhost';
  DB_URL = `postgresql://${DB_USER}:${DB_PASS}@${host}:5432/${DB_NAME}`;
}

// Security check: If running outside Docker, ensure it's not trying to use 'postgres' host
if (!process.env.HOSTNAME && DB_URL.includes('@postgres:')) {
  DB_URL = DB_URL.replace('@postgres:', '@localhost:');
}

console.log(`🚀 Connecting to database: ${DB_URL.replace(/:([^:@]+)@/, ':****@')}`);

const prisma = new PrismaClient({ 
  datasources: { db: { url: DB_URL } } 
});

// ─── Config ──────────────────────────────────────────────────────────────────

function findExcelFile() {
  const dir   = __dirname;
  const files = fs.readdirSync(dir).filter(f =>
    (f.endsWith('.xlsx') || f.endsWith('.xls')) &&
    !f.toLowerCase().includes('template')
  );
  if (files.length === 0) throw new Error('No .xlsx file found in the backend/ folder.');
  if (files.length > 1)   console.warn(`⚠️  Multiple xlsx files found. Using: ${files[0]}`);
  return path.join(dir, files[0]);
}

const TARGET_WAREHOUSE_NAME = null;

// ─── Name → ID caches ────────────────────────────────────────────────────────
const categoryCache = {};
const brandCache    = {};
const warehouseCache = {};

async function getOrCreateCategory(name) {
  if (!name) return null;
  const key = String(name).trim();
  if (!key) return null;
  if (categoryCache[key] !== undefined) return categoryCache[key];

  let cat = await prisma.category.findFirst({
    where: { name: { equals: key, mode: 'insensitive' } }
  });
  if (!cat) {
    cat = await prisma.category.create({ data: { name: key } });
    console.log(`\n  📁 Created category: "${key}"`);
  }
  categoryCache[key] = cat.id;
  return cat.id;
}

async function getOrCreateBrand(name) {
  if (!name) return null;
  const key = String(name).trim();
  if (!key) return null;
  if (brandCache[key] !== undefined) return brandCache[key];

  let brand = await prisma.brand.findFirst({
    where: { name: { equals: key, mode: 'insensitive' } }
  });
  if (!brand) {
    brand = await prisma.brand.create({ data: { name: key } });
    console.log(`\n  🏷️  Created brand: "${key}"`);
  }
  brandCache[key] = brand.id;
  return brand.id;
}

async function resolveWarehouseByName(name) {
  const key = String(name).trim();
  if (warehouseCache[key] !== undefined) return warehouseCache[key];
  const wh = await prisma.warehouse.findFirst({
    where: { name: { equals: key, mode: 'insensitive' } }
  });
  warehouseCache[key] = wh ? wh.id : null;
  return warehouseCache[key];
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  try {
    const filePath = findExcelFile();
    console.log(`\n📂 Reading: ${path.basename(filePath)}`);

    const wb   = XLSX.readFile(filePath);
    const ws   = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    console.log(`   ✅ ${rows.length} rows found in sheet "${wb.SheetNames[0]}"`);
    if (rows.length === 0) return;

    const cols = Object.keys(rows[0]);

    const defaultWarehouse = TARGET_WAREHOUSE_NAME
      ? await prisma.warehouse.findFirst({ where: { name: { equals: TARGET_WAREHOUSE_NAME, mode: 'insensitive' } } })
      : await prisma.warehouse.findFirst({ orderBy: { createdAt: 'asc' } });

    if (!defaultWarehouse) {
      console.error('❌ No warehouse found. Create one in the app first.');
      process.exit(1);
    }
    console.log(`🏭 Default Warehouse: "${defaultWarehouse.name}"\n`);

    const stockCols = cols.filter(c => String(c).toLowerCase().startsWith('stock_'));

    let created = 0; let updated = 0; let skipped = 0; let errors = 0;
    const errorLog = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // Smart Column Mapping (Handles capitalized or common aliases)
        const sku  = String(row.SKU  || row.sku  || row.Code || '').trim();
        const name = String(row.Name || row.name || '').trim();

        if (!sku || !name) {
          skipped++;
          continue;
        }

        const categoryId = await getOrCreateCategory(row.Category || row.categoryId || '');
        const brandId    = await getOrCreateBrand(row.Brand || row.brandId || '');

        const payload = {
          name,
          sku,
          barcode:              String(row.Barcode || row.barcode || '').trim() || null,
          shortDescription:     String(row.Description || row.shortDescription || '').trim() || null,
          costPrice:            parseFloat(row.CostPrice || row.costPrice || 0),
          mainPrice:            parseFloat(row.Price || row.mainPrice || 0),
          wholesalePrice:       parseFloat(row.BoxPrice || row.wholesalePrice || 0),
          wholesaleBoxQuantity: parseInt(row.BoxQuantity || row.wholesaleBoxQuantity || 1),
          isActive:             true,
          categoryId:           categoryId || null,
          brandId:              brandId    || null,
        };

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

        let stockHandled = false;
        // 1. Process named stock columns (stock_Warehouse)
        for (const col of stockCols) {
          const qty = parseInt(row[col]);
          if (isNaN(qty)) continue;

          const warehouseName = col.slice(6); // remove 'stock_'
          const warehouseId   = await resolveWarehouseByName(warehouseName);
          if (!warehouseId) continue;

          await prisma.productStock.upsert({
            where:  { productId_warehouseId: { productId, warehouseId } },
            create: { productId, warehouseId, quantity: qty },
            update: { quantity: qty },
          });
          stockHandled = true;
        }

        // 2. Process generic stock columns (Stock, AvailableStock)
        if (!stockHandled) {
          const qty = parseInt(row.Stock || row.stock || row.AvailableStock || 0);
          if (!isNaN(qty) && qty > 0) {
            await prisma.productStock.upsert({
              where:  { productId_warehouseId: { productId, warehouseId: defaultWarehouse.id } },
              create: { productId, warehouseId: defaultWarehouse.id, quantity: qty },
              update: { quantity: qty },
            });
          }
        }

        process.stdout.write(`\r  ⏳ Processing ${i + 1}/${rows.length} — ✅ ${created} New  🔄 ${updated} Updated  ❌ ${errors} Errors   `);

      } catch (err) {
        errors++;
        errorLog.push({ row: i + 2, sku: String(row.sku || ''), error: err.message });
      }
    }

    console.log('\n\n' + '═'.repeat(55));
    console.log('🏁 Import complete!');
    console.log(`   New Products : ${created}`);
    console.log(`   Updated      : ${updated}`);
    console.log(`   Skipped      : ${skipped} (missing name/sku)`);
    console.log(`   Errors       : ${errors}`);
    console.log('═'.repeat(55));

  } catch (err) {
    console.error('\n💥 Fatal Error:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
