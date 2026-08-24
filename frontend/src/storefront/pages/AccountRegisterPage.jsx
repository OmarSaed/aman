import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { storefrontApi } from '../api';
import { useCustomerStore } from '../customer.store';

export default function AccountRegisterPage() {
  const { t } = useTranslation('storefront');
  const navigate = useNavigate();
  const isAuthenticated = useCustomerStore((s) => s.isAuthenticated);
  const setSession = useCustomerStore((s) => s.setSession);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    company: '',
    address: '',
    type: 'NORMAL',
  });

  if (isAuthenticated) return <Navigate to="/account" replace />;

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const session = await storefrontApi.register(form);
      setSession(session);
      toast.success(form.type === 'WHOLESALE' ? t('account.registeredPending') : t('account.registered'));
      navigate('/account', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || t('account.registerFailed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="sf-page">
      <div className="sf-kicker">{t('account.kicker')}</div>
      <h1 className="sf-page-title">{t('account.registerTitle')}</h1>
      <p className="sf-lede">{t('account.registerHint')}</p>
      <form className="sf-form" style={{ maxWidth: 560, marginTop: '2rem' }} onSubmit={submit}>
        <div className="sf-account-types">
          <button type="button" className={`sf-chip ${form.type === 'NORMAL' ? 'is-on' : ''}`} onClick={() => setForm((p) => ({ ...p, type: 'NORMAL' }))}>
            {t('account.retailer')}
          </button>
          <button type="button" className={`sf-chip ${form.type === 'WHOLESALE' ? 'is-on' : ''}`} onClick={() => setForm((p) => ({ ...p, type: 'WHOLESALE' }))}>
            {t('account.wholesale')}
          </button>
        </div>
        {form.type === 'WHOLESALE' && <p className="sf-lede">{t('account.wholesaleNeedsApproval')}</p>}
        <label>
          {t('checkout.name')} *
          <input className="sf-input" value={form.name} onChange={set('name')} required />
        </label>
        <label>
          {t('checkout.email')} *
          <input className="sf-input" type="email" value={form.email} onChange={set('email')} required />
        </label>
        <label>
          {t('account.password')} *
          <input className="sf-input" type="password" value={form.password} onChange={set('password')} minLength={6} required />
        </label>
        <label>
          {t('checkout.phone')}
          <input className="sf-input" value={form.phone} onChange={set('phone')} />
        </label>
        <label>
          {t('checkout.company')}
          <input className="sf-input" value={form.company} onChange={set('company')} />
        </label>
        <label>
          {t('checkout.address')}
          <textarea rows={3} value={form.address} onChange={set('address')} />
        </label>
        <button type="submit" className="sf-btn" disabled={sending}>
          {sending ? t('account.creating') : t('account.create')}
        </button>
      </form>
      <p style={{ marginTop: '1.6rem' }}>
        <Link to="/account/login">{t('account.haveAccount')}</Link>
      </p>
    </div>
  );
}
