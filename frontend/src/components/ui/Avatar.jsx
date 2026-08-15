// frontend/src/components/ui/Avatar.jsx
const COLORS = ['#6366f1','#8b5cf6','#10b981','#f59e0b','#3b82f6','#ef4444','#ec4899','#14b8a6'];
const getColor = (name = '', override) => override || COLORS[name.charCodeAt(0) % COLORS.length];
const getInitials = (name = '') => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

export default function Avatar({ name = '', size = 'md', color }) {
  const bg = getColor(name, color);
  const cls = `avatar${size === 'sm' ? ' avatar-sm' : size === 'lg' ? ' avatar-lg' : ''}`;
  return (
    <div className={cls} style={{ background: bg }}>
      {getInitials(name) || '?'}
    </div>
  );
}
