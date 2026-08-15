// frontend/src/components/layout/Topbar.jsx
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';
import { Globe } from 'lucide-react';
import useAuthStore from '../../store/auth.store';

const ROUTE_TITLES = {
  '/dashboard': { en: 'Dashboard',          ar: 'لوحة التحكم' },
  '/users':     { en: 'User Management',    ar: 'إدارة المستخدمين' },
  '/roles':     { en: 'Roles & Permissions',ar: 'الأدوار والصلاحيات' },
  '/products':  { en: 'Products',           ar: 'المنتجات' },
  '/orders':    { en: 'Orders',             ar: 'الطلبات' },
  '/invoices':  { en: 'Invoices',           ar: 'الفواتير' },
  '/payments':  { en: 'Payments',           ar: 'المدفوعات' },
  '/customers': { en: 'Customers',          ar: 'العملاء' },
  '/vendors':   { en: 'Vendors',            ar: 'الموردون' },
  '/reports':   { en: 'Reports',            ar: 'التقارير' },
  '/settings':  { en: 'Settings',           ar: 'الإعدادات' },
  '/cashier':   { en: 'Cashier',            ar: 'الصندوق' },
  '/expenses':  { en: 'Expenses',           ar: 'المصروفات' },
  '/accounting':{ en: 'Accounting',         ar: 'المحاسبة' },
};

export default function Topbar() {
  const { i18n } = useTranslation();
  const location = useLocation();
  const { user }  = useAuthStore();
  const isAr = i18n.language === 'ar';

  const toggleLang = () => i18n.changeLanguage(isAr ? 'en' : 'ar');
  const titles = ROUTE_TITLES[location.pathname] || { en: 'Aman ERP', ar: 'أمان ERP' };

  return (
    <header className="topbar">
      <h1 className="topbar-title">{isAr ? titles.ar : titles.en}</h1>

      <div className="topbar-actions">
        {/* Language toggle */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={toggleLang}
          title="Switch language"
          style={{ gap: 6, fontWeight: 600, fontSize: 13 }}
        >
          <Globe size={15} />
          {isAr ? 'English' : 'العربية'}
        </button>

        {/* Greeting */}
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', paddingInlineStart: 8, borderInlineStart: '1px solid var(--border)' }}>
          {isAr ? `مرحباً، ${user?.nameAr || user?.name}` : `Hello, ${user?.name}`}
        </div>
      </div>
    </header>
  );
}
