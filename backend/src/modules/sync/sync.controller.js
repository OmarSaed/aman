const { successResponse } = require('../../utils/response');
const { logAction } = require('../../utils/audit');
const { applyProductSync } = require('./sync.service');

exports.ping = async (_req, res) => {
  return successResponse(res, {
    ok: true,
    service: 'aman-remote-sync',
    timestamp: new Date().toISOString(),
  });
};

exports.push = async (req, res, next) => {
  try {
    const {
      items,
      warehouseId,
      createMissing = false,
      updatePrices = true,
      updateStock = true,
      category,
    } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'items array is required' });
    }
    if (items.length > 5000) {
      return res.status(400).json({ success: false, message: 'Maximum 5000 items per request' });
    }

    const normalized = items.map((row, i) => ({
      sourceId: String(row.sourceId ?? row.sku ?? i),
      name: String(row.name || '').trim(),
      barcode: row.barcode ? String(row.barcode).trim() : '',
      sku: row.sku ? String(row.sku).trim() : '',
      price: Number(row.price ?? row.mainPrice ?? 0),
      cost: Number(row.cost ?? row.costPrice ?? 0),
      wholesale: Number(row.wholesale ?? row.wholesalePrice ?? row.price ?? 0),
      quantity: Math.round(Number(row.quantity ?? row.stock ?? 0)),
      category: row.category ? String(row.category) : '',
    })).filter((r) => r.name || r.barcode || r.sku);

    const summary = await applyProductSync({
      sourceRows: normalized,
      warehouseId,
      createMissing,
      updatePrices,
      updateStock,
      userId: req.syncUserId,
      categoryLabel: category || 'remote-push',
    });

    await logAction(
      req.syncUserId,
      'UPDATE',
      'products',
      'remote-sync-push',
      'Product',
      null,
      summary,
      req,
    );

    return successResponse(res, summary, 'Remote sync finished');
  } catch (error) {
    error.statusCode = error.statusCode || 400;
    next(error);
  }
};
