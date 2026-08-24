import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCartStore } from '../cart.store';
import { useStorefront } from '../StorefrontLayout';
import { formatMoney } from '../utils';
import { ProductVisual } from '../components/ProductTile';

export default function CartPage() {
  const { t } = useTranslation('storefront');
  const { currency } = useStorefront();
  const items = useCartStore((s) => s.items);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const subtotal = useCartStore((s) => s.subtotal());

  if (items.length === 0) {
    return (
      <div className="sf-page">
        <div className="sf-empty">
          <div className="sf-kicker">{t('cart.kicker')}</div>
          <h2>{t('cart.empty')}</h2>
          <Link className="sf-btn" to="/catalog">{t('cart.emptyCta')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="sf-page">
      <div className="sf-kicker">{t('cart.kicker')}</div>
      <h1 className="sf-page-title">{t('cart.title')}</h1>
      <div className="sf-sheet">
        <div>
          {items.map((item) => (
            <div className="sf-line" key={item.id}>
              <ProductVisual product={item} />
              <div>
                <Link to={`/product/${item.id}`}><strong>{item.name}</strong></Link>
                <div className="sf-price">{formatMoney(item.price, currency)}</div>
                <div className="sf-qty" style={{ margin: '0.6rem 0 0' }}>
                  <span>{t('cart.qty')}</span>
                  <button type="button" onClick={() => setQuantity(item.id, item.quantity - (item.boxQuantity || 1))}>−</button>
                  <strong>{item.quantity}</strong>
                  <button type="button" onClick={() => setQuantity(item.id, item.quantity + (item.boxQuantity || 1))}>+</button>
                </div>
                <button type="button" className="sf-chip" onClick={() => removeItem(item.id)}>{t('cart.remove')}</button>
              </div>
              <strong>{formatMoney(item.price * item.quantity, currency)}</strong>
            </div>
          ))}
        </div>
        <aside className="sf-aside">
          <div className="sf-kicker">{t('cart.subtotal')}</div>
          <h2 className="sf-price" style={{ fontSize: '2.4rem', fontFamily: 'var(--display)' }}>
            {formatMoney(subtotal, currency)}
          </h2>
          <div className="sf-actions" style={{ marginTop: '1.4rem' }}>
            <Link className="sf-btn" to="/checkout">{t('cart.checkout')}</Link>
            <Link className="sf-btn ghost" to="/catalog">{t('cart.continue')}</Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
