// frontend/src/components/layout/POSLayout.jsx
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Globe, LogOut } from 'lucide-react';
import useAuthStore from '../../store/auth.store';
import Avatar from '../ui/Avatar';

export default function POSLayout({ children }) {
  const { i18n }    = useTranslation();
  const { user, logout } = useAuthStore();
  const navigate    = useNavigate();
  const isAr        = i18n.language === 'ar';

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="pos-shell">
      <div className="pos-topbar">
        <div className="pos-topbar-logo">
          {isAr ? 'أمان ERP' : 'Aman ERP'}
          <span style={{ fontSize:12, fontWeight:400, color:'rgba(148,163,184,0.7)', marginInlineStart:8 }}>
            {isAr ? 'نقطة البيع' : 'Point of Sale'}
          </span>
        </div>

        <div style={{ flex:1 }} />

        <button className="btn btn-ghost btn-sm" onClick={() => i18n.changeLanguage(isAr ? 'en' : 'ar')}
          style={{ color:'rgba(148,163,184,0.8)', gap:5 }}>
          <Globe size={14}/>{isAr?'English':'العربية'}
        </button>

        <div style={{ display:'flex', alignItems:'center', gap:10, paddingInlineStart:16, borderInlineStart:'1px solid rgba(255,255,255,0.1)' }}>
          <Avatar name={user?.name} size="sm" color={user?.role?.color} />
          <div>
            <div style={{ fontSize:13, fontWeight:600, color:'#e2e8f0' }}>{isAr?(user?.nameAr||user?.name):user?.name}</div>
            <div style={{ fontSize:11, color:'rgba(148,163,184,0.7)' }}>{isAr?'أمين الصندوق':'Cashier'}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={handleLogout} title="Logout" style={{ color:'rgba(148,163,184,0.7)' }}>
            <LogOut size={15}/>
          </button>
        </div>
      </div>

      <div style={{ flex:1, overflow:'hidden' }}>
        {children}
      </div>
    </div>
  );
}
