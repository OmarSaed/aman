import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { storefrontApi } from '../api';
import { useStorefront } from '../StorefrontLayout';
import { useCustomerStore } from '../customer.store';
import ProductTile from '../components/ProductTile';

export default function CatalogPage() {
  const { t } = useTranslation('storefront');
  const { categories, currency } = useStorefront();
  const pricingKey = useCustomerStore((s) => `${s.customer?.id || 'guest'}:${s.customer?.type || 'NORMAL'}`);
  const [params, setParams] = useSearchParams();
  const search = params.get('q') || '';
  const categoryId = params.get('category') || '';
  const page = Number(params.get('page') || 1);
  const [products, setProducts] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let live = true;
    setLoading(true);
    storefrontApi.getProducts({
      page,
      limit: 18,
      search: search || undefined,
      categoryId: categoryId || undefined,
    }).then((res) => {
      if (!live) return;
      setProducts(res.data || []);
      setPagination(res.pagination);
    }).catch(() => {
      if (live) setProducts([]);
    }).finally(() => {
      if (live) setLoading(false);
    });
    return () => { live = false; };
  }, [search, categoryId, page, pricingKey]);

  const update = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    if (!patch.page) next.delete('page');
    setParams(next);
  };

  return (
    <div className="sf-page">
      <div className="sf-kicker">{t('catalog.kicker')}</div>
      <h1 className="sf-page-title">{t('catalog.title')}</h1>
      <div className="sf-toolbar">
        <div className="sf-chips">
          <button type="button" className={`sf-chip ${!categoryId ? 'is-on' : ''}`} onClick={() => update({ category: '' })}>
            {t('home.viewAll')}
          </button>
          {categories.map((category) => (
            <button
              type="button"
              key={category.id}
              className={`sf-chip ${categoryId === category.id ? 'is-on' : ''}`}
              onClick={() => update({ category: category.id })}
            >
              {category.name}
            </button>
          ))}
        </div>
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
      {pagination && pagination.totalPages > 1 && (
        <div className="sf-pager">
          <button type="button" className="sf-nav-btn" disabled={!pagination.hasPrev} onClick={() => update({ page: String(page - 1) })}>
            ←
          </button>
          <button type="button" className="sf-nav-btn" disabled={!pagination.hasNext} onClick={() => update({ page: String(page + 1) })}>
            →
          </button>
        </div>
      )}
    </div>
  );
}
