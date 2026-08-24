import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { storefrontApi } from '../api';
import { useCartStore } from '../cart.store';
import { useCustomerStore } from '../customer.store';
import { useStorefront } from '../StorefrontLayout';
import { formatMoney } from '../utils';

export default function CheckoutPage() {
  const { t } = useTranslation('storefront');
  const { currency } = useStorefront();
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const clear = useCartStore((s) => s.clear);
  const subtotal = useCartStore((s) => s.subtotal());
  const customer = useCustomerStore((s) => s.customer);
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    name: '',
    company: '',
    phone: '',
    email: '',
    address: '',
    notes: '',
  });

  useEffect(() => {
    if (!customer) return;
    setForm((prev) => ({
      ...prev,
      name: prev.name || customer.name || '',
      company: prev.company || customer.companyName || '',
      phone: prev.phone || customer.phone || '',
      email: prev.email || customer.email || '',
      address: prev.address || customer.address || '',
    }));
  }, [customer]);

  useEffect(() => {
    if (items.length === 0) navigate('/cart', { replace: true });
  }, [items.length, navigate]);

  if (items.length === 0) return null;

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error(t('checkout.required'));
      return;
    }
    setSending(true);
    try {
      const order = await storefrontApi.createOrder({
        customer: {
          name: form.name.trim(),
          company: form.company.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          address: form.address.trim(),
        },
        notes: form.notes.trim(),
        currency,
        items: items.map((item) => ({
          productId: item.id,
          quantity: item.quantity,
        })),
      });
      clear();
      navigate('/order-received', { state: { order } });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Order could not be sent');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="sf-page">
      <div className="sf-kicker">{t('checkout.kicker')}</div>
      <h1 className="sf-page-title">{t('checkout.title')}</h1>
      <p className="sf-lede">{t('checkout.hint')}</p>
      {customer?.type === 'WHOLESALE' && <p className="sf-lede">{t('account.wholesaleCheckout')}</p>}
      <div className="sf-sheet" style={{ marginTop: '2.4rem' }}>
        <form className="sf-form" onSubmit={submit}>
          <label>
            {t('checkout.name')} *
            <input className="sf-input" value={form.name} onChange={set('name')} required />
          </label>
          <label>
            {t('checkout.company')}
            <input className="sf-input" value={form.company} onChange={set('company')} />
          </label>
          <label>
            {t('checkout.phone')} *
            <input className="sf-input" value={form.phone} onChange={set('phone')} required />
          </label>
          <label>
            {t('checkout.email')}
            <input className="sf-input" type="email" value={form.email} onChange={set('email')} />
          </label>
          <label>
            {t('checkout.address')}
            <textarea rows={3} value={form.address} onChange={set('address')} />
          </label>
          <label>
            {t('checkout.notes')}
            <textarea rows={4} value={form.notes} onChange={set('notes')} />
          </label>
          <button type="submit" className="sf-btn" disabled={sending}>
            {sending ? t('checkout.sending') : t('checkout.submit')}
          </button>
        </form>
        <aside className="sf-aside">
          <div className="sf-kicker">{t('checkout.summary')}</div>
          {items.map((item) => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', padding: '0.7rem 0', borderBottom: '1px solid var(--line-dark)' }}>
              <span>{item.name} × {item.quantity}</span>
              <strong>{formatMoney(item.price * item.quantity, currency)}</strong>
            </div>
          ))}
          <h2 className="sf-price" style={{ fontSize: '2rem', fontFamily: 'var(--display)' }}>
            {formatMoney(subtotal, currency)}
          </h2>
          <Link className="sf-chip" to="/cart" style={{ marginTop: '1rem', display: 'inline-flex' }}>{t('cart.continue')}</Link>
        </aside>
      </div>
    </div>
  );
}
