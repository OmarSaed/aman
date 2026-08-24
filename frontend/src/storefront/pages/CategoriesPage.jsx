import { useTranslation } from 'react-i18next';
import { useStorefront } from '../StorefrontLayout';
import CategoryIcon from '../components/CategoryIcon';

export default function CategoriesPage() {
  const { t } = useTranslation('storefront');
  const { categories } = useStorefront();
  const all = categories.flatMap((c) => [c, ...(c.children || [])]);

  return (
    <div className="sf-page">
      <div className="sf-kicker">{t('categories.kicker')}</div>
      <h1 className="sf-page-title">{t('categories.title')}</h1>
      {all.length === 0 && (
        <div className="sf-empty">
          <h2>{t('categories.empty')}</h2>
        </div>
      )}
      <div className="af-cat-grid" style={{ marginTop: 16 }}>
        {all.map((category, i) => (
          <CategoryIcon key={category.id} category={category} index={i} />
        ))}
      </div>
    </div>
  );
}
