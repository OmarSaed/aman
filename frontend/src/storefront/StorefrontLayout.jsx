import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, LayoutGrid, ShoppingBag, User, Search, Heart, MapPin, Menu, Phone, Mail, ArrowLeftRight, ChevronUp } from 'lucide-react';
import { storefrontApi } from './api';
import { useCartStore } from './cart.store';
import { useCustomerStore } from './customer.store';
import { formatMoney } from './utils';
import './storefront.css';

const StorefrontContext = createContext({
  company: null,
  categories: [],
  currency: 'USD',
});

export const useStorefront = () => useContext(StorefrontContext);

export default function StorefrontLayout() {
  const { t, i18n } = useTranslation('storefront');
  const location = useLocation();
  const navigate = useNavigate();
  const items = useCartStore((s) => s.items);
  const cartCount = items.reduce((sum, row) => sum + row.quantity, 0);
  const cartTotal = items.reduce((sum, row) => sum + Number(row.price) * row.quantity, 0);
  const customer = useCustomerStore((s) => s.customer);
  const customerAuthed = useCustomerStore((s) => s.isAuthenticated);
  const [company, setCompany] = useState(null);
  const [categories, setCategories] = useState([]);
  const [query, setQuery] = useState('');
  const [searchCategory, setSearchCategory] = useState('');

  useEffect(() => {
    document.documentElement.classList.add('sf-root');
    document.title = 'AF Wholesale';
    return () => document.documentElement.classList.remove('sf-root');
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (location.pathname === '/catalog' || location.pathname === '/') {
      setQuery(params.get('q') || '');
      setSearchCategory(params.get('category') || '');
    }
  }, [location.pathname, location.search]);

  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [companyData, categoryData] = await Promise.all([
          storefrontApi.getCompany(),
          storefrontApi.getCategories(),
        ]);
        if (!live) return;
        setCompany(companyData);
        setCategories(Array.isArray(categoryData) ? categoryData : []);
      } catch {
        if (live) setCategories([]);
      }
    })();
    return () => { live = false; };
  }, []);

  useEffect(() => {
    const cartItems = useCartStore.getState().items;
    if (!cartItems.length) return;
    Promise.all(cartItems.map((row) => storefrontApi.getProduct(row.id).catch(() => null)))
      .then((products) => useCartStore.getState().syncPricing(products.filter(Boolean)));
  }, [customer?.id, customer?.type]);

  const value = useMemo(() => ({
    company,
    categories,
    currency: company?.currency || 'USD',
  }), [company, categories]);

  const pending = customer?.requestedType === 'WHOLESALE' && customer?.type !== 'WHOLESALE' && customer?.accountStatus === 'PENDING';

  const submitSearch = (e) => {
    e.preventDefault();
    const next = new URLSearchParams();
    if (query.trim()) next.set('q', query.trim());
    if (searchCategory) next.set('category', searchCategory);
    navigate(`/catalog${next.toString() ? `?${next}` : ''}`);
  };

  const accountTo = customerAuthed ? '/account' : '/account/login';
  const currency = company?.currency || 'USD';

  return (
    <StorefrontContext.Provider value={value}>
      <div className="sf">
        <div className="um-top">
          <div className="um-wrap">
            <div className="um-top-left">
              <span className="um-top-item um-top-hide">
                <span className="um-top-icon"><MapPin size={14} /></span>
                {t('header.location')}
              </span>
              <span className="um-top-item um-top-hide">
                <span className="um-top-icon">$</span>
                {currency}
              </span>
              <button type="button" className="um-top-item" onClick={() => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')}>
                <span className="um-top-icon">🌐</span>
                {i18n.language === 'ar' ? 'العربية' : 'English'}
              </button>
            </div>
            <div className="um-trending">
              <b>{t('header.trending')}</b>
              {t('header.trendingBody')}
            </div>
            <div className="um-top-right">
              {t('header.contact')} <strong>{company?.phoneNumber || '+800 300-353'}</strong>
            </div>
          </div>
        </div>

        <div className="um-sticky">
        <header className="um-header">
          <div className="um-wrap">
            <div className="um-header-row">
              <Link className="um-logo" to="/">
                <b>AF</b>
                <span>
                  <strong>AF Wholesale</strong>
                  <small>{t('hero.kicker')}</small>
                </span>
              </Link>

              <form className="um-search" onSubmit={submitSearch}>
                <select
                  value={searchCategory}
                  onChange={(e) => setSearchCategory(e.target.value)}
                  aria-label={t('nav.categories')}
                >
                  <option value="">{t('header.allCategories')}</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('catalog.search')}
                />
                <button type="submit" className="um-search-btn" aria-label={t('catalog.search')}>
                  <Search size={20} strokeWidth={2.2} />
                </button>
              </form>

              <div className="um-head-actions">
                <Link className="um-head-link um-top-hide" to="/catalog" aria-label="Compare">
                  <span className="um-icon-ring"><ArrowLeftRight size={20} strokeWidth={1.8} /></span>
                </Link>
                <Link className="um-head-link um-top-hide" to="/catalog" aria-label="Wishlist">
                  <span className="um-icon-ring"><Heart size={20} strokeWidth={1.8} /></span>
                </Link>
                <Link className="um-head-link" to={accountTo}>
                  <span className="um-icon-ring"><User size={20} strokeWidth={1.8} /></span>
                  <span className="um-head-copy">
                    <strong>{customerAuthed ? t('nav.account') : t('nav.signIn')}</strong>
                    <small>{t('header.accessAccount')}</small>
                  </span>
                </Link>
                <Link className="um-head-link" to="/cart">
                  <span className="um-icon-ring">
                    <ShoppingBag size={20} strokeWidth={1.8} />
                    {cartCount > 0 && <i className="um-cart-count">{cartCount}</i>}
                  </span>
                  <span className="um-head-copy">
                    <strong>{t('header.totalCart')}</strong>
                    <small>{formatMoney(cartTotal, currency)}</small>
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </header>

        <div className="um-menubar">
          <div className="um-wrap">
            <nav className="um-nav">
              <NavLink to="/" end className={({ isActive }) => isActive ? 'is-active' : ''}>{t('nav.house')}</NavLink>
              <NavLink to="/catalog" className={({ isActive }) => isActive ? 'is-active' : ''}>{t('nav.catalog')}</NavLink>
              <NavLink to="/categories" className={({ isActive }) => isActive ? 'is-active' : ''}>{t('nav.categories')}</NavLink>
              <NavLink to={accountTo}>{t('nav.account')}</NavLink>
            </nav>
            <Link className="um-allcat" to="/categories">
              <Menu size={18} />
              {t('header.allCategories')}
            </Link>
          </div>
        </div>
        </div>

        {pending && <div className="um-note">{t('account.pendingBanner')}</div>}
        {customer?.type === 'WHOLESALE' && <div className="um-note ok">{t('account.wholesaleActive')}</div>}

        <main className="af-main">
          <Outlet />
        </main>

        <footer className="um-footer">
          <div className="um-wrap um-footer-main">
            <div className="um-footer-col">
              <h4>{t('footer.contact')}</h4>
              <div className="um-contact-pills">
                <a className="um-contact-pill" href={`tel:${company?.phoneNumber || ''}`}>
                  <span className="um-contact-icon"><Phone size={18} /></span>
                  <span>
                    <small>{t('footer.hours')}</small>
                    <strong>{company?.phoneNumber || '+800 300-353'}</strong>
                  </span>
                </a>
                <a className="um-contact-pill" href={`mailto:${company?.email || ''}`}>
                  <span className="um-contact-icon"><Mail size={18} /></span>
                  <span>
                    <small>{t('footer.hours')}</small>
                    <strong>{company?.email || 'info@afwholesale.com'}</strong>
                  </span>
                </a>
                <div className="um-contact-pill">
                  <span className="um-contact-icon"><MapPin size={18} /></span>
                  <span>
                    <small>{t('footer.hours')}</small>
                    <strong>{company?.address || t('footer.findStores')}</strong>
                  </span>
                </div>
              </div>
            </div>
            <div className="um-footer-col">
              <h4>{t('footer.help')}</h4>
              <Link to={accountTo}>{t('footer.accountInfo')}</Link>
              <Link to="/account">{t('footer.yourOrders')}</Link>
              <Link to="/catalog">{t('footer.returns')}</Link>
              <Link to="/login">{t('footer.staffLogin')}</Link>
              <Link to="/account/register">{t('hero.tradeCta')}</Link>
            </div>
            <div className="um-footer-col">
              <h4>{t('footer.partner')}</h4>
              <Link to="/account/register">{t('footer.becomeVendor')}</Link>
              <Link to="/catalog">{t('footer.advertise')}</Link>
              <Link to="/categories">{t('nav.categories')}</Link>
            </div>
            <div className="um-footer-visual" aria-hidden />
          </div>
          <div className="um-wrap um-footer-bar">
            <span className="um-footer-copy">
              © {new Date().getFullYear()} AF Wholesale. {t('footer.rights')}
            </span>
            <div className="um-pay-badges">
              {['VISA', 'MC', 'AMEX', 'JCB', 'DISC', 'DIN', 'UP'].map((b) => (
                <span key={b} className="um-pay-badge">{b}</span>
              ))}
            </div>
            <div className="um-footer-legal">
              <Link to="/catalog">{t('footer.refund')}</Link>
              <Link to="/catalog">{t('footer.privacy')}</Link>
              <Link to="/catalog">{t('footer.terms')}</Link>
            </div>
          </div>
        </footer>

        <button
          type="button"
          className="um-back-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Back to top"
        >
          <ChevronUp size={20} />
        </button>

        <nav className="af-dock">
          <NavLink to="/" end className={({ isActive }) => isActive ? 'is-active' : ''}>
            <Home size={20} />
            {t('nav.house')}
          </NavLink>
          <NavLink to="/catalog" className={({ isActive }) => isActive ? 'is-active' : ''}>
            <Search size={20} />
            {t('nav.catalog')}
          </NavLink>
          <NavLink to="/categories" className={({ isActive }) => isActive ? 'is-active' : ''}>
            <LayoutGrid size={20} />
            {t('nav.categories')}
          </NavLink>
          <NavLink to="/cart" className={({ isActive }) => isActive ? 'is-active' : ''}>
            <ShoppingBag size={20} />
            {t('nav.cart')}
            {cartCount > 0 && <span className="af-badge">{cartCount}</span>}
          </NavLink>
          <NavLink to={accountTo} className={({ isActive }) => isActive ? 'is-active' : ''}>
            <User size={20} />
            {t('nav.account')}
          </NavLink>
        </nav>
      </div>
    </StorefrontContext.Provider>
  );
}
