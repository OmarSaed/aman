// frontend/src/components/layout/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Users, Shield, BookOpen, Package,
  ShoppingCart, FileText, CreditCard, BarChart2, Settings,
  LogOut, Store, Users2, Truck, Receipt, Image, Plus
} from 'lucide-react';
import useAuthStore from '../../store/auth.store';
import Avatar from '../ui/Avatar';

const NAV_SECTIONS = [
  {
    label: null,
    items: [
      { key: 'dashboard', to: '/dashboard', icon: LayoutDashboard, label: 'nav.dashboard', always: true },
    ],
  },
  {
    label: 'Administration',
    labelAr: 'الإدارة',
    permissions: ['users:view', 'roles:view'],
    items: [
      { key: 'users', to: '/users', icon: Users,  label: 'nav.users',  permission: 'users:view' },
      { key: 'roles', to: '/roles', icon: Shield, label: 'nav.roles',  permission: 'roles:view' },
    ],
  },
  {
    label: 'Accounting',
    labelAr: 'المحاسبة',
    permissions: ['accounting:view'],
    items: [
      { key: 'payments',   to: '/payments', icon: CreditCard, label: 'nav.payments', permission: 'accounting:view' },
      { key: 'expenses',   to: '/expenses', icon: Receipt,  label: 'nav.expenses',  permission: 'expenses:view' },
    ],
  },
  {
    label: 'Sales',
    labelAr: 'المبيعات',
    items: [
      { key: 'sales',   to: '/sales',   icon: ShoppingCart, label: 'Sales Orders',  labelAr: 'أوامر البيع', end: true },
      { key: 'sales_new', to: '/sales/new', icon: Plus, label: 'New Order', labelAr: 'طلب جديد' },
    ],
  },
  {
    label: 'Inventory',
    labelAr: 'المستودع',
    permissions: ['inventory:view-products'],
    items: [
      { key: 'products', to: '/products', icon: Package,      label: 'Products', labelAr: 'المنتجات', permission: 'inventory:view-products', end: true },
      { key: 'orders',   to: '/orders',   icon: ShoppingCart, label: 'Purchase Orders', labelAr: 'أوامر الشراء', permission: 'orders:view-all', end: true },
    ],
  },
  {
    label: 'CRM',
    labelAr: 'إدارة العملاء',
    permissions: ['customers:view'],
    items: [
      { key: 'customers', to: '/customers', icon: Users2, label: 'nav.customers', permission: 'customers:view' },
      { key: 'vendors',   to: '/vendors',   icon: Truck,  label: 'Suppliers', labelAr: 'الموردين', permission: 'vendors:view' },
    ],
  },
  {
    label: 'Cashier',
    labelAr: 'الصندوق',
    permissions: ['cashier:view-sessions', 'pos:access'],
    items: [
      { key: 'pos',     to: '/pos',     icon: Store,        label: 'nav.pos',       permission: 'pos:access' },
      { key: 'daybox',  to: '/daybox',  icon: CreditCard, label: 'Daily Box', labelAr: 'يومية الصندوق', permission: 'cashier:view-sessions' },
    ],
  },
  {
    label: 'Analytics',
    labelAr: 'التقارير',
    items: [
      { key: 'reports', to: '/reports', icon: BarChart2, label: 'Reports', labelAr: 'التقارير' },
    ],
  },
  {
    label: 'System',
    labelAr: 'النظام',
    permissions: ['settings:view', 'inventory:view-products'],
    items: [
      { key: 'media', to: '/media', icon: Image, label: 'Media Library', labelAr: 'مكتبة الوسائط', permission: 'inventory:view-products' },
      { key: 'settings', to: '/settings', icon: Settings, label: 'nav.settings', permission: 'settings:view' },
    ],
  },
];

export default function Sidebar() {
  const { t, i18n } = useTranslation();
  const { user, hasPermission, logout } = useAuthStore();
  const navigate = useNavigate();
  const isAr = i18n.language === 'ar';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const visibleSections = NAV_SECTIONS.map(section => ({
    ...section,
    items: section.items.filter(item => item.always || !item.permission || hasPermission(item.permission)),
  })).filter(section => section.items.length > 0);

  const roleName = isAr
    ? (user?.role?.displayNameAr || user?.role?.displayName)
    : user?.role?.displayName;

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">A</div>
        <div className="sidebar-logo-text">
          <div className="sidebar-logo-name">{isAr ? 'أمان ERP' : 'Aman ERP'}</div>
          <div className="sidebar-logo-sub">{isAr ? 'نظام المؤسسات' : 'Enterprise System'}</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {visibleSections.map((section, si) => (
          <div key={si} className="sidebar-section">
            {section.label && (
              <div className="sidebar-section-label">
                {isAr ? section.labelAr : section.label}
              </div>
            )}
            {section.items.map(item => (
              <NavLink
                key={item.key}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `sidebar-item ${isActive ? 'active' : ''}`}
              >
                <item.icon className="sidebar-item-icon" size={17} />
                <span>{isAr ? (item.labelAr || t(item.label)) : (item.label.includes('nav.') ? t(item.label) : item.label)}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={handleLogout} title={t('auth.logout')}>
          <Avatar name={user?.name} size="sm" color={user?.role?.color} />
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{isAr ? (user?.nameAr || user?.name) : user?.name}</div>
            <div className="sidebar-user-role">{roleName}</div>
          </div>
          <LogOut size={15} style={{ color: 'var(--sidebar-text)', flexShrink: 0 }} />
        </div>
      </div>
    </aside>
  );
}
