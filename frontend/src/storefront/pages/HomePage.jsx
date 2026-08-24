import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Headphones, RotateCcw, Ticket, Truck } from 'lucide-react';
import { storefrontApi } from '../api';
import { useStorefront } from '../StorefrontLayout';
import { useCustomerStore } from '../customer.store';
import { formatMoney } from '../utils';
import ProductTile from '../components/ProductTile';
import HeroSlider from '../components/HeroSlider';
import CategoryIcon from '../components/CategoryIcon';

export default function HomePage() {
  const { t } = useTranslation('storefront');
  const { categories, currency } = useStorefront();
  const pricingKey = useCustomerStore((s) => `${s.customer?.id || 'guest'}:${s.customer?.type || 'NORMAL'}`);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    let live = true;
    storefrontApi.getProducts({ page: 1, limit: 16 }).then((res) => {
      if (live) setProducts(res.data || []);
    }).catch(() => {});
    return () => { live = false; };
  }, [pricingKey]);

  const fromPrice = products.reduce((min, product) => {
    const price = Number(product.price);
    if (!Number.isFinite(price)) return min;
    return min == null || price < min ? price : min;
  }, null);

  const discover = products.slice(0, 8);
  const more = products.slice(8, 16);
  const devices = categories.slice(0, 12);

  return (
    <div className="um-wrap">
      <HeroSlider products={products} fromPrice={fromPrice} currency={currency} />

      <section className="um-section">
        <div className="um-head is-center">
          <h2>{t('home.devices')}</h2>
        </div>
        <div className="um-devices">
          {devices.map((category) => (
            <Link key={category.id} className="um-device" to={`/categories/${category.id}`}>
              {category.name}
            </Link>
          ))}
        </div>
      </section>

      <section className="um-section">
        <div className="um-head">
          <div>
            <p className="sf-kicker">{t('home.discoverKicker')}</p>
            <h2>{t('home.discover')}</h2>
          </div>
          <Link to="/catalog">{t('home.viewAll')}</Link>
        </div>
        <div className="um-grid">
          {discover.map((product) => (
            <ProductTile key={product.id} product={product} currency={currency} badge="sale" />
          ))}
        </div>
      </section>

      <div className="um-promos">
        <article className="um-promo um-promo-a">
          <span>{t('home.promoKicker')}</span>
          <h3>{t('home.promoTitle')}</h3>
          <Link to="/catalog">{t('hero.cta')}</Link>
        </article>
        <article className="um-promo um-promo-b">
          <span>{t('hero.tradeKicker')}</span>
          <h3>{t('hero.tradeTitle')}</h3>
          <Link to="/account/register">{t('hero.tradeCta')}</Link>
        </article>
      </div>

      <section className="um-section">
        <div className="um-head">
          <div>
            <h2>{t('home.departments')}</h2>
            <p>{t('home.departmentsHint')}</p>
          </div>
          <Link to="/categories">{t('home.viewAll')}</Link>
        </div>
        <div className="um-cats">
          {categories.map((category, i) => (
            <CategoryIcon key={category.id} category={category} index={i} />
          ))}
        </div>
      </section>

      {more.length > 0 && (
        <section className="um-section">
          <div className="um-head">
            <div>
              <p className="sf-kicker">{t('home.newestBadge')}</p>
              <h2>{t('home.newest')}</h2>
            </div>
            <Link to="/catalog">{t('home.viewAll')}</Link>
          </div>
          <div className="um-grid">
            {more.map((product) => (
              <ProductTile key={product.id} product={product} currency={currency} badge="new" />
            ))}
          </div>
        </section>
      )}

      <div className="um-marquee" aria-hidden>
        <div className="um-marquee-track">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i}>AF WHOLESALE — {t('footer.rights')}</span>
          ))}
        </div>
      </div>

      <section className="um-section">
        <div className="um-trust">
          <article>
            <Truck size={28} color="#2b59ff" />
            <div>
              <h4>{t('trust.ship')}</h4>
              <p>{t('trust.shipHint')}</p>
            </div>
          </article>
          <article>
            <Headphones size={28} color="#2b59ff" />
            <div>
              <h4>{t('trust.support')}</h4>
              <p>{t('trust.supportHint')}</p>
            </div>
          </article>
          <article>
            <RotateCcw size={28} color="#2b59ff" />
            <div>
              <h4>{t('trust.returns')}</h4>
              <p>{t('trust.returnsHint')}</p>
            </div>
          </article>
          <article>
            <Ticket size={28} color="#2b59ff" />
            <div>
              <h4>{t('trust.trade')}</h4>
              <p>{fromPrice != null ? t('trust.tradeHint', { price: formatMoney(fromPrice, currency) }) : t('hero.tradeBody')}</p>
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
