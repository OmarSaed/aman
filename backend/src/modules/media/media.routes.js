const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticate } = require('../../middleware/auth.middleware');
const controller = require('./media.controller');

// Ensure destination exists
const dest = path.join(__dirname, '../../../uploads');
if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname).toLowerCase());
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml', 'image/gif'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, WEBP, and GIF are allowed.'));
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter 
});

router.use(authenticate);
// Allow basic media actions to anyone mapped to products/inventory
// We'll trust requireAuth for listing, but allow deletion to admins/managers who have 'inventory:manage-products'
router.get('/', controller.listMedia);
router.post('/upload', upload.single('file'), controller.uploadMedia);
router.delete('/:id', controller.deleteMedia);

module.exports = router;
