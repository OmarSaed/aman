// backend/clear-data.js
// This script deletes all products, categories, brands, orders, transactions, and uploaded files.
// Run this with: node clear-data.js

const path = require('path');
const fs   = require('fs');

// ─── Load Environment ────────────────────────────────────────────────────────
const rootEnv = path.join(__dirname, '../.env');
const localEnv = path.join(__dirname, '.env');

if (fs.existsSync(rootEnv)) {
  require('dotenv').config({ path: rootEnv });
  console.log('📝 Loaded configuration from root .env');
} else if (fs.existsSync(localEnv)) {
  require('dotenv').config({ path: localEnv });
  console.log('📝 Loaded configuration from backend .env');
} else {
  require('dotenv').config();
}

const { PrismaClient } = require('@prisma/client');

// ─── Database connection ──────────────────────────────────────────────────────
let DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
  const DB_USER = process.env.POSTGRES_USER || 'aman_user';
  const DB_PASS = process.env.POSTGRES_PASSWORD || 'aman_erp_password_2026';
  const DB_NAME = process.env.POSTGRES_DB || 'aman_erp';
  const host = process.env.HOSTNAME ? 'postgres' : 'localhost';
  DB_URL = `postgresql://${DB_USER}:${DB_PASS}@${host}:5432/${DB_NAME}`;
}

if (!process.env.HOSTNAME && DB_URL.includes('@postgres:')) {
  DB_URL = DB_URL.replace('@postgres:', '@localhost:');
}

const prisma = new PrismaClient({ 
  datasources: { db: { url: DB_URL } } 
});

async function clearUploads() {
  const uploadsDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadsDir)) return;

  console.log('📂 Clearing uploads directory...');
  const files = fs.readdirSync(uploadsDir);
  let count = 0;

  for (const file of files) {
    if (file === '.gitkeep') continue;
    const filePath = path.join(uploadsDir, file);
    try {
      if (fs.lstatSync(filePath).isDirectory()) {
        fs.rmSync(filePath, { recursive: true, force: true });
      } else {
        fs.unlinkSync(filePath);
      }
      count++;
    } catch (err) {
      console.error(`  ❌ Failed to delete ${file}: ${err.message}`);
    }
  }
  console.log(`  ✅ Deleted ${count} files/folders from uploads/`);
}

async function main() {
  console.log('\n⚠️  WARNING: This will permanently delete all products, orders, and related data!');
  console.log('Press Ctrl+C now if you want to stop.\n');

  try {
    // 1. Delete Orders and POs (Dependencies)
    console.log('🗑️  Deleting Order Items and Purchase Order Items...');
    await prisma.orderItem.deleteMany({});
    await prisma.purchaseOrderItem.deleteMany({});

    console.log('🗑️  Deleting Orders and Purchase Orders...');
    await prisma.order.deleteMany({});
    await prisma.purchaseOrder.deleteMany({});

    // 2. Delete Inventory Transactions and Stock
    console.log('🗑️  Deleting Stock Transactions and Levels...');
    await prisma.stockTransaction.deleteMany({});
    await prisma.productStock.deleteMany({});
    await prisma.supplierProduct.deleteMany({});

    // 3. Delete Products
    console.log('🗑️  Deleting Products...');
    await prisma.product.deleteMany({});

    // 4. Delete Categories and Brands
    console.log('🗑️  Deleting Categories (handling hierarchy)...');
    // Set parentCategoryId to null first to avoid constraint errors
    await prisma.category.updateMany({ data: { parentCategoryId: null } });
    await prisma.category.deleteMany({});

    console.log('🗑️  Deleting Brands...');
    await prisma.brand.deleteMany({});

    // 5. Delete Media Assets
    console.log('🗑️  Deleting Media Asset records...');
    await prisma.mediaAsset.deleteMany({});

    // 6. Delete Audit Logs (Optional, but keeps things clean)
    console.log('🗑️  Deleting Product-related Audit Logs...');
    await prisma.auditLog.deleteMany({
      where: {
        module: { in: ['inventory', 'products', 'orders', 'categories', 'brands'] }
      }
    });

    // 7. Clear physical files
    await clearUploads();

    console.log('\n✨ Database and files cleared successfully!');
    console.log('🚀 You can now run your import script.');

  } catch (err) {
    console.error('\n💥 Error during cleanup:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
