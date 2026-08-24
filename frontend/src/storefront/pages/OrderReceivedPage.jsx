import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStorefront } from '../StorefrontLayout';
import { formatMoney } from '../utils';

export default function OrderReceivedPage() {
  const { t } = useTranslation('storefront');
  const { currency } = useStorefront();
  const order = useLocation().state?.order;

  return (
    <div className="sf-page">
      <div className="sf-received">
        <div className="sf-kicker">{t('received.kicker')}</div>
        <h1 className="sf-page-title">{t('received.title')}</h1>
        <p className="sf-lede">{t('received.body')}</p>
        {order && (
          <>
            <div className="sf-kicker" style={{ marginTop: '2rem' }}>{t('received.number')}</div>
            <code>{order.orderNumber}</code>
            <p className="sf-lede">
              {order.customer?.name} · {formatMoney(order.netAmount, order.currency || currency)}
            </p>
          </>
        )}
        <div className="sf-actions">
          <Link className="sf-btn" to="/">{t('received.again')}</Link>
        </div>
      </div>
    </div>
  );
}
