import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { ShoppingBag } from 'lucide-react';
import { formatMoney, mediaUrl } from '../utils';
import { useCartStore } from '../cart.store';
import ProductPlaceholder from './ProductPlaceholder';

export function ProductVisual({ product, className = '', badge, compact = false }) {
  const { t } = useTranslation('storefront');
  const [imgError, setImgError] = useState(false);
  const src = mediaUrl(product?.imageUrl);
  const showImage = Boolean(src) && !imgError;
  const badgeText = badge === 'new' ? t('home.newestBadge') : badge === 'sale' ? t('home.sale') : null;

  return (
    <div className={`sf-visual ${compact ? 'is-compact' : ''} ${className}`.trim()}>
      {badgeText && <span className={`um-badge ${badge === 'new' ? 'is-new' : 'is-sale'}`}>{badgeText}</span>}
      {showImage ? (
        <img
          src={src}
          alt={product?.name || ''}
          loading="lazy"
          onError={() => setImgError(true)}
        />
      ) : (
        <ProductPlaceholder product={product} compact={compact} />
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

  return (
    <article className="sf-tile">
      <Link to={`/product/${product.id}`} className="sf-tile-media">
        <ProductVisual product={product} badge={badge} />
        <span className="sf-tile-quick">{t('hero.shopNow')}</span>
      </Link>
      <div className="sf-tile-meta">
        <small>
          {product.category?.name || t('common.wholesale')}
          {product.boxQuantity > 1 ? ` · ${t('catalog.box', { count: product.boxQuantity })}` : ''}
        </small>
        <Link to={`/product/${product.id}`}>
          <h3>{product.name}</h3>
        </Link>
        <div className="sf-tile-foot">
          <div className="sf-price">{formatMoney(product.price, currency)}</div>
          <button type="button" className="um-add" onClick={add} aria-label={t('product.add')}>
            <ShoppingBag size={16} strokeWidth={2} />
            <span>{t('product.add')}</span>
          </button>
        </div>
      </div>
    </article>
  );
}
