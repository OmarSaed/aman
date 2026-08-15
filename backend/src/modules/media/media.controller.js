const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { successResponse } = require('../../utils/response');
const { logAction } = require('../../utils/audit');
const fs = require('fs');
const path = require('path');

exports.listMedia = async (req, res, next) => {
  try {
    const assets = await prisma.mediaAsset.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        creator: { select: { id: true, name: true } }
      }
    });
    return res.status(200).json({ success: true, data: assets });
  } catch (error) { next(error); }
};

exports.uploadMedia = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded or invalid format' });

    const url = `/uploads/${req.file.filename}`;

    const newAsset = await prisma.mediaAsset.create({
      data: {
        filename: req.file.originalname,
        url: url,
        mimeType: req.file.mimetype,
        sizeBytes: req.file.size,
        createdBy: req.user.id
      }
    });

    await logAction(req.user.id, 'CREATE', 'settings', newAsset.id, 'MediaAsset', null, newAsset, req);

    return res.status(201).json({ success: true, data: newAsset, message: 'File uploaded successfully' });
  } catch (error) { next(error); }
};

exports.deleteMedia = async (req, res, next) => {
  try {
    const { id } = req.params;
    const asset = await prisma.mediaAsset.findUnique({ where: { id } });
    if (!asset) return res.status(404).json({ success: false, message: 'Media not found' });

    // Try to delete physical file
    try {
      const filename = path.basename(asset.url);
      const filePath = path.join(__dirname, '../../../uploads', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch(err) {
      console.error('Failed to parse and delete local file:', err.message);
    }

    // Delete from DB regardless
    await prisma.mediaAsset.delete({ where: { id } });
    await logAction(req.user.id, 'DELETE', 'settings', id, 'MediaAsset', asset, null, req);

    return successResponse(res, null, 'Media deleted successfully');
  } catch (error) { next(error); }
};
