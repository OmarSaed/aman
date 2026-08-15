// frontend/src/features/roles/RolesPage.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Lock, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { rolesService } from '../../services/roles.service';
import { ConfirmModal } from '../../components/ui/Modal';
import PermissionsMatrix from './PermissionsMatrix';
import RoleFormModal from './RoleFormModal';
import Can from '../auth/Can';
import Badge from '../../components/ui/Badge';

const UI_SHELL_LABELS = { SIDEBAR: { en:'Sidebar', ar:'الشريط الجانبي' }, POS: { en:'POS Screen', ar:'نقطة البيع' } };

export default function RolesPage() {
  const { t, i18n } = useTranslation();
  const qc          = useQueryClient();
  const isAr        = i18n.language === 'ar';

  const [selectedRole, setSelectedRole] = useState(null);
  const [formOpen,     setFormOpen]     = useState(false);
  const [editRole,     setEditRole]     = useState(null);
  const [deleteRole,   setDeleteRole]   = useState(null);

  const { data: roles = [], isLoading } = useQuery({
    queryKey: ['roles-list'],
    queryFn: () => rolesService.list().then(r => r.data.data),
    onSuccess: (d) => { if (d.length && !selectedRole) setSelectedRole(d[0]); },
  });

  const { data: permissions = [] } = useQuery({
    queryKey: ['permissions-list'],
    queryFn: () => rolesService.listPermissions().then(r => r.data.data),
  });

  const { data: rolePermIds = [] } = useQuery({
    queryKey: ['role-permissions', selectedRole?.id],
    queryFn: () => rolesService.getRolePermissions(selectedRole.id).then(r => r.data.data),
    enabled: !!selectedRole?.id,
  });

  const deleteMut = useMutation({
    mutationFn: (id) => rolesService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries(['roles-list']);
      toast.success(t('common.deletedSuccessfully'));
      setDeleteRole(null);
      setSelectedRole(roles.find(r => r.id !== deleteRole?.id) || null);
    },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  });

  const openCreate = () => { setEditRole(null); setFormOpen(true); };
  const openEdit   = (r) => { setEditRole(r);  setFormOpen(true); };

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div className="page-header-left">
          <h1>{t('roles.title')}</h1>
          <p>{t('roles.subtitle')}</p>
        </div>
        <Can permission="roles:create">
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16}/>{t('roles.createRole')}
          </button>
        </Can>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'280px 1fr', gap:16, alignItems:'start' }}>
        {/* Role list */}
        <div className="card">
          <div className="card-header">
            <div className="card-title">{isAr?'الأدوار':'Roles'}</div>
            <span className="badge badge-primary">{roles.length}</span>
          </div>
          <div style={{ padding:'8px 12px' }}>
            {isLoading ? (
              <div style={{ padding:20, textAlign:'center' }}><span className="loader loader-dark" style={{ margin:'0 auto' }}/></div>
            ) : (
              <div className="role-list">
                {roles.map(role => (
                  <div key={role.id}
                    className={`role-card ${selectedRole?.id===role.id ? 'selected' : ''}`}
                    onClick={() => setSelectedRole(role)}>
                    <div className="role-dot" style={{ background: role.color }}/>
                    <div className="role-info">
                      <div className="role-display-name">
                        {isAr ? (role.displayNameAr||role.displayName) : role.displayName}
                      </div>
                      <div className="role-user-count">
                        {role._count?.users || 0} {isAr?'مستخدم':'users'}
                        {' · '}
                        {UI_SHELL_LABELS[role.uiShell]?.[isAr?'ar':'en']}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:4, flexShrink:0 }}>
                      {role.isSystem && (
                        <Lock size={13} style={{ color:'var(--text-tertiary)' }} title={t('roles.systemRole')}/>
                      )}
                      <Can permission="roles:update">
                        <button className="btn btn-ghost btn-icon" style={{ width:26, height:26, padding:0 }}
                          onClick={e => { e.stopPropagation(); openEdit(role); }}>
                          <Pencil size={12}/>
                        </button>
                      </Can>
                      {!role.isSystem && (
                        <Can permission="roles:delete">
                          <button className="btn btn-ghost btn-icon"
                            style={{ width:26, height:26, padding:0, color:'var(--danger)' }}
                            onClick={e => { e.stopPropagation(); setDeleteRole(role); }}>
                            <Trash2 size={12}/>
                          </button>
                        </Can>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Permissions panel */}
        {selectedRole ? (
          <PermissionsMatrix
            role={selectedRole}
            permissions={permissions}
            assignedIds={rolePermIds}
            onSaved={() => {
              qc.invalidateQueries(['role-permissions', selectedRole.id]);
              toast.success(t('common.savedSuccessfully'));
            }}
          />
        ) : (
          <div className="card">
            <div className="empty-state" style={{ padding:'80px 24px' }}>
              <div className="empty-state-icon">🔐</div>
              <h3>{t('roles.selectRole')}</h3>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {formOpen && (
        <RoleFormModal
          role={editRole}
          onClose={() => setFormOpen(false)}
          onSuccess={(saved) => {
            qc.invalidateQueries(['roles-list']);
            setFormOpen(false);
            setSelectedRole(saved);
          }}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteRole}
        onClose={() => setDeleteRole(null)}
        onConfirm={() => deleteMut.mutate(deleteRole?.id)}
        loading={deleteMut.isPending}
        title={t('roles.deleteRole')}
        message={isAr ? `هل تريد حذف دور "${deleteRole?.displayName}" نهائياً؟` : `Delete role "${deleteRole?.displayName}" permanently?`}
        confirmLabel={t('common.delete')}
      />
    </div>
  );
}
