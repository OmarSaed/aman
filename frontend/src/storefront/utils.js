export function mediaUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const api = import.meta.env.VITE_API_URL || '/api';
  if (path.startsWith('/uploads')) {
    return `${api.replace(/\/$/, '')}${path}`;
  }
  if (path.startsWith('/api')) return path;
  return `${api.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
}

export function formatMoney(value, currency = 'USD') {
  const amount = Number(value || 0);
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

export function snapQuantity(qty, box = 1) {
  const size = Math.max(1, Number(box) || 1);
  const n = Math.max(size, Number(qty) || size);
  return Math.ceil(n / size) * size;
}

export function padIndex(n) {
  return String(n).padStart(2, '0');
}
