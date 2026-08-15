// frontend/src/features/auth/LoginPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Globe, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authService } from '../../services/auth.service';
import useAuthStore from '../../store/auth.store';

export default function LoginPage() {
  const { t, i18n } = useTranslation();
  const navigate     = useNavigate();
  const setAuth      = useAuthStore(s => s.setAuth);
  const isAr         = i18n.language === 'ar';

  const [form, setForm]       = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]  = useState(false);

  const toggleLang = () => i18n.changeLanguage(isAr ? 'en' : 'ar');
  const onChange   = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return;
    setLoading(true);
    try {
      const res = await authService.login(form.email, form.password);
      const { user, accessToken, refreshToken, permissions } = res.data.data;
      localStorage.setItem('aman-refresh-token', refreshToken);
      setAuth({ user, accessToken, permissions });
      
      if (user.preferredLang && user.preferredLang !== i18n.language) {
        await i18n.changeLanguage(user.preferredLang);
      }
      
      const isNowAr = user.preferredLang === 'ar' || (!user.preferredLang && isAr);
      toast.success(isNowAr ? `مرحباً، ${user.nameAr || user.name}` : `Welcome back, ${user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || t('auth.loginError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'var(--font-en)' }}>
      {/* ── Left panel — brand ── */}
      <div style={{
        flex: '0 0 48%', background: 'linear-gradient(145deg, #0b0f1a 0%, #1a1040 50%, #0b0f1a 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '48px', position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative blobs */}
        {[
          { w:340, h:340, top:-80, left:-80, opacity:0.12, color:'#6366f1' },
          { w:240, h:240, bottom:-60, right:-60, opacity:0.1, color:'#8b5cf6' },
          { w:160, h:160, top:'40%', right:'15%', opacity:0.07, color:'#818cf8' },
        ].map((b, i) => (
          <div key={i} style={{
            position:'absolute', width:b.w, height:b.h, borderRadius:'50%',
            background: b.color, opacity: b.opacity,
            top: b.top, bottom: b.bottom, left: b.left, right: b.right,
            filter: 'blur(60px)', pointerEvents: 'none',
          }}/>
        ))}

        {/* Content */}
        <div style={{ position:'relative', textAlign:'center', maxWidth: 380 }}>
          <div style={{
            width:72, height:72, borderRadius:18, background:'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:32, fontWeight:800, color:'white', margin:'0 auto 28px',
            boxShadow:'0 8px 32px rgba(99,102,241,0.5)',
          }}>A</div>

          <h1 style={{ fontSize:36, fontWeight:800, color:'white', lineHeight:1.1, marginBottom:12, letterSpacing:'-0.5px' }}>
            {isAr ? 'أمان ERP' : 'Aman ERP'}
          </h1>
          <p style={{ fontSize:17, color:'rgba(148,163,184,0.9)', fontWeight:400, marginBottom:40, lineHeight:1.5 }}>
            {isAr ? 'نظام تخطيط موارد المؤسسات' : 'Enterprise Resource Planning System'}
          </p>

          {/* Feature pills */}
          {[
            { en:'Accounting & Finance', ar:'المحاسبة والمالية' },
            { en:'Inventory Management', ar:'إدارة المستودع' },
            { en:'POS & Orders',         ar:'نقطة البيع والطلبات' },
            { en:'Multi-Currency & VAT', ar:'متعدد العملات والضرائب' },
          ].map((f, i) => (
            <div key={i} style={{
              display:'inline-flex', alignItems:'center', gap:8,
              background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.25)',
              borderRadius:9999, padding:'7px 16px', margin:'4px',
              fontSize:13, color:'rgba(199,210,254,0.9)', fontWeight:500,
            }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#818cf8', display:'block' }}/>
              {isAr ? f.ar : f.en}
            </div>
          ))}
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div style={{
        flex: 1, display:'flex', flexDirection:'column',
        alignItems:'center', justifyContent:'center',
        background:'white', padding:'48px 40px',
        position:'relative',
      }}>
        {/* Language toggle */}
        <button
          onClick={toggleLang}
          style={{
            position:'absolute', top:24, insetInlineEnd:24,
            display:'flex', alignItems:'center', gap:6,
            background:'var(--bg-app)', border:'1px solid var(--border)',
            borderRadius:8, padding:'7px 14px', cursor:'pointer',
            fontSize:13, fontWeight:600, color:'var(--text-secondary)',
          }}
        >
          <Globe size={14} />
          {isAr ? 'English' : 'العربية'}
        </button>

        <div style={{ width:'100%', maxWidth:400 }}>
          {/* Heading */}
          <div style={{ marginBottom:36 }}>
            <h2 style={{ fontSize:26, fontWeight:800, color:'var(--text-primary)', letterSpacing:'-0.3px' }}>
              {t('auth.signIn')}
            </h2>
            <p style={{ fontSize:14, color:'var(--text-secondary)', marginTop:6 }}>
              {t('auth.signInTo')}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:18 }}>
            {/* Email */}
            <div className="form-group">
              <label className="form-label">{t('auth.email')}</label>
              <div className="input-with-icon">
                <Mail className="input-icon" size={16} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  className="input"
                  value={form.email}
                  onChange={onChange}
                  placeholder="admin@aman-erp.com"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label">{t('auth.password')}</label>
              <div className="input-with-icon" style={{ position:'relative' }}>
                <Lock className="input-icon" size={16} />
                <input
                  id="password"
                  name="password"
                  type={showPass ? 'text' : 'password'}
                  className="input"
                  style={{ paddingInlineEnd: 40 }}
                  value={form.password}
                  onChange={onChange}
                  placeholder="••••••••"
                  required
                />
                <button type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position:'absolute', insetInlineEnd:10, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer', color:'var(--text-tertiary)', padding:4,
                  }}
                >
                  {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width:'100%', marginTop:4, justifyContent:'center' }}
              disabled={loading}
            >
              {loading
                ? <><Loader2 size={18} className="animate-spin" />{t('auth.loggingIn')}</>
                : t('auth.signIn')
              }
            </button>
          </form>

          {/* Footer */}
          <p style={{ fontSize:12, color:'var(--text-tertiary)', textAlign:'center', marginTop:32 }}>
            {isAr ? '© 2025 أمان ERP — جميع الحقوق محفوظة' : '© 2025 Aman ERP — All rights reserved'}
          </p>
        </div>
      </div>
    </div>
  );
}
