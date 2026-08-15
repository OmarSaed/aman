// backend/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// ─── All Permissions ─────────────────────────────────────────────────────────
const PERMISSIONS = [
  // Users
  { key: 'users:view',   name: 'View Users',   nameAr: 'عرض المستخدمين',   module: 'users', moduleAr: 'المستخدمون', sortOrder: 1 },
  { key: 'users:create', name: 'Create Users', nameAr: 'إنشاء مستخدمين',   module: 'users', moduleAr: 'المستخدمون', sortOrder: 2 },
  { key: 'users:update', name: 'Update Users', nameAr: 'تعديل المستخدمين', module: 'users', moduleAr: 'المستخدمون', sortOrder: 3 },
  { key: 'users:delete', name: 'Delete Users', nameAr: 'حذف المستخدمين',   module: 'users', moduleAr: 'المستخدمون', sortOrder: 4 },
  { key: 'users:toggle-status', name: 'Toggle User Status', nameAr: 'تعديل حالة المستخدم', module: 'users', moduleAr: 'المستخدمون', sortOrder: 5 },

  // Roles
  { key: 'roles:view',               name: 'View Roles',           nameAr: 'عرض الأدوار',           module: 'roles', moduleAr: 'الأدوار والصلاحيات', sortOrder: 10 },
  { key: 'roles:create',             name: 'Create Roles',         nameAr: 'إنشاء أدوار',           module: 'roles', moduleAr: 'الأدوار والصلاحيات', sortOrder: 11 },
  { key: 'roles:update',             name: 'Update Roles',         nameAr: 'تعديل الأدوار',         module: 'roles', moduleAr: 'الأدوار والصلاحيات', sortOrder: 12 },
  { key: 'roles:delete',             name: 'Delete Roles',         nameAr: 'حذف الأدوار',           module: 'roles', moduleAr: 'الأدوار والصلاحيات', sortOrder: 13 },
  { key: 'roles:assign-permissions', name: 'Assign Permissions',   nameAr: 'تعيين الصلاحيات',       module: 'roles', moduleAr: 'الأدوار والصلاحيات', sortOrder: 14 },

  // Settings
  { key: 'settings:view',             name: 'View Settings',        nameAr: 'عرض الإعدادات',        module: 'settings', moduleAr: 'الإعدادات', sortOrder: 20 },
  { key: 'settings:manage',           name: 'Manage Settings',      nameAr: 'إدارة الإعدادات',      module: 'settings', moduleAr: 'الإعدادات', sortOrder: 21 },
  { key: 'settings:manage-currencies',name: 'Manage Currencies',    nameAr: 'إدارة العملات',        module: 'settings', moduleAr: 'الإعدادات', sortOrder: 22 },
  { key: 'settings:manage-tax',       name: 'Manage Tax Rates',     nameAr: 'إدارة الضرائب',        module: 'settings', moduleAr: 'الإعدادات', sortOrder: 23 },

  // Accounting
  { key: 'accounting:view',             name: 'View Accounting',          nameAr: 'عرض المحاسبة',           module: 'accounting', moduleAr: 'المحاسبة', sortOrder: 30 },
  { key: 'accounting:manage-accounts',  name: 'Manage Chart of Accounts', nameAr: 'إدارة شجرة الحسابات',    module: 'accounting', moduleAr: 'المحاسبة', sortOrder: 31 },
  { key: 'accounting:create-entries',   name: 'Create Journal Entries',   nameAr: 'إنشاء قيود يومية',       module: 'accounting', moduleAr: 'المحاسبة', sortOrder: 32 },
  { key: 'accounting:post-entries',     name: 'Post Journal Entries',     nameAr: 'ترحيل القيود اليومية',   module: 'accounting', moduleAr: 'المحاسبة', sortOrder: 33 },
  { key: 'accounting:void-entries',     name: 'Void Journal Entries',     nameAr: 'إلغاء القيود اليومية',   module: 'accounting', moduleAr: 'المحاسبة', sortOrder: 34 },
  { key: 'accounting:manage-fiscal',    name: 'Manage Fiscal Year',       nameAr: 'إدارة السنة المالية',    module: 'accounting', moduleAr: 'المحاسبة', sortOrder: 35 },
  { key: 'accounting:close-fiscal',     name: 'Close Fiscal Year',        nameAr: 'إغلاق السنة المالية',    module: 'accounting', moduleAr: 'المحاسبة', sortOrder: 36 },

  // Inventory
  { key: 'inventory:view-products',   name: 'View Products',         nameAr: 'عرض المنتجات',          module: 'inventory', moduleAr: 'المستودع', sortOrder: 40 },
  { key: 'inventory:create-products', name: 'Create Products',       nameAr: 'إنشاء منتجات',          module: 'inventory', moduleAr: 'المستودع', sortOrder: 41 },
  { key: 'inventory:update-products', name: 'Update Products',       nameAr: 'تعديل المنتجات',        module: 'inventory', moduleAr: 'المستودع', sortOrder: 42 },
  { key: 'inventory:delete-products', name: 'Delete Products',       nameAr: 'حذف المنتجات',          module: 'inventory', moduleAr: 'المستودع', sortOrder: 43 },
  { key: 'inventory:generate-barcodes',name: 'Generate Barcodes',    nameAr: 'إنشاء الباركود',        module: 'inventory', moduleAr: 'المستودع', sortOrder: 44 },
  { key: 'inventory:print-barcodes',  name: 'Print Barcodes',        nameAr: 'طباعة الباركود',        module: 'inventory', moduleAr: 'المستودع', sortOrder: 45 },
  { key: 'inventory:view-stock',      name: 'View Stock Levels',     nameAr: 'عرض مستويات المخزون',   module: 'inventory', moduleAr: 'المستودع', sortOrder: 46 },
  { key: 'inventory:adjust-stock',    name: 'Adjust Stock',          nameAr: 'تعديل المخزون',         module: 'inventory', moduleAr: 'المستودع', sortOrder: 47 },
  { key: 'inventory:view-movements',  name: 'View Stock Movements',  nameAr: 'عرض حركات المخزون',     module: 'inventory', moduleAr: 'المستودع', sortOrder: 48 },
  { key: 'inventory:manage-warehouses',name:'Manage Warehouses',     nameAr: 'إدارة المستودعات',      module: 'inventory', moduleAr: 'المستودع', sortOrder: 49 },
  { key: 'products:import',           name: 'Import Products',       nameAr: 'استيراد المنتجات',       module: 'inventory', moduleAr: 'المستودع', sortOrder: 50 },
  { key: 'products:manage-cost',      name: 'Manage Product Costs',  nameAr: 'إدارة تكاليف المنتجات', module: 'inventory', moduleAr: 'المستودع', sortOrder: 51 },


  // Orders
  { key: 'orders:view-all',   name: 'View All Orders',       nameAr: 'عرض جميع الطلبات',   module: 'orders', moduleAr: 'الطلبات', sortOrder: 50 },
  { key: 'orders:view-own',   name: 'View Own Orders',       nameAr: 'عرض طلباتي',          module: 'orders', moduleAr: 'الطلبات', sortOrder: 51 },
  { key: 'orders:create',     name: 'Create Orders',         nameAr: 'إنشاء طلبات',         module: 'orders', moduleAr: 'الطلبات', sortOrder: 52 },
  { key: 'orders:update',     name: 'Update Orders',         nameAr: 'تعديل الطلبات',       module: 'orders', moduleAr: 'الطلبات', sortOrder: 53 },
  { key: 'orders:cancel',     name: 'Cancel Orders',         nameAr: 'إلغاء الطلبات',       module: 'orders', moduleAr: 'الطلبات', sortOrder: 54 },
  { key: 'orders:fulfill',    name: 'Fulfill Orders',        nameAr: 'تنفيذ الطلبات',       module: 'orders', moduleAr: 'الطلبات', sortOrder: 55 },
  { key: 'orders:create-po',  name: 'Create Purchase Orders',nameAr: 'إنشاء أوامر الشراء',  module: 'orders', moduleAr: 'الطلبات', sortOrder: 56 },
  { key: 'orders:approve-po', name: 'Approve Purchase Orders',nameAr:'اعتماد أوامر الشراء', module: 'orders', moduleAr: 'الطلبات', sortOrder: 57 },
  { key: 'orders:receive-po', name: 'Receive Purchase Orders',nameAr:'استلام أوامر الشراء', module: 'orders', moduleAr: 'الطلبات', sortOrder: 58 },
  { key: 'orders:delete-po',  name: 'Delete Purchase Orders', nameAr:'حذف أوامر الشراء',   module: 'orders', moduleAr: 'الطلبات', sortOrder: 59 },

  // Invoices
  { key: 'invoices:view',       name: 'View Invoices',     nameAr: 'عرض الفواتير',            module: 'invoices', moduleAr: 'الفواتير', sortOrder: 60 },
  { key: 'invoices:create-ar',  name: 'Create AR Invoices',nameAr: 'إنشاء فواتير مبيعات',    module: 'invoices', moduleAr: 'الفواتير', sortOrder: 61 },
  { key: 'invoices:create-ap',  name: 'Create AP Bills',   nameAr: 'إنشاء فواتير مشتريات',  module: 'invoices', moduleAr: 'الفواتير', sortOrder: 62 },
  { key: 'invoices:issue-refunds',name:'Issue Refunds',    nameAr: 'إصدار المرتجعات',        module: 'invoices', moduleAr: 'الفواتير', sortOrder: 63 },

  // Payments
  { key: 'payments:process', name: 'Process Payments', nameAr: 'معالجة المدفوعات', module: 'payments', moduleAr: 'المدفوعات', sortOrder: 70 },

  // Cashier / POS
  { key: 'cashier:view-sessions',    name: 'View Cash Sessions',      nameAr: 'عرض جلسات الصندوق',   module: 'cashier', moduleAr: 'الصندوق', sortOrder: 80 },
  { key: 'cashier:manage-sessions',  name: 'Manage Cash Sessions',    nameAr: 'إدارة جلسات الصندوق', module: 'cashier', moduleAr: 'الصندوق', sortOrder: 81 },
  { key: 'cashier:record-transactions',name:'Record Cash Transactions',nameAr:'تسجيل معاملات الصندوق',module: 'cashier', moduleAr: 'الصندوق', sortOrder: 82 },
  { key: 'pos:access',               name: 'Access POS',              nameAr: 'الوصول لنقطة البيع',  module: 'cashier', moduleAr: 'الصندوق', sortOrder: 83 },

  // Customers
  { key: 'customers:view',   name: 'View Customers',   nameAr: 'عرض العملاء',   module: 'customers', moduleAr: 'العملاء', sortOrder: 90 },
  { key: 'customers:create', name: 'Create Customers', nameAr: 'إضافة عملاء',   module: 'customers', moduleAr: 'العملاء', sortOrder: 91 },
  { key: 'customers:update', name: 'Update Customers', nameAr: 'تعديل العملاء', module: 'customers', moduleAr: 'العملاء', sortOrder: 92 },
  { key: 'customers:delete', name: 'Delete Customers', nameAr: 'حذف العملاء',   module: 'customers', moduleAr: 'العملاء', sortOrder: 93 },

  // Vendors
  { key: 'vendors:view',   name: 'View Vendors',   nameAr: 'عرض الموردين',   module: 'vendors', moduleAr: 'الموردون', sortOrder: 100 },
  { key: 'vendors:create', name: 'Create Vendors', nameAr: 'إضافة موردين',   module: 'vendors', moduleAr: 'الموردون', sortOrder: 101 },
  { key: 'vendors:update', name: 'Update Vendors', nameAr: 'تعديل الموردين', module: 'vendors', moduleAr: 'الموردون', sortOrder: 102 },
  { key: 'suppliers:manage-prices', name:'Manage Supplier Prices', nameAr:'إدارة أسعار الموردين', module:'vendors', moduleAr:'الموردون', sortOrder:103},

  // Expenses
  { key: 'expenses:view',    name: 'View Expenses',    nameAr: 'عرض المصروفات',    module: 'expenses', moduleAr: 'المصروفات', sortOrder: 110 },
  { key: 'expenses:create',  name: 'Create Expenses',  nameAr: 'إضافة مصروفات',    module: 'expenses', moduleAr: 'المصروفات', sortOrder: 111 },
  { key: 'expenses:approve', name: 'Approve Expenses', nameAr: 'اعتماد المصروفات', module: 'expenses', moduleAr: 'المصروفات', sortOrder: 112 },

  // Reports
  { key: 'reports:view-financial', name: 'View Financial Reports', nameAr: 'عرض التقارير المالية',   module: 'reports', moduleAr: 'التقارير', sortOrder: 120 },
  { key: 'reports:view-inventory', name: 'View Inventory Reports', nameAr: 'عرض تقارير المخزون',    module: 'reports', moduleAr: 'التقارير', sortOrder: 121 },
  { key: 'reports:view-cash',      name: 'View Cash Reports',      nameAr: 'عرض تقارير الصندوق',    module: 'reports', moduleAr: 'التقارير', sortOrder: 122 },
  { key: 'reports:view-sales',     name: 'View Sales Reports',     nameAr: 'عرض تقارير المبيعات',   module: 'reports', moduleAr: 'التقارير', sortOrder: 123 },
  { key: 'reports:export',         name: 'Export Reports',         nameAr: 'تصدير التقارير',         module: 'reports', moduleAr: 'التقارير', sortOrder: 124 },

  // Audit
  { key: 'audit:view', name: 'View Audit Logs', nameAr: 'عرض سجل المراجعة', module: 'audit', moduleAr: 'سجل المراجعة', sortOrder: 130 },
];

const EXPENSE_CATEGORIES = [
  { name: 'Rent', nameAr: 'إيجار' },
  { name: 'Salaries', nameAr: 'رواتب' },
  { name: 'Utilities', nameAr: 'مرافق (كهرباء/مياه/غاز)' },
  { name: 'Maintenance', nameAr: 'صيانة وإصلاحات' },
  { name: 'Marketing', nameAr: 'تسويق وإعلان' },
  { name: 'Office Supplies', nameAr: 'مستلزمات مكتبية' },
  { name: 'Transportation', nameAr: 'نقل وانتقالات' },
  { name: 'Taxes & Fees', nameAr: 'ضرائب ورسوم' },
  { name: 'Others', nameAr: 'مصاريف أخرى' },
];

// ─── Role → Permission mapping ────────────────────────────────────────────────
const ALL_KEYS = PERMISSIONS.map(p => p.key);

const ROLE_PERMISSIONS = {
  admin: ALL_KEYS,

  manager: ALL_KEYS.filter(k => ![
    'users:delete', 'roles:create', 'roles:delete',
    'settings:manage', 'accounting:close-fiscal',
    'inventory:delete-products',
  ].includes(k)),

  accountant: [
    'accounting:view','accounting:manage-accounts','accounting:create-entries',
    'invoices:view','invoices:create-ar','invoices:create-ap',
    'payments:process',
    'customers:view','customers:create','customers:update',
    'vendors:view','vendors:create','vendors:update',
    'expenses:view','expenses:create',
    'inventory:view-products','inventory:view-stock','inventory:view-movements',
    'orders:view-all','orders:create','orders:create-po',
    'cashier:view-sessions','cashier:record-transactions',
    'reports:view-financial','reports:view-inventory','reports:view-cash','reports:view-sales','reports:export',
    'audit:view',
  ],

  cashier: [
    'pos:access',
    'cashier:manage-sessions','cashier:record-transactions','cashier:view-sessions',
    'orders:create','orders:view-own',
    'payments:process',
    'customers:view','customers:create',
    'inventory:view-products','inventory:view-stock','inventory:print-barcodes',
    'reports:view-cash',
  ],
};

// ─── System roles definition ─────────────────────────────────────────────────
const ROLES = [
  { name: 'admin',      displayName: 'Administrator', displayNameAr: 'مدير النظام',  nameAr: 'مدير النظام',  color: '#6366f1', isSystem: true, uiShell: 'SIDEBAR', sortOrder: 1 },
  { name: 'manager',    displayName: 'Manager',       displayNameAr: 'مدير',          nameAr: 'مدير',          color: '#10b981', isSystem: true, uiShell: 'SIDEBAR', sortOrder: 2 },
  { name: 'accountant', displayName: 'Accountant',    displayNameAr: 'محاسب',         nameAr: 'محاسب',         color: '#f59e0b', isSystem: true, uiShell: 'SIDEBAR', sortOrder: 3 },
  { name: 'cashier',    displayName: 'Cashier',       displayNameAr: 'أمين الصندوق', nameAr: 'أمين الصندوق', color: '#3b82f6', isSystem: true, uiShell: 'POS',     sortOrder: 4 },
];

async function main() {
  console.log('🌱 Starting database seed...');

  // ── 1. Upsert Permissions ──────────────────────────────────────
  console.log('  Creating permissions...');
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: perm.key },
      update: perm,
      create: perm,
    });
  }
  console.log(`  ✅ ${PERMISSIONS.length} permissions created`);

  // ── 2. Upsert Roles & assign permissions ───────────────────────
  console.log('  Creating system roles...');
  for (const roleData of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: { ...roleData },
      create: { ...roleData },
    });

    // Clear existing permissions then reassign
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });

    const permKeys = ROLE_PERMISSIONS[roleData.name] || [];
    const perms = await prisma.permission.findMany({ where: { key: { in: permKeys } } });

    await prisma.rolePermission.createMany({
      data: perms.map(p => ({ roleId: role.id, permissionId: p.id })),
      skipDuplicates: true,
    });
    console.log(`  ✅ Role "${roleData.displayName}" with ${perms.length} permissions`);
  }

  // ── 3. Create default users ──────────────────────────────
  console.log('  Creating default users for all roles...');
  const allRoles = await prisma.role.findMany();
  const passwordHash = await bcrypt.hash('Admin@1234', 12);

  const defaultUsers = [
    {
      email: 'admin@aman-erp.com',
      name: 'System Administrator',
      nameAr: 'مدير النظام',
      roleName: 'admin',
    },
    {
      email: 'manager@aman-erp.com',
      name: 'General Manager',
      nameAr: 'المدير العام',
      roleName: 'manager',
    },
    {
      email: 'accountant@aman-erp.com',
      name: 'Lead Accountant',
      nameAr: 'كبير المحاسبين',
      roleName: 'accountant',
    },
    {
      email: 'cashier@aman-erp.com',
      name: 'Terminal Cashier',
      nameAr: 'صراف الصندوق',
      roleName: 'cashier',
    },
  ];

  for (const u of defaultUsers) {
    const role = allRoles.find(r => r.name === u.roleName);
    if (!role) {
      console.log(`  ⚠️ Role "${u.roleName}" not found. Skipping user.`);
      continue;
    }
    
    await prisma.user.upsert({
      where: { email: u.email },
      update: { roleId: role.id },
      create: {
        name: u.name,
        nameAr: u.nameAr,
        email: u.email,
        passwordHash,
        roleId: role.id,
        isActive: true,
        preferredLang: 'en',
      },
    });
    console.log(`  ✅ User created: ${u.email} / Admin@1234 (${u.roleName})`);
  }

  // ── 4. Default settings ────────────────────────────────────────
  console.log('  Inserting default settings...');
  const defaultSettings = [
    { key: 'company_name',     value: 'Aman ERP',  type: 'string', group: 'general' },
    { key: 'company_name_ar',  value: 'أمان ERP',  type: 'string', group: 'general' },
    { key: 'base_currency',    value: 'USD',        type: 'string', group: 'general' },
    { key: 'default_language', value: 'en',         type: 'string', group: 'general' },
    { key: 'fiscal_year_start',value: '01-01',      type: 'string', group: 'accounting' },
    { key: 'tax_label',        value: 'VAT',        type: 'string', group: 'tax' },
    { key: 'default_tax_rate', value: '15',         type: 'number', group: 'tax' },
  ];
  for (const s of defaultSettings) {
    await prisma.setting.upsert({ where: { key: s.key }, update: s, create: s });
  }
  
  // ── 5. Phase 2 singletons ──────────────────────────────────────
  const sysConfig = await prisma.systemSetting.findFirst();
  if (!sysConfig) {
    await prisma.systemSetting.create({
      data: {
        defaultPricingStrategy: 'Average',
        allowNegativeStock: false,
        lowStockThresholdDefault: 10,
        currency: 'USD',
        taxPercentage: 15.00,
        enableBarcodeScanning: true,
        enableWholesalePricing: true
      }
    });
  }

  const compConfig = await prisma.companySetting.findFirst();
  if (!compConfig) {
    await prisma.companySetting.create({
      data: {
        companyName: 'Aman ERP',
        currency: 'USD',
        theme: 'dark',
        primaryColor: '#6366f1',
        secondaryColor: '#8b5cf6'
      }
    });
  }

  // ── 6. Default Expense Categories ──────────────────────────────
  console.log('  Inserting default expense categories...');
  for (const cat of EXPENSE_CATEGORIES) {
    await prisma.expenseCategory.upsert({
      where: { name: cat.name },
      update: cat,
      create: cat,
    });
  }
  console.log(`  ✅ ${EXPENSE_CATEGORIES.length} expense categories verified`);

  console.log('  ✅ System and Company configurations verified');

  console.log('\n🎉 Seed complete!');
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
