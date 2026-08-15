// frontend/src/features/roles/PermissionsMatrix.jsx
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Lock, CheckSquare, Square } from 'lucide-react';
import { rolesService } from '../../services/roles.service';
import toast from 'react-hot-toast';
import Can from '../auth/Can';

export default function PermissionsMatrix({ role, permissions, assignedIds, onSaved }) {
  const { t, i18n } = useTranslation();
  const isAr        = i18n.language === 'ar';
  const [selected, setSelected] = useState(new Set(assignedIds));
  const [saving,   setSaving]   = useState(false);
  const [dirty,    setDirty]    = useState(false);

  useEffect(() => {
    setSelected(new Set(assignedIds));
    setDirty(false);
  }, [assignedIds, role?.id]);

  const toggle = (permId) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(permId) ? next.delete(permId) : next.add(permId);
      return next;
    });
    setDirty(true);
  };

  const toggleAll = (permIds) => {
    const allOn = permIds.every(id => selected.has(id));
    setSelected(prev => {
      const next = new Set(prev);
      permIds.forEach(id => allOn ? next.delete(id) : next.add(id));
      return next;
    });
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await rolesService.updatePermissions(role.id, [...selected]);
      setDirty(false);
      onSaved();
    } catch (e) {
      toast.error(e.response?.data?.message || t('common.error'));
    } finally { setSaving(false); }
  };

  return (
    <div className="card">
      <div className="card-header">
        <div>
          <div className="card-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:10, height:10, borderRadius:'50%', background: role.color, flexShrink:0 }}/>
            {isAr ? (role.displayNameAr||role.displayName) : role.displayName}
            {role.isSystem && (
              <Lock size={13} style={{ color:'var(--text-tertiary)' }}/>
            )}
          </div>
          <div className="card-subtitle">
            {selected.size} / {permissions.reduce((a, g) => a + g.permissions.length, 0)}&nbsp;
            {isAr ? 'صلاحية' : 'permissions assigned'}
            {role.isSystem && (
              <span style={{ marginInlineStart:8, color:'var(--warning)', fontWeight:600 }}>
                · {t('roles.systemRoleHint')}
              </span>
            )}
          </div>
        </div>
        <Can permission="roles:assign-permissions">
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSave}
            disabled={saving || !dirty}
            style={{ opacity: dirty ? 1 : 0.5 }}
          >
            {saving ? <span className="loader"/> : <Save size={14}/>}
            {t('roles.savePermissions')}
          </button>
        </Can>
      </div>

      <div style={{ padding:'20px 24px', maxHeight:'62vh', overflowY:'auto' }}>
        {permissions.map((group) => {
          const groupIds = group.permissions.map(p => p.id);
          const allOn    = groupIds.every(id => selected.has(id));
          const someOn   = groupIds.some(id => selected.has(id));

          return (
            <div key={group.module} className="permission-module">
              <div className="permission-module-header">
                <span className="permission-module-name">
                  {isAr ? (group.moduleAr || group.module) : group.module}
                </span>
                <Can permission="roles:assign-permissions">
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ gap:5, fontSize:12, padding:'3px 10px' }}
                    onClick={() => toggleAll(groupIds)}
                  >
                    {allOn ? <CheckSquare size={13} style={{ color:'var(--primary-500)' }}/> : <Square size={13}/>}
                    {allOn ? (isAr?'إلغاء الكل':'Deselect all') : (isAr?'تحديد الكل':'Select all')}
                  </button>
                </Can>
              </div>

              <div className="permission-grid">
                {group.permissions.map(perm => (
                  <div key={perm.id} className="permission-row">
                    <div>
                      <div className="permission-name">
                        {isAr ? (perm.nameAr || perm.name) : perm.name}
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-tertiary)', fontFamily:'monospace' }}>
                        {perm.key}
                      </div>
                    </div>
                    <Can permission="roles:assign-permissions" fallback={
                      <div style={{ width:40, height:22, borderRadius:9999, background: selected.has(perm.id)?'var(--primary-500)':'#cbd5e1', opacity:0.5 }}/>
                    }>
                      <button
                        className={`toggle ${selected.has(perm.id) ? 'on' : ''}`}
                        onClick={() => toggle(perm.id)}
                        aria-checked={selected.has(perm.id)}
                        role="switch"
                      >
                        <span className="toggle-thumb"/>
                      </button>
                    </Can>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
