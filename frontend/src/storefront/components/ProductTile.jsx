import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { formatMoney, mediaUrl } from '../utils';
import { useCartStore } from '../cart.store';

export function ProductVisual({ product, className = '', badge }) {
  const src = mediaUrl(product?.imageUrl);
  return (
    <div className={`sf-visual ${className}`.trim()}>
      {badge && <span className="um-badge">{badge}</span>}
      {src ? (
        <img src={src} alt={product?.name || ''} />
      ) : (
        <div className="sf-visual-fallback">{(product?.name || 'A').slice(0, 1)}</div>
      )}
    </div>
  );
}

export default function ProductTile({ product, currency, badge }) {
  const { t } = useTranslation('storefront');
  const addItem = useCartStore((s) => s.addItem);
  if (!product) return null;

  const add = (e) => {
    e.preventDefault();
    e.stopPropagation();
    addItem(product, product.boxQuantity || 1);
    toast.success(t('product.added'));
  };

  const label = badge === 'new' ? t('home.newestBadge') : t('home.sale');

  return (
    <article className="sf-tile">
      <Link to={`/product/${product.id}`}>
        <ProductVisual product={product} badge={label} />
      </Link>
      <div className="sf-tile-meta">
        <small>
          {product.category?.name || t('common.wholesale')}
          {product.boxQuantity > 1 ? ` · ${t('catalog.box', { count: product.boxQuantity })}` : ''}
        </small>
        <Link to={`/product/${product.id}`}>
          <h3>{product.name}</h3>
        </Link>
        <div className="sf-price">{formatMoney(product.price, currency)}</div>
        <button type="button" className="um-add" onClick={add}>
          {t('product.add')}
        </button>
      </div>
    </article>
  );
}
