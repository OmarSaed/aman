// frontend/src/features/users/UserFormModal.jsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import { usersService } from '../../services/users.service';

const LANGS = [{ value:'en', label:'English' },{ value:'ar', label:'العربية' }];

const Field = ({ name, label, type='text', placeholder, hint, required, form, errors, onChange }) => (
  <div className="form-group">
    <label className="form-label">{label}{required && <span style={{color:'var(--danger)'}}> *</span>}</label>
    <input name={name} type={type} className={`input${errors[name]?' error':''}`}
      value={form[name]} onChange={onChange} placeholder={placeholder} />
    {hint && <span className="form-hint">{hint}</span>}
    {errors[name] && <span className="form-error">{errors[name]}</span>}
  </div>
);

export default function UserFormModal({ user, roles, onClose, onSuccess }) {
  const { t, i18n } = useTranslation();
  const isAr        = i18n.language === 'ar';
  const isEdit      = !!user;
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState({});
  const [form, setForm] = useState({
    name: '', nameAr: '', email: '', password: '', roleId: '', preferredLang: 'en',
  });

  useEffect(() => {
    if (user) setForm({ name: user.name||'', nameAr: user.nameAr||'', email: user.email||'',
      password: '', roleId: user.role?.id||'', preferredLang: user.preferredLang||'en' });
  }, [user]);

  const onChange = e => { setForm(p=>({...p,[e.target.name]:e.target.value})); setErrors(p=>({...p,[e.target.name]:''})); };

  const validate = () => {
    const e = {};
    if (!form.name)    e.name    = t('common.required');
    if (!form.email)   e.email   = t('common.required');
    if (!form.roleId)  e.roleId  = t('common.required');
    if (!isEdit && !form.password) e.password = t('common.required');
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);
    try {
      const payload = { ...form };
      if (isEdit && !payload.password) delete payload.password;
      if (isEdit) await usersService.update(user.id, payload);
      else        await usersService.create(payload);
      toast.success(isEdit ? t('common.updatedSuccessfully') : t('common.createdSuccessfully'));
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || t('common.error'));
    } finally { setLoading(false); }
  };



  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? t('users.editUser') : t('users.createUser')}
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
      <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
        <div className="grid-2">
          <Field name="name"   label={t('users.name')}   placeholder="John Smith" required form={form} errors={errors} onChange={onChange} />
          <Field name="nameAr" label={t('users.nameAr')} placeholder="محمد أحمد" form={form} errors={errors} onChange={onChange} />
        </div>
        <Field name="email" label={t('users.email')} type="email" placeholder="user@example.com" required form={form} errors={errors} onChange={onChange} />

        <div className="form-group">
          <label className="form-label">{t('users.role')}<span style={{color:'var(--danger)'}}> *</span></label>
          <select name="roleId" className={`select${errors.roleId?' error':''}`} value={form.roleId} onChange={onChange}>
            <option value="">{isAr?'-- اختر دوراً --':'-- Select Role --'}</option>
            {roles.map(r => <option key={r.id} value={r.id}>{isAr?(r.displayNameAr||r.displayName):r.displayName}</option>)}
          </select>
          {errors.roleId && <span className="form-error">{errors.roleId}</span>}
        </div>

        <div className="grid-2">
          <Field name="password" label={t('users.password')} type="password" placeholder="••••••••"
            hint={isEdit ? t('users.passwordHint') : undefined} required={!isEdit} form={form} errors={errors} onChange={onChange} />
          <div className="form-group">
            <label className="form-label">{t('users.language')}</label>
            <select name="preferredLang" className="select" value={form.preferredLang} onChange={onChange}>
              {LANGS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>
        </div>
      </form>
    </Modal>
  );
}
