import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { storefrontApi } from '../api';
import { useStorefront } from '../StorefrontLayout';
import { useCustomerStore } from '../customer.store';
import ProductTile from '../components/ProductTile';

export default function CategoryPage() {
  const { id } = useParams();
  const { t } = useTranslation('storefront');
  const { categories, currency } = useStorefront();
  const pricingKey = useCustomerStore((s) => `${s.customer?.id || 'guest'}:${s.customer?.type || 'NORMAL'}`);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const flatten = categories.flatMap((c) => [c, ...(c.children || [])]);
  const category = flatten.find((c) => c.id === id);

  useEffect(() => {
    let live = true;
    setLoading(true);
    storefrontApi.getProducts({ page: 1, limit: 48, categoryId: id }).then((res) => {
      if (live) setProducts(res.data || []);
    }).catch(() => {
      if (live) setProducts([]);
    }).finally(() => {
      if (live) setLoading(false);
    });
    return () => { live = false; };
  }, [id, pricingKey]);

  return (
    <div className="sf-page">
      <div className="sf-kicker">{t('categories.kicker')}</div>
      <h1 className="sf-page-title">{category?.name || t('nav.categories')}</h1>
      {category?.description && <p className="sf-lede">{category.description}</p>}
      <div className="sf-toolbar">
        <Link className="sf-chip" to="/categories">{t('nav.categories')}</Link>
      </div>
      {loading && <p className="sf-lede">{t('common.loading')}</p>}
      {!loading && products.length === 0 && (
        <div className="sf-empty">
          <h2>{t('catalog.empty')}</h2>
        </div>
      )}
      <div className="sf-catalog">
        {products.map((product) => (
          <ProductTile key={product.id} product={product} currency={currency} />
        ))}
      </div>
    </div>
  );
}
