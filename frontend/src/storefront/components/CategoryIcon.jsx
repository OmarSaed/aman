import { Link } from 'react-router-dom';
import { getCategoryStyle } from '../categoryIcons';

export default function CategoryIcon({ category, index = 0, compact = false }) {
  const { Icon, palette } = getCategoryStyle(category.name, index);
  return (
    <Link className={`af-cat ${compact ? 'is-compact' : ''}`} to={`/categories/${category.id}`}>
      <span
        className="af-cat-icon"
        style={{ background: `linear-gradient(145deg, ${palette[0]}, ${palette[1]})` }}
      >
        <Icon size={compact ? 22 : 26} strokeWidth={1.8} />
      </span>
      <b>{category.name}</b>
      {typeof category.productCount === 'number' && !compact && (
        <small>{category.productCount}</small>
      )}
    </Link>
  );
}
