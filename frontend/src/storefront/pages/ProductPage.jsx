import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { storefrontApi } from '../api';
import { useCartStore } from '../cart.store';
import { useStorefront } from '../StorefrontLayout';
import { useCustomerStore } from '../customer.store';
import { formatMoney, snapQuantity } from '../utils';
import ProductTile, { ProductVisual } from '../components/ProductTile';

export default function ProductPage() {
  const { id } = useParams();
  const { t } = useTranslation('storefront');
  const { currency } = useStorefront();
  const pricingKey = useCustomerStore((s) => `${s.customer?.id || 'guest'}:${s.customer?.type || 'NORMAL'}`);
  const addItem = useCartStore((s) => s.addItem);
  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    let live = true;
    setMissing(false);
    setProduct(null);
    storefrontApi.getProduct(id).then((data) => {
      if (!live) return;
      setProduct(data);
      setQty(data.boxQuantity || 1);
    }).catch(() => {
      if (live) setMissing(true);
    });
    return () => { live = false; };
  }, [id, pricingKey]);

  if (missing) {
    return (
      <div className="sf-page">
        <div className="sf-empty">
          <h2>{t('catalog.empty')}</h2>
          <Link className="sf-btn" to="/catalog">{t('product.back')}</Link>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="sf-page">
        <p className="sf-lede">{t('common.loading')}</p>
      </div>
    );
  }

  const box = product.boxQuantity || 1;
  const allocate = () => {
    addItem(product, qty);
    toast.success(t('product.added'));
  };

  return (
    <div className="sf-page">
      <Link to="/catalog" className="sf-kicker">{t('product.back')}</Link>
      <div className="sf-product" style={{ marginTop: '1.6rem' }}>
        <ProductVisual product={product} />
        <div className="sf-product-copy">
          <div className="sf-kicker">{product.category?.name || t('product.kicker')}</div>
          <h1 className="sf-page-title">{product.name}</h1>
          <div className="sf-price" style={{ fontSize: '1.4rem' }}>{formatMoney(product.price, currency)}</div>
          <p className="sf-lede">{product.longDescription || product.shortDescription}</p>
          <div className="sf-status" style={{ marginTop: '1rem' }}>
            {t('product.sku')} {product.sku}
          </div>
          <div className={`sf-status ${product.inStock ? '' : 'late'}`} style={{ marginTop: '0.5rem' }}>
            <i />
            {product.inStock ? t('product.inStock') : t('product.madeToOrder')}
          </div>
          {box > 1 && <p>{t('product.box', { count: box })}</p>}
          {product.pricingTier === 'WHOLESALE' && <div className="sf-status">{t('account.wholesalePrice')}</div>}
          <div className="sf-qty">
            <button type="button" onClick={() => setQty((n) => snapQuantity(n - box, box))}>−</button>
            <strong>{qty}</strong>
            <button type="button" onClick={() => setQty((n) => snapQuantity(n + box, box))}>+</button>
          </div>
          <button type="button" className="sf-btn" onClick={allocate} style={{ width: '100%' }}>{t('product.add')}</button>
        </div>
      </div>
      {(product.related || []).length > 0 && (
        <section className="um-section" style={{ paddingInline: 0 }}>
          <div className="um-head">
            <h2>{t('product.related')}</h2>
          </div>
          <div className="um-grid">
            {product.related.map((item) => (
              <ProductTile key={item.id} product={item} currency={currency} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
