// frontend/src/App.jsx
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './features/auth/ProtectedRoute';
import RoleRouter     from './components/layout/RoleRouter';
import LoginPage      from './features/auth/LoginPage';
import UsersPage      from './features/users/UsersPage';
import RolesPage      from './features/roles/RolesPage';
import AdminDashboard     from './features/dashboard/AdminDashboard';
import ManagerDashboard   from './features/dashboard/ManagerDashboard';
import AccountantDashboard from './features/dashboard/AccountantDashboard';
import POSScreen      from './features/pos/POSScreen';
import SettingsPage   from './features/settings/SettingsPage';
import ProductsPage   from './features/products/ProductsPage';
import InventoryPage  from './features/inventory/InventoryPage';
import SuppliersPage  from './features/suppliers/SuppliersPage';
import SupplierAccountPage from './features/suppliers/SupplierAccountPage';
import PurchaseOrdersPage from './features/suppliers/PurchaseOrdersPage';
import PurchaseOrderFormPage from './features/suppliers/PurchaseOrderFormPage';
import MediaPage          from './features/media/MediaPage';
import CustomersPage      from './features/customers/CustomersPage';
import CustomerAccountPage from './features/customers/CustomerAccountPage';
import ExpensesPage        from './features/expenses/ExpensesPage';
import PaymentsPage        from './features/accounting/PaymentsPage';
import SalesOrdersPage    from './features/sales/SalesOrdersPage';
import React, { lazy, Suspense } from 'react';
const SalesOrderFormPage = lazy(() => import('./features/sales/SalesOrderFormPage'));
const SalesOrderViewPage = lazy(() => import('./features/sales/SalesOrderViewPage'));
const ProductFormPage = lazy(() => import('./features/products/ProductFormPage'));
import DayboxPage         from './features/cashier/DayboxPage';
import ReportsPage        from './features/reports/ReportsPage';
import LowStockReport     from './features/reports/LowStockReport';
import useAuthStore       from './store/auth.store';
import StorefrontLayout   from './storefront/StorefrontLayout';
import HomePage           from './storefront/pages/HomePage';
import CatalogPage        from './storefront/pages/CatalogPage';
import CategoriesPage     from './storefront/pages/CategoriesPage';
import CategoryPage       from './storefront/pages/CategoryPage';
import ProductPage        from './storefront/pages/ProductPage';
import CartPage           from './storefront/pages/CartPage';
import CheckoutPage       from './storefront/pages/CheckoutPage';
import OrderReceivedPage  from './storefront/pages/OrderReceivedPage';
import AccountLoginPage   from './storefront/pages/AccountLoginPage';
import AccountRegisterPage from './storefront/pages/AccountRegisterPage';
import AccountPage        from './storefront/pages/AccountPage';

const DashboardRouter = () => {
  const { user } = useAuthStore();
  const role = user?.role?.name;
  if (role === 'admin')      return <AdminDashboard />;
  if (role === 'manager')    return <ManagerDashboard />;
  if (role === 'accountant') return <AccountantDashboard />;
  return <AdminDashboard />;
};

export default function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
    <Routes>
      <Route element={<StorefrontLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/catalog" element={<CatalogPage />} />
        <Route path="/categories" element={<CategoriesPage />} />
        <Route path="/categories/:id" element={<CategoryPage />} />
        <Route path="/product/:id" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/order-received" element={<OrderReceivedPage />} />
        <Route path="/account/login" element={<AccountLoginPage />} />
        <Route path="/account/register" element={<AccountRegisterPage />} />
        <Route path="/account" element={<AccountPage />} />
      </Route>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<RoleRouter />}>
          <Route path="/dashboard" element={<DashboardRouter />} />
          <Route path="/users"     element={<UsersPage />} />
          <Route path="/roles"     element={<RolesPage />} />
          <Route path="/settings"  element={<SettingsPage />} />
          <Route path="/products"  element={<ProductsPage />} />
          <Route path="/products/new" element={<ProductFormPage />} />
          <Route path="/products/:id/edit" element={<ProductFormPage />} />
          <Route path="/inventory" element={<InventoryPage />} />
          <Route path="/vendors"   element={<SuppliersPage />} />
          <Route path="/vendors/:id/account" element={<SupplierAccountPage />} />
          <Route path="/orders"    element={<PurchaseOrdersPage />} />
          <Route path="/orders/new" element={<PurchaseOrderFormPage />} />
          <Route path="/orders/:id/edit" element={<PurchaseOrderFormPage />} />
          <Route path="/media"     element={<MediaPage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:id/account" element={<CustomerAccountPage />} />
          <Route path="/expenses"  element={<ExpensesPage />} />
          <Route path="/payments"  element={<PaymentsPage />} />
          <Route path="/sales"     element={<SalesOrdersPage />} />
          <Route path="/sales/new" element={<SalesOrderFormPage />} />
          <Route path="/sales/:id/edit" element={<SalesOrderFormPage />} />
          <Route path="/sales/:id/view" element={<SalesOrderViewPage />} />
          <Route path="/daybox"    element={<DayboxPage />} />
          <Route path="/pos"       element={<POSScreen />} />
          <Route path="/reports"   element={<ReportsPage />} />
          <Route path="/reports/low-stock" element={<LowStockReport />} />
          <Route path="*"          element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
    </Suspense>
  );
}
