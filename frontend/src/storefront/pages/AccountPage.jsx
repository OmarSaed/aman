import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { storefrontApi } from '../api';
import { useCustomerStore } from '../customer.store';
import { useStorefront } from '../StorefrontLayout';
import { formatMoney } from '../utils';

export default function AccountPage() {
  const { t } = useTranslation('storefront');
  const { currency } = useStorefront();
  const customer = useCustomerStore((s) => s.customer);
  const isAuthenticated = useCustomerStore((s) => s.isAuthenticated);
  const updateCustomer = useCustomerStore((s) => s.updateCustomer);
  const logout = useCustomerStore((s) => s.logout);
  const [orders, setOrders] = useState([]);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    storefrontApi.myOrders().then(setOrders).catch(() => setOrders([]));
    storefrontApi.me().then(updateCustomer).catch(() => {});
  }, [isAuthenticated, updateCustomer]);

  if (!isAuthenticated) return <Navigate to="/account/login" replace />;

  const pending = customer?.requestedType === 'WHOLESALE' && customer?.type !== 'WHOLESALE' && customer?.accountStatus === 'PENDING';
  const wholesale = customer?.type === 'WHOLESALE';

  const requestWholesale = async () => {
    setRequesting(true);
    try {
      const updated = await storefrontApi.updateMe({ requestWholesale: true });
      updateCustomer(updated);
      toast.success(t('account.requestSent'));
    } catch (error) {
      toast.error(error.response?.data?.message || t('account.requestFailed'));
    } finally {
      setRequesting(false);
    }
  };

  const signOut = async () => {
    await storefrontApi.logout();
    logout();
  };

  return (
    <div className="sf-page">
      <div className="sf-kicker">{t('account.kicker')}</div>
      <h1 className="sf-page-title">{customer?.name}</h1>
      <p className="sf-lede">
        {wholesale ? t('account.wholesaleActive') : pending ? t('account.pendingBanner') : t('account.retailActive')}
      </p>
      <div className="sf-actions" style={{ margin: '1.4rem 0 2.4rem' }}>
        {!wholesale && !pending && (
          <button type="button" className="sf-btn" onClick={requestWholesale} disabled={requesting}>
            {t('account.requestWholesale')}
          </button>
        )}
        <button type="button" className="sf-btn ghost" onClick={signOut}>{t('account.signOut')}</button>
      </div>
      <div className="sf-kicker">{t('account.orders')}</div>
      {orders.length === 0 && <p className="sf-lede">{t('account.noOrders')}</p>}
      <div className="sf-dept-list">
        {orders.map((order) => (
          <div className="sf-dept-row" key={order.id}>
            <span className="sf-index">{order.status}</span>
            <strong>{order.orderNumber}</strong>
            <em>{new Date(order.createdAt).toLocaleDateString()}</em>
            <span>{formatMoney(order.netAmount, order.currency || currency)}</span>
          </div>
        ))}
      </div>
      <p style={{ marginTop: '2rem' }}><Link to="/catalog">{t('cart.continue')}</Link></p>
    </div>
  );
}
