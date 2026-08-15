// frontend/src/features/roles/RoleFormModal.jsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import { rolesService } from '../../services/roles.service';

const COLORS  = ['#6366f1','#8b5cf6','#10b981','#f59e0b','#3b82f6','#ef4444','#ec4899','#14b8a6','#f97316','#64748b'];
const SHELLS  = [{ value:'SIDEBAR', labelEn:'Sidebar', labelAr:'الشريط الجانبي' },{ value:'POS', labelEn:'POS Screen', labelAr:'نقطة البيع' }];

const Field = ({ name, label, placeholder, required, disabled, form, onChange }) => (
  <div className="form-group">
    <label className="form-label">{label}{required && <span style={{color:'var(--danger)'}}> *</span>}</label>
    <input name={name} className="input" value={form[name]} onChange={onChange}
      placeholder={placeholder} disabled={disabled} style={disabled?{opacity:.5}:{}}/>
  </div>
);

export default function RoleFormModal({ role, onClose, onSuccess }) {
  const { t, i18n }   = useTranslation();
  const isAr          = i18n.language === 'ar';
  const isEdit        = !!role;
  const isSystem      = role?.isSystem;
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ name:'', nameAr:'', displayName:'', displayNameAr:'', description:'', color:'#6366f1', uiShell:'SIDEBAR' });

  useEffect(() => {
    if (role) setForm({ name: role.name||'', nameAr: role.nameAr||'', displayName: role.displayName||'',
      displayNameAr: role.displayNameAr||'', description: role.description||'',
      color: role.color||'#6366f1', uiShell: role.uiShell||'SIDEBAR' });
  }, [role]);

  const onChange = e => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isSystem && !form.displayName) { toast.error(t('common.required')); return; }
    if (!isSystem && !form.name)        { toast.error(t('common.required')); return; }
    setLoading(true);
    try {
      let saved;
      if (isEdit) saved = (await rolesService.update(role.id, form)).data.data;
      else        saved = (await rolesService.create(form)).data.data;
      toast.success(isEdit ? t('common.updatedSuccessfully') : t('common.createdSuccessfully'));
      onSuccess(saved);
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally { setLoading(false); }
  };



  return (
    <Modal isOpen onClose={onClose}
      title={isEdit ? t('roles.editRole') : t('roles.createRole')}
      size="md"
      footer={
        <>
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>{t('common.cancel')}</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
            {loading ? <span className="loader"/> : isEdit ? t('common.update') : t('common.create')}
          </button>
        </>
      }
    >
      {isSystem && (
        <div style={{ background:'#fef3c7', border:'1px solid #fcd34d', borderRadius:'var(--radius)', padding:'10px 14px', fontSize:13, color:'#78350f', marginBottom:16 }}>
          🔒 {t('roles.systemRoleHint')}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        {!isSystem && (
          <>
            <div className="grid-2">
              <Field name="name"   label={t('roles.roleName')}   placeholder="e.g. supervisor"  required form={form} onChange={onChange} />
              <Field name="nameAr" label={t('roles.roleNameAr')} placeholder="مثال: مشرف" form={form} onChange={onChange} />
            </div>
            <div className="grid-2">
              <Field name="displayName"   label={t('roles.displayName')} placeholder="Supervisor"    required form={form} onChange={onChange} />
              <Field name="displayNameAr" label={`${t('roles.displayName')} (AR)`} placeholder="مشرف" form={form} onChange={onChange} />
            </div>
            <Field name="description" label={t('roles.description')} placeholder={isAr?'وصف الدور...':'Role description...'} form={form} onChange={onChange} />
          </>
        )}

        {/* Color picker */}
        <div className="form-group">
          <label className="form-label">{t('roles.color')}</label>
          <div className="color-picker">
            {COLORS.map(c => (
              <div key={c} className={`color-option ${form.color===c?'selected':''}`}
                style={{ background:c }} onClick={() => setForm(p=>({...p,color:c}))}/>
            ))}
          </div>
        </div>

        {/* UI Shell */}
        <div className="form-group">
          <label className="form-label">{t('roles.uiShell')}</label>
          <select name="uiShell" className="select" value={form.uiShell} onChange={onChange}>
            {SHELLS.map(s => <option key={s.value} value={s.value}>{isAr?s.labelAr:s.labelEn}</option>)}
          </select>
        </div>
      </form>
    </Modal>
  );
}
