const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { successResponse } = require('../../utils/response');
const { logAction } = require('../../utils/audit');
const { norm, matchProduct, loadAmanIndex, applyProductSync } = require('../sync/sync.service');
const legacy = require('./legacy.mssql');

const uploadDir = path.join(process.cwd(), 'uploads', 'legacy');
fs.mkdirSync(uploadDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, _file, cb) => cb(null, 'backup.bak'),
  }),
  limits: { fileSize: 200 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/\.bak$/i.test(file.originalname)) {
      return cb(new Error('Only .bak SQL Server backup files are allowed'));
    }
    cb(null, true);
  },
});

exports.uploadMiddleware = upload.single('file');

function previewRow(source, matched, warehouseId) {
  const currentStock = matched
    ? (matched.stocks.find((s) => s.warehouseId === warehouseId)?.quantity
      ?? matched.stocks.reduce((sum, s) => sum + s.quantity, 0))
    : null;
  return {
    source,
    matched: matched
      ? {
          id: matched.id,
          name: matched.name,
          sku: matched.sku,
          barcode: matched.barcode,
          costPrice: Number(matched.costPrice),
          mainPrice: Number(matched.mainPrice),
          wholesalePrice: Number(matched.wholesalePrice),
          stock: currentStock,
        }
      : null,
  };
}

exports.status = async (_req, res, next) => {
  try {
    const info = await legacy.ping();
    return successResponse(res, info);
  } catch (error) { next(error); }
};

exports.uploadBackup = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No .bak file uploaded' });
    return successResponse(res, {
      path: req.file.path,
      size: req.file.size,
      sqlPathHint: '/var/opt/mssql/backup/uploads/backup.bak',
    }, 'Backup uploaded. Restore it next.');
  } catch (error) { next(error); }
};

exports.useProjectBackup = async (_req, res, next) => {
  try {
    const src = legacy.findHostBak();
    if (!src) {
      return res.status(404).json({
        success: false,
        message: 'No backup.bak found. Upload one, or place backup.bak in the project root.',
      });
    }
    const dest = path.join(uploadDir, 'backup.bak');
    fs.mkdirSync(uploadDir, { recursive: true });
    if (path.resolve(src) !== path.resolve(dest)) fs.copyFileSync(src, dest);
    return successResponse(res, { path: dest, size: fs.statSync(dest).size }, 'Copied backup.bak for restore.');
  } catch (error) { next(error); }
};

exports.restore = async (req, res, next) => {
  try {
    const disk = req.body?.sqlPath || process.env.LEGACY_BAK_SQL_PATH;
    const result = await legacy.restoreBackup(disk);
    await logAction(req.user.id, 'UPDATE', 'products', 'legacy-restore', 'LegacyPOS', null, { database: result.database }, req);
    return successResponse(res, result, 'Backup restored. You can now pick a category.');
  } catch (error) {
    error.statusCode = 400;
    next(error);
  }
};

exports.listCategories = async (_req, res, next) => {
  try {
    const categories = await legacy.listCategories();
    return successResponse(res, categories);
  } catch (error) { next(error); }
};

exports.preview = async (req, res, next) => {
  try {
    const { category, warehouseId } = req.query;
    if (!category) return res.status(400).json({ success: false, message: 'Select a source category' });
    const sourceRows = await legacy.listSourceProducts(category);
    const index = await loadAmanIndex();
    const rows = sourceRows.map((src) => previewRow(src, matchProduct(src, index.byBarcode, index.bySku, index.byName), warehouseId));
    const matched = rows.filter((r) => r.matched).length;
    return successResponse(res, {
      total: rows.length,
      matched,
      unmatched: rows.length - matched,
      rows,
    });
  } catch (error) { next(error); }
};

exports.sync = async (req, res, next) => {
  try {
    const {
      category,
      warehouseId,
      createMissing = false,
      updatePrices = true,
      updateStock = true,
    } = req.body || {};

    if (!category) return res.status(400).json({ success: false, message: 'Select a source category' });

    const sourceRows = await legacy.listSourceProducts(category);
    const summary = await applyProductSync({
      sourceRows,
      warehouseId,
      createMissing,
      updatePrices,
      updateStock,
      userId: req.user.id,
      categoryLabel: category,
    });

    await logAction(req.user.id, 'UPDATE', 'products', 'legacy-sync', 'Product', null, summary, req);
    return successResponse(res, summary, 'Sync finished');
  } catch (error) {
    error.statusCode = error.statusCode || 400;
    next(error);
  }
};
