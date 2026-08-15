// frontend/src/features/dashboard/ManagerDashboard.jsx
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/auth.store';
export default function ManagerDashboard() {
  const { i18n } = useTranslation();
  const { user } = useAuthStore();
  const isAr = i18n.language === 'ar';
  const name = isAr ? (user?.nameAr || user?.name) : user?.name;
  return (
    <div className="animate-fade">
      <div className="page-header">
        <div className="page-header-left">
          <h1>{isAr ? `مرحباً، ${name} 👋` : `Welcome, ${name} 👋`}</h1>
          <p style={{ color:'var(--text-secondary)', marginTop:4 }}>
            {isAr ? 'لوحة تحكم المدير — المزيد من الميزات قادم في المرحلة التالية.' : 'Manager Dashboard — More features coming in next phase.'}
          </p>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:16 }}>
        {[
          { label: isAr?'المبيعات اليوم':'Today\'s Sales',      value:'$0',   color:'#6366f1', bg:'#eef2ff' },
          { label: isAr?'الطلبات المعلقة':'Pending Orders',      value:'0',    color:'#f59e0b', bg:'#fef3c7' },
          { label: isAr?'المخزون المنخفض':'Low Stock Items',      value:'0',    color:'#ef4444', bg:'#fee2e2' },
          { label: isAr?'العملاء النشطون':'Active Customers',     value:'0',    color:'#10b981', bg:'#d1fae5' },
        ].map((s,i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background:s.bg }}>
              <div style={{ width:22, height:22, borderRadius:4, background:s.color, opacity:0.8 }}/>
            </div>
            <div className="stat-content">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
