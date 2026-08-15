// frontend/src/features/dashboard/AccountantDashboard.jsx
import { useTranslation } from 'react-i18next';
import useAuthStore from '../../store/auth.store';
export default function AccountantDashboard() {
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
            {isAr ? 'لوحة تحكم المحاسب.' : 'Accountant Dashboard — Accounting module coming in Phase 4.'}
          </p>
        </div>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:16 }}>
        {[
          { label: isAr?'فواتير معلقة':'Pending Invoices', value:'0', color:'#6366f1', bg:'#eef2ff' },
          { label: isAr?'مدفوعات اليوم':'Today Payments',  value:'$0', color:'#10b981', bg:'#d1fae5' },
          { label: isAr?'مصروفات الشهر':'Monthly Expenses', value:'$0', color:'#f59e0b', bg:'#fef3c7' },
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
