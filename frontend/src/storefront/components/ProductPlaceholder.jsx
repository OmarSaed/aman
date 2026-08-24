import { ImageOff, Package } from 'lucide-react';

function hueFromName(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return Math.abs(hash) % 360;
}

export default function ProductPlaceholder({ product, compact = false }) {
  const hue = hueFromName(product?.name || product?.sku || 'af');
  const label = product?.category?.name || 'AF Wholesale';

  return (
    <div
      className={`sf-placeholder ${compact ? 'is-compact' : ''}`.trim()}
      style={{ '--ph-hue': hue }}
      aria-hidden
    >
      <div className="sf-placeholder-glow" />
      <div className="sf-placeholder-icon">
        {compact ? <Package size={22} strokeWidth={1.6} /> : <ImageOff size={36} strokeWidth={1.5} />}
      </div>
      {!compact && <span className="sf-placeholder-label">{label}</span>}
    </div>
  );
}
