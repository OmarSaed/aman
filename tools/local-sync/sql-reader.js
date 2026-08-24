const sql = require('mssql');

function ident(name) {
  return `[${String(name).replace(/]/g, ']]')}]`;
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

async function inspectSchema(pool) {
  const tables = await listTables(pool);
  const stock = findTable(tables, 'stock');
  if (!stock) throw new Error('No stock table found in the POS database.');

  const stockCols = await tableColumns(pool, stock);
  const stored = findTable(tables, 'item_stored');
  const categories = findTable(tables, 'Categories', 'Category', 'categories');

  const schema = {
    stock,
    stored,
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
      qty: pickCol(stockCols, 'quantity', 'Equantity', 'stock_quantity'),
      sku: pickCol(stockCols, 'code', 'sku', 'stock_id'),
    },
    storedCols: stored ? await tableColumns(pool, stored) : [],
  };

  if (schema.stored) {
    schema.storedMap = {
      stockFk: pickCol(schema.storedCols, 'is_stock', 'stock_id', 'item_id'),
      qty: pickCol(schema.storedCols, 'is_quantity', 'quantity', 'qty'),
    };
  }

  return schema;
}

async function listCategories(pool, schema) {
  const catCol = schema.cols.category;
  if (!catCol) return [];
  const rs = await pool.request().query(`
    SELECT LTRIM(RTRIM(CAST(${ident(catCol)} AS nvarchar(200)))) AS name,
           COUNT(*) AS itemCount
    FROM ${ident(schema.stock)}
    WHERE ${ident(catCol)} IS NOT NULL
      AND LTRIM(RTRIM(CAST(${ident(catCol)} AS nvarchar(200)))) <> ''
    GROUP BY LTRIM(RTRIM(CAST(${ident(catCol)} AS nvarchar(200))))
    ORDER BY name
  `);
  return rs.recordset;
}

async function listProducts(pool, schema, category) {
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
    category: str(r.category),
    quantity: Math.round(num(r.quantity)),
  })).filter((r) => r.name || r.barcode || r.sku);
}

async function connect(config) {
  const pool = await sql.connect({
    server: config.server,
    port: Number(config.port || 1433),
    user: config.user,
    password: config.password,
    database: config.database,
    options: {
      encrypt: Boolean(config.encrypt),
      trustServerCertificate: true,
      enableArithAbort: true,
    },
    connectionTimeout: 15000,
    requestTimeout: 180000,
  });
  return pool;
}

module.exports = {
  connect,
  inspectSchema,
  listCategories,
  listProducts,
};
