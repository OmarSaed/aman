const sql = require('mssql');
const fs = require('fs');
const path = require('path');

const LEGACY_DB = process.env.LEGACY_MSSQL_DATABASE || 'LegacyPOS';

let pools = { master: null, legacy: null };
let schemaCache = null;

function mssqlConfig(database) {
  return {
    server: process.env.LEGACY_MSSQL_HOST || 'localhost',
    port: Number(process.env.LEGACY_MSSQL_PORT || 1433),
    user: process.env.LEGACY_MSSQL_USER || 'sa',
    password: process.env.LEGACY_MSSQL_PASSWORD || 'AmanLegacy_2026!',
    database,
    options: {
      encrypt: String(process.env.LEGACY_MSSQL_ENCRYPT || 'false') === 'true',
      trustServerCertificate: true,
      enableArithAbort: true,
    },
    connectionTimeout: 15000,
    requestTimeout: 180000,
  };
}

async function getPool(database = LEGACY_DB) {
  const key = database === 'master' ? 'master' : 'legacy';
  if (pools[key]?.connected) return pools[key];
  const pool = new sql.ConnectionPool(mssqlConfig(database));
  await pool.connect();
  pools[key] = pool;
  return pool;
}

async function closePools() {
  for (const key of Object.keys(pools)) {
    if (pools[key]) {
      await pools[key].close().catch(() => {});
      pools[key] = null;
    }
  }
  schemaCache = null;
}

function ident(name) {
  return `[${String(name).replace(/]/g, ']]')}]`;
}

function npath(p) {
  return `N'${String(p).replace(/'/g, "''")}'`;
}

function pickCol(columns, ...candidates) {
  const lower = columns.map((c) => c.toLowerCase());
  for (const cand of candidates) {
    const i = lower.indexOf(cand.toLowerCase());
    if (i >= 0) return columns[i];
  }
  return null;
}

function num(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function str(value) {
  if (value == null) return '';
  return String(value).trim();
}

function hostBakCandidates() {
  return [
    process.env.LEGACY_BAK_HOST_PATH,
    path.join(process.cwd(), 'uploads', 'legacy', 'backup.bak'),
    path.join(process.cwd(), 'legacy', 'backup.bak'),
    path.join(process.cwd(), '..', 'backup.bak'),
    path.join(__dirname, '../../../../backup.bak'),
  ].filter(Boolean);
}

function findHostBak() {
  for (const p of hostBakCandidates()) {
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  return null;
}

async function ping() {
  const info = {
    host: process.env.LEGACY_MSSQL_HOST || 'localhost',
    port: Number(process.env.LEGACY_MSSQL_PORT || 1433),
    database: LEGACY_DB,
    connected: false,
    restored: false,
    hostBak: findHostBak(),
    sqlBakPath: process.env.LEGACY_BAK_SQL_PATH || '/var/opt/mssql/backup/uploads/backup.bak',
    error: null,
  };
  try {
    const master = await getPool('master');
    const dbs = await master.request().query('SELECT name FROM sys.databases ORDER BY name');
    info.connected = true;
    info.databases = dbs.recordset.map((r) => r.name);
    info.restored = info.databases.some((n) => n.toLowerCase() === LEGACY_DB.toLowerCase());
    if (info.restored) {
      const schema = await inspectSchema();
      info.tables = schema.tables;
      info.categoryCount = schema.ready ? undefined : 0;
    }
  } catch (err) {
    info.error = err.message;
  }
  return info;
}

async function restoreBackup(diskPath) {
  schemaCache = null;
  await closePools();
  const master = await getPool('master');
  const candidates = [...new Set([
    diskPath,
    process.env.LEGACY_BAK_SQL_PATH,
    '/var/opt/mssql/backup/uploads/backup.bak',
    '/var/opt/mssql/backup/root.bak',
  ].filter(Boolean))];

  let disk = candidates[0];
  let files;
  let lastErr;
  for (const candidate of candidates) {
    try {
      files = await master.request().query(`RESTORE FILELISTONLY FROM DISK = ${npath(candidate)}`);
      if (files.recordset.length) {
        disk = candidate;
        lastErr = null;
        break;
      }
    } catch (err) {
      lastErr = err;
    }
  }
  if (!files?.recordset?.length) {
    throw new Error(lastErr?.message || 'Could not read backup file list. Upload a .bak or start the SQL Server sidecar.');
  }

  const dataDirRow = await master.request().query("SELECT CAST(SERVERPROPERTY('InstanceDefaultDataPath') AS nvarchar(4000)) AS p");
  const dataDir = (dataDirRow.recordset[0]?.p || '/var/opt/mssql/data/').replace(/\\?$/, (m) => (m ? m : ''));
  const dir = dataDir.endsWith('\\') || dataDir.endsWith('/') ? dataDir : `${dataDir}/`;

  const moves = files.recordset.map((f) => {
    const type = String(f.Type ?? f.type ?? '').toUpperCase();
    const ext = type === 'L' || type === '76' ? '_log.ldf' : '.mdf';
    const dest = `${dir}LegacyPOS_${f.LogicalName}${ext}`;
    return `MOVE ${npath(f.LogicalName)} TO ${npath(dest)}`;
  });

  const hasDb = (await master.request()
    .input('n', sql.NVarChar, LEGACY_DB)
    .query('SELECT name FROM sys.databases WHERE name = @n')).recordset.length > 0;

  if (hasDb) {
    await master.request().query(`
      ALTER DATABASE ${ident(LEGACY_DB)} SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
      DROP DATABASE ${ident(LEGACY_DB)};
    `);
  }

  await master.request().query(`
    RESTORE DATABASE ${ident(LEGACY_DB)}
    FROM DISK = ${npath(disk)}
    WITH REPLACE, ${moves.join(', ')}
  `);

  await closePools();
  schemaCache = null;
  const schema = await inspectSchema();
  return { database: LEGACY_DB, files: files.recordset.map((f) => f.LogicalName), schema };
}

async function tableColumns(pool, table) {
  const rs = await pool.request()
    .input('t', sql.NVarChar, table)
    .query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = @t
    `);
  return rs.recordset.map((r) => r.COLUMN_NAME);
}

async function listTables(pool) {
  const rs = await pool.request().query(`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME
  `);
  return rs.recordset.map((r) => r.TABLE_NAME);
}

function findTable(tables, ...candidates) {
  const lower = tables.map((t) => t.toLowerCase());
  for (const c of candidates) {
    const i = lower.indexOf(c.toLowerCase());
    if (i >= 0) return tables[i];
  }
  return null;
}

async function inspectSchema() {
  if (schemaCache) return schemaCache;
  const pool = await getPool(LEGACY_DB);
  const tables = await listTables(pool);
  const stock = findTable(tables, 'stock');
  if (!stock) {
    schemaCache = { ready: false, tables, error: 'No stock table found in the restored database.' };
    return schemaCache;
  }
  const stockCols = await tableColumns(pool, stock);
  const stored = findTable(tables, 'item_stored');
  const storages = findTable(tables, 'storages');
  const categories = findTable(tables, 'Categories', 'Category', 'categories');

  schemaCache = {
    ready: true,
    tables,
    stock,
    stored,
    storages,
    categories,
    cols: {
      id: pickCol(stockCols, 'stock_id', 'item_id', 'id'),
      name: pickCol(stockCols, 'stock_item', 'item_name', 'name'),
      barcode: pickCol(stockCols, 's_barcode', 'barcode', 'Barcode'),
      barcode2: pickCol(stockCols, 'OutsideBarcode', 'outsidebarcode'),
      price: pickCol(stockCols, 'stock_price', 'CurrentPrice', 'price', 'sold_price'),
      cost: pickCol(stockCols, 'stock_cost', 'cost_price', 'cost', 'AverageCost'),
      wholesale: pickCol(stockCols, 'whole_sale', 'wholesale', 'wholesale_Price'),
      category: pickCol(stockCols, 'category', 'stock_category'),
      brand: pickCol(stockCols, 'brand', 'stock_brand'),
      qty: pickCol(stockCols, 'quantity', 'Equantity', 'stock_quantity'),
      sku: pickCol(stockCols, 'code', 'sku', 'stock_id'),
    },
    storedCols: stored ? await tableColumns(pool, stored) : [],
    storageCols: storages ? await tableColumns(pool, storages) : [],
  };

  if (schemaCache.stored) {
    schemaCache.storedMap = {
      stockFk: pickCol(schemaCache.storedCols, 'is_stock', 'stock_id', 'item_id'),
      storageFk: pickCol(schemaCache.storedCols, 'is_storage', 'storage_id', 's_id'),
      qty: pickCol(schemaCache.storedCols, 'is_quantity', 'quantity', 'qty'),
    };
  }
  return schemaCache;
}

async function listCategories() {
  const schema = await inspectSchema();
  if (!schema.ready) throw new Error(schema.error);
  const pool = await getPool(LEGACY_DB);
  const catCol = schema.cols.category;
  if (!catCol) return [];
  const rs = await pool.request().query(`
    SELECT LTRIM(RTRIM(CAST(${ident(catCol)} AS nvarchar(200)))) AS name,
           COUNT(*) AS itemCount
    FROM ${ident(schema.stock)}
    WHERE ${ident(catCol)} IS NOT NULL AND LTRIM(RTRIM(CAST(${ident(catCol)} AS nvarchar(200)))) <> ''
    GROUP BY LTRIM(RTRIM(CAST(${ident(catCol)} AS nvarchar(200))))
    ORDER BY name
  `);
  return rs.recordset.map((r) => ({ name: r.name, itemCount: r.itemCount }));
}

async function listSourceProducts(category) {
  const schema = await inspectSchema();
  if (!schema.ready) throw new Error(schema.error);
  const pool = await getPool(LEGACY_DB);
  const c = schema.cols;
  const qtyExpr = schema.stored && schema.storedMap?.stockFk && schema.storedMap?.qty
    ? `(SELECT SUM(${ident(schema.storedMap.qty)}) FROM ${ident(schema.stored)} st WHERE st.${ident(schema.storedMap.stockFk)} = s.${ident(c.id)})`
    : (c.qty ? `s.${ident(c.qty)}` : '0');

  const barcodeExpr = (c.barcode && c.barcode2)
    ? `COALESCE(NULLIF(LTRIM(RTRIM(CAST(s.${ident(c.barcode)} AS nvarchar(100)))), ''), LTRIM(RTRIM(CAST(s.${ident(c.barcode2)} AS nvarchar(100)))))`
    : c.barcode
      ? `LTRIM(RTRIM(CAST(s.${ident(c.barcode)} AS nvarchar(100))))`
      : c.barcode2
        ? `LTRIM(RTRIM(CAST(s.${ident(c.barcode2)} AS nvarchar(100))))`
        : 'NULL';

  const req = pool.request();
  let where = '1=1';
  if (category) {
    req.input('cat', sql.NVarChar, category);
    where = `LTRIM(RTRIM(CAST(s.${ident(c.category)} AS nvarchar(200)))) = @cat`;
  }

  const rs = await req.query(`
    SELECT
      s.${ident(c.id)} AS sourceId,
      LTRIM(RTRIM(CAST(s.${ident(c.name)} AS nvarchar(400)))) AS name,
      ${barcodeExpr} AS barcode,
      CAST(s.${ident(c.id)} AS nvarchar(50)) AS sku,
      ${c.price ? `s.${ident(c.price)}` : '0'} AS price,
      ${c.cost ? `s.${ident(c.cost)}` : '0'} AS cost,
      ${c.wholesale ? `s.${ident(c.wholesale)}` : '0'} AS wholesale,
      ${c.brand ? `LTRIM(RTRIM(CAST(s.${ident(c.brand)} AS nvarchar(200))))` : `NULL`} AS brand,
      ${c.category ? `LTRIM(RTRIM(CAST(s.${ident(c.category)} AS nvarchar(200))))` : `NULL`} AS category,
      ${qtyExpr} AS quantity
    FROM ${ident(schema.stock)} s
    WHERE ${where}
    ORDER BY name
  `);

  return rs.recordset.map((r) => ({
    sourceId: str(r.sourceId),
    name: str(r.name),
    barcode: str(r.barcode),
    sku: str(r.sku),
    price: num(r.price),
    cost: num(r.cost),
    wholesale: num(r.wholesale),
    brand: str(r.brand),
    category: str(r.category),
    quantity: Math.round(num(r.quantity)),
  })).filter((r) => r.name || r.barcode);
}

module.exports = {
  ping,
  restoreBackup,
  inspectSchema,
  listCategories,
  listSourceProducts,
  findHostBak,
  hostBakCandidates,
  closePools,
  LEGACY_DB,
};
