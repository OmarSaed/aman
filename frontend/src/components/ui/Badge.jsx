// frontend/src/components/ui/Badge.jsx
export default function Badge({ children, variant = 'gray', dot = false, style }) {
  return (
    <span className={`badge badge-${variant}`} style={style}>
      {dot && <span className="badge-dot" style={{
        background: variant === 'success' ? 'var(--success)' : variant === 'danger' ? 'var(--danger)' : '#94a3b8'
      }} />}
      {children}
    </span>
  );
}

export function RoleBadge({ role }) {
  return (
    <span className="badge" style={{
      background: role?.color ? `${role.color}18` : '#f1f5f9',
      color: role?.color || 'var(--text-secondary)',
      borderColor: role?.color ? `${role.color}30` : 'var(--border)',
      border: '1px solid',
    }}>
      {role?.displayName || role?.name}
    </span>
  );
}
