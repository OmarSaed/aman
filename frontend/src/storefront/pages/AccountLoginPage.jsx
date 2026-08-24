import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { storefrontApi } from '../api';
import { useCustomerStore } from '../customer.store';

export default function AccountLoginPage() {
  const { t } = useTranslation('storefront');
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useCustomerStore((s) => s.isAuthenticated);
  const setSession = useCustomerStore((s) => s.setSession);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sending, setSending] = useState(false);

  if (isAuthenticated) return <Navigate to={location.state?.from || '/account'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const session = await storefrontApi.login({ email, password });
      setSession(session);
      toast.success(t('account.signedIn'));
      navigate(location.state?.from || '/account', { replace: true });
    } catch (error) {
      toast.error(error.response?.data?.message || t('account.loginFailed'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="sf-page">
      <div className="sf-kicker">{t('account.kicker')}</div>
      <h1 className="sf-page-title">{t('account.loginTitle')}</h1>
      <p className="sf-lede">{t('account.loginHint')}</p>
      <form className="sf-form" style={{ maxWidth: 420, marginTop: '2rem' }} onSubmit={submit}>
        <label>
          {t('checkout.email')}
          <input className="sf-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          {t('account.password')}
          <input className="sf-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit" className="sf-btn" disabled={sending}>
          {sending ? t('account.signingIn') : t('account.signIn')}
        </button>
      </form>
      <p style={{ marginTop: '1.6rem' }}>
        <Link to="/account/register">{t('account.needAccount')}</Link>
      </p>
    </div>
  );
}
