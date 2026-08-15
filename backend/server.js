// backend/server.js
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const morgan  = require('morgan');

const { errorMiddleware } = require('./src/middleware/error.middleware');
const authRoutes  = require('./src/modules/auth/auth.routes');
const usersRoutes = require('./src/modules/users/users.routes');
const rolesRoutes      = require('./src/modules/roles/roles.routes');
const settingsRoutes   = require('./src/modules/settings/settings.routes');
const inventoryRoutes  = require('./src/modules/inventory/inventory.routes');
const productsRoutes   = require('./src/modules/products/products.routes');
const suppliersRoutes  = require('./src/modules/suppliers/suppliers.routes');
const mediaRoutes      = require('./src/modules/media/media.routes');
const customersRoutes  = require('./src/modules/customers/customers.routes');
const expensesRoutes   = require('./src/modules/expenses/expenses.routes');
const accountingRoutes = require('./src/modules/accounting/accounting.routes');
const orderRoutes      = require('./src/modules/orders/orders.routes');
const dayboxRoutes     = require('./src/modules/daybox/daybox.routes');
const reportsRoutes    = require('./src/modules/reports/reports.routes');
const path             = require('path');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Security & Parsing ────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false })); // Allow cross-origin static images
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

// ── Static Files ──────────────────────────────────────────────────────────────
app.use('/api/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',  authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/roles',      rolesRoutes);
app.use('/api/settings',   settingsRoutes);
app.use('/api/inventory',  inventoryRoutes);
app.use('/api/products',   productsRoutes);
app.use('/api/suppliers',  suppliersRoutes);
app.use('/api/media',      mediaRoutes);
app.use('/api/customers',  customersRoutes);
app.use('/api/expenses',   expensesRoutes);
app.use('/api/accounting', accountingRoutes);
app.use('/api/orders',     orderRoutes);
app.use('/api/daybox',     dayboxRoutes);
app.use('/api/reports',    reportsRoutes);

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((_req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use(errorMiddleware);

app.listen(PORT, () => {
  console.log(`🚀 Aman ERP API running on port ${PORT} [${process.env.NODE_ENV}]`);
});

module.exports = app;
