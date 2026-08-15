// frontend/src/features/dashboard/AdminDashboard.jsx
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Users, Shield, CheckCircle2, XCircle, TrendingUp, Clock } from 'lucide-react';
import { usersService } from '../../services/users.service';
import { rolesService } from '../../services/roles.service';
import useAuthStore from '../../store/auth.store';

const StatCard = ({ icon: Icon, label, value, iconBg, iconColor, change }) => (
  <div className="stat-card">
    <div className="stat-icon" style={{ background: iconBg }}>
      <Icon size={22} style={{ color: iconColor }} />
    </div>
    <div className="stat-content">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value ?? '—'}</div>
      {change && <div className="stat-change">{change}</div>}
    </div>
  </div>
);

export default function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const { user }    = useAuthStore();
  const isAr        = i18n.language === 'ar';

  const { data: userStats } = useQuery({
    queryKey: ['user-stats'],
    queryFn:  () => usersService.getStats().then(r => r.data.data),
    staleTime: 60_000,
  });

  const { data: roles } = useQuery({
    queryKey: ['roles-list'],
    queryFn:  () => rolesService.list().then(r => r.data.data),
    staleTime: 60_000,
  });

  const name = isAr ? (user?.nameAr || user?.name) : user?.name;

  return (
    <div className="animate-fade">
      {/* Welcome */}
      <div className="page-header">
        <div className="page-header-left">
          <h1 style={{ fontSize:22, fontWeight:800 }}>
            {isAr ? `مرحباً، ${name} 👋` : `Welcome back, ${name} 👋`}
          </h1>
          <p style={{ color:'var(--text-secondary)', fontSize:14, marginTop:4 }}>
            {isAr ? 'هذا ملخص نظامك اليوم.' : "Here's what's happening in your system today."}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid mb-6">
        <StatCard icon={Users}        label={isAr?'إجمالي المستخدمين':'Total Users'}   value={userStats?.total}    iconBg="#eef2ff" iconColor="#6366f1" />
        <StatCard icon={CheckCircle2} label={isAr?'المستخدمون النشطون':'Active Users'}  value={userStats?.active}   iconBg="#d1fae5" iconColor="#10b981" />
        <StatCard icon={XCircle}      label={isAr?'غير النشطين':'Inactive Users'}       value={userStats?.inactive}  iconBg="#fee2e2" iconColor="#ef4444" />
        <StatCard icon={Shield}       label={isAr?'إجمالي الأدوار':'Total Roles'}       value={roles?.length}        iconBg="#fef3c7" iconColor="#f59e0b" />
      </div>

      {/* Role breakdown */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div className="card">
          <div className="card-header">
            <div>
              <div className="card-title">{isAr?'توزيع المستخدمين حسب الدور':'Users by Role'}</div>
            </div>
          </div>
          <div className="card-body" style={{ padding:'8px 0' }}>
            {userStats?.byRole?.map((r, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'12px 24px', borderBottom: i < userStats.byRole.length-1 ? '1px solid var(--border)' : 'none'
              }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background: r.color || '#6366f1' }}/>
                  <span style={{ fontSize:14, fontWeight:500 }}>{r.displayName}</span>
                </div>
                <span className="badge badge-primary">{r.count} {isAr?'مستخدم':'users'}</span>
              </div>
            ))}
            {!userStats?.byRole?.length && (
              <div className="empty-state" style={{ padding:'30px 24px' }}>
                <p>{isAr?'لا توجد بيانات':'No data yet'}</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <div className="card-title">{isAr?'نشاط سريع':'Quick Actions'}</div>
          </div>
          <div className="card-body" style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {[
              { href:'/users',    label: isAr?'إضافة مستخدم جديد':'Add New User',        icon:'👤', color:'#6366f1' },
              { href:'/roles',    label: isAr?'إدارة الصلاحيات':'Manage Permissions',    icon:'🔐', color:'#8b5cf6' },
              { href:'/settings', label: isAr?'إعدادات النظام':'System Settings',         icon:'⚙️', color:'#10b981' },
            ].map((a, i) => (
              <a key={i} href={a.href} style={{
                display:'flex', alignItems:'center', gap:12,
                padding:'14px', borderRadius:'var(--radius)',
                border:'1px solid var(--border)', textDecoration:'none', color:'inherit',
                transition:'all 0.2s', background:'white',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = a.color}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
              >
                <span style={{ fontSize:20 }}>{a.icon}</span>
                <span style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)' }}>{a.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
