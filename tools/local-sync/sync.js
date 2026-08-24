const fs = require('fs');
const path = require('path');
const { connect, inspectSchema, listCategories, listProducts } = require('./sql-reader');

const configPath = process.env.AMAN_SYNC_CONFIG
  || path.join(__dirname, 'config.json');

function loadConfig() {
  if (!fs.existsSync(configPath)) {
    console.error(`Missing config: ${configPath}`);
    console.error('Copy config.example.json to config.json and edit it.');
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf8'));
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function pushBatch(config, items, category) {
  const url = `${config.vps.apiUrl.replace(/\/$/, '')}/sync/push`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Sync-Key': config.vps.syncKey,
    },
    body: JSON.stringify({
      items,
      warehouseId: config.warehouseId,
      category: category || 'all',
      updatePrices: config.updatePrices !== false,
      updateStock: config.updateStock !== false,
      createMissing: config.createMissing === true,
    }),
  });

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body.message || `HTTP ${res.status}`);
  }
  return body.data || body;
}

async function main() {
  const config = loadConfig();
  const listOnly = process.argv.includes('--list-categories');

  console.log(`[${new Date().toISOString()}] Connecting to SQL Server...`);
  const pool = await connect(config.sqlServer);
  const schema = await inspectSchema(pool);

  if (listOnly) {
    const cats = await listCategories(pool, schema);
    console.log('Categories:');
    for (const c of cats) console.log(`  - ${c.name} (${c.itemCount} items)`);
    await pool.close();
    return;
  }

  const category = config.category || '';
  const products = await listProducts(pool, schema, category);
  await pool.close();

  console.log(`Read ${products.length} products${category ? ` in "${category}"` : ''}.`);

  if (!products.length) {
    console.log('Nothing to sync.');
    return;
  }

  if (!config.vps?.apiUrl || !config.vps?.syncKey) {
    throw new Error('vps.apiUrl and vps.syncKey are required in config.json');
  }
  if (config.updateStock !== false && !config.warehouseId) {
    throw new Error('warehouseId is required when updateStock is true');
  }

  const batchSize = Number(config.batchSize || 500);
  const batches = chunk(products, batchSize);
  let totals = { updated: 0, created: 0, skipped: 0, errors: 0 };

  for (let i = 0; i < batches.length; i++) {
    console.log(`Pushing batch ${i + 1}/${batches.length} (${batches[i].length} items)...`);
    const summary = await pushBatch(config, batches[i], category || 'all');
    totals.updated += summary.updated || 0;
    totals.created += summary.created || 0;
    totals.skipped += summary.skipped || 0;
    totals.errors += summary.errors || 0;
  }

  console.log('Done:', totals);
}

main().catch((err) => {
  console.error('Sync failed:', err.message);
  process.exit(1);
});
