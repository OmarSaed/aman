// frontend/src/features/users/UsersPage.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Search, RefreshCw, MoreVertical, Pencil, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { usersService } from '../../services/users.service';
import { rolesService } from '../../services/roles.service';
import { ConfirmModal } from '../../components/ui/Modal';
import Avatar from '../../components/ui/Avatar';
import Badge, { RoleBadge } from '../../components/ui/Badge';
import Can from '../auth/Can';
import UserFormModal from './UserFormModal';

const fmtDate = (d) => d ? new Date(d).toLocaleDateString() : '—';

export default function UsersPage() {
  const { t, i18n }  = useTranslation();
  const qc           = useQueryClient();
  const isAr         = i18n.language === 'ar';

  const [search,    setSearch]    = useState('');
  const [roleFilter,setRoleFilter]= useState('');
  const [statusFilter,setStatus]  = useState('');
  const [page,      setPage]      = useState(1);
  const [limit,     setLimit]     = useState(5);

  const [formOpen,  setFormOpen]  = useState(false);
  const [editUser,  setEditUser]  = useState(null);
  const [deleteUser,setDeleteUser]= useState(null);
  const [toggleUser,setToggleUser]= useState(null);
  const [openMenu,  setOpenMenu]  = useState(null);

  const params = { page, limit, ...(search && { search }), ...(roleFilter && { roleId: roleFilter }), ...(statusFilter && { isActive: statusFilter }) };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['users', params],
    queryFn: () => usersService.list(params).then(r => r.data),
  });

  const { data: statsData } = useQuery({
    queryKey: ['user-stats'],
    queryFn: () => usersService.getStats().then(r => r.data.data),
  });

  const { data: rolesData } = useQuery({
    queryKey: ['roles-list'],
    queryFn: () => rolesService.list().then(r => r.data.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => usersService.delete(id),
    onSuccess: () => { qc.invalidateQueries(['users']); qc.invalidateQueries(['user-stats']); toast.success(t('common.deletedSuccessfully')); setDeleteUser(null); },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  });

  const toggleMut = useMutation({
    mutationFn: (id) => usersService.toggleStatus(id),
    onSuccess: (_, id) => { qc.invalidateQueries(['users']); qc.invalidateQueries(['user-stats']); toast.success(t('common.updatedSuccessfully')); setToggleUser(null); },
    onError: (e) => toast.error(e.response?.data?.message || t('common.error')),
  });

  const users      = data?.data || [];
  const pagination = data?.pagination;
  const roles      = rolesData || [];

  const openCreate = () => { setEditUser(null); setFormOpen(true); };
  const openEdit   = (u)  => { setEditUser(u);  setFormOpen(true); setOpenMenu(null); };

  return (
    <div className="animate-fade">
      {/* Page header */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>{t('users.title')}</h1>
          <p>{t('users.subtitle')}</p>
        </div>
        <Can permission="users:create">
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} />{t('users.createUser')}
          </button>
        </Can>
      </div>

      {/* Stats */}
      <div className="stat-grid mb-6" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
        {[
          { label: t('users.totalUsers'),    value: statsData?.total,    bg:'#eef2ff', color:'#6366f1' },
          { label: t('users.activeUsers'),   value: statsData?.active,   bg:'#d1fae5', color:'#10b981' },
          { label: t('users.inactiveUsers'), value: statsData?.inactive, bg:'#fee2e2', color:'#ef4444' },
        ].map((s,i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background:s.bg }}>
              <div style={{ width:20, height:20, borderRadius:4, background:s.color, opacity:0.9 }}/>
            </div>
            <div className="stat-content">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value">{s.value ?? '—'}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="card mb-4" style={{ overflow:'visible', minWidth: 370 }}>
        <div style={{ padding:'14px 16px', display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
          <div className="input-with-icon" style={{ flex:1, minWidth:200 }}>
            <Search className="input-icon" size={15} />
            <input className="input" placeholder={t('users.search')} value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="select" style={{ width:160 }} value={roleFilter}
            onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
            <option value="">{t('users.filterByRole')}</option>
            {roles.map(r => <option key={r.id} value={r.id}>{isAr?(r.displayNameAr||r.displayName):r.displayName}</option>)}
          </select>
          <select className="select" style={{ width:160 }} value={statusFilter}
            onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">{t('users.filterByStatus')}</option>
            <option value="true">{t('common.active')}</option>
            <option value="false">{t('common.inactive')}</option>
          </select>
          <button className="btn btn-ghost btn-icon" onClick={() => refetch()} title="Refresh">
            <RefreshCw size={15}/>
          </button>
        </div>

        {/* Table */}
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{t('users.name')}</th>
                <th>{t('users.role')}</th>
                <th>{t('users.status')}</th>
                <th>{t('users.lastLogin')}</th>
                <th>{t('users.createdAt')}</th>
                <th style={{ width:60 }}>{t('users.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ textAlign:'center', padding:40 }}>
                  <span className="loader loader-dark" style={{ margin:'0 auto', display:'block', width:28, height:28 }}/>
                </td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state"><div className="empty-state-icon">👥</div><h3>{t('users.noUsers')}</h3></div>
                </td></tr>
              ) : users.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <Avatar name={u.name} size="sm" color={u.role?.color} />
                      <div>
                        <div style={{ fontWeight:600, fontSize:14 }}>{isAr?(u.nameAr||u.name):u.name}</div>
                        <div style={{ fontSize:12, color:'var(--text-secondary)' }}>{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td><RoleBadge role={u.role} /></td>
                  <td>
                    <Badge variant={u.isActive?'success':'danger'} dot>
                      {u.isActive ? t('common.active') : t('common.inactive')}
                    </Badge>
                  </td>
                  <td style={{ fontSize:13, color:'var(--text-secondary)' }}>
                    {u.lastLoginAt ? fmtDate(u.lastLoginAt) : <span style={{ opacity:0.5 }}>{t('users.never')}</span>}
                  </td>
                  <td style={{ fontSize:13, color:'var(--text-secondary)' }}>{fmtDate(u.createdAt)}</td>
                  <td style={{ position:'relative' }}>
                    <Can anyOf={['users:update','users:toggle-status','users:delete']}>
                      <button className="btn btn-ghost btn-icon" onClick={() => setOpenMenu(openMenu===u.id?null:u.id)}>
                        <MoreVertical size={15}/>
                      </button>
                      {openMenu === u.id && (
                        <div style={{
                          position:'absolute', insetInlineEnd:8, top:36, background:'white',
                          border:'1px solid var(--border)', borderRadius:'var(--radius)',
                          boxShadow:'var(--shadow-md)', zIndex:50, minWidth:160, overflow:'hidden',
                        }}>
                          <Can permission="users:update">
                            <button className="btn btn-ghost" style={{ width:'100%', justifyContent:'flex-start', borderRadius:0, gap:8 }}
                              onClick={() => openEdit(u)}>
                              <Pencil size={14}/>{t('common.edit')}
                            </button>
                          </Can>
                          <Can permission="users:toggle-status">
                            <button className="btn btn-ghost" style={{ width:'100%', justifyContent:'flex-start', borderRadius:0, gap:8 }}
                              onClick={() => { setToggleUser(u); setOpenMenu(null); }}>
                              {u.isActive?<ToggleLeft size={14}/>:<ToggleRight size={14}/>}
                              {u.isActive ? t('common.inactive') : t('common.active')}
                            </button>
                          </Can>
                          <Can permission="users:delete">
                            <button className="btn btn-ghost" style={{ width:'100%', justifyContent:'flex-start', borderRadius:0, gap:8, color:'var(--danger)' }}
                              onClick={() => { setDeleteUser(u); setOpenMenu(null); }}>
                              <Trash2 size={14}/>{t('common.delete')}
                            </button>
                          </Can>
                        </div>
                      )}
                    </Can>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && (
          <div className="pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{isAr ? 'صفوف:' : 'Rows:'}</span>
              <select 
                className="select" 
                style={{ width: 65, height: 32, padding: '0 4px', fontSize: 13, borderRadius: '8px' }}
                value={limit}
                onChange={e => { setLimit(parseInt(e.target.value)); setPage(1); }}
              >
                {[5, 10, 20, 50].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginInlineStart: 8, minWidth: 200 }}>
                {isAr ? `إجمالي ${pagination.total} عنصر` : `Total ${pagination.total} items`}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button className="pagination-btn" disabled={!pagination.hasPrev} onClick={() => setPage(p => p - 1)}>‹</button>
              <span className="pagination-info" style={{ margin: '0 10px', fontSize: 13, fontWeight: 600 }}>{isAr ? 'صفحة' : 'Page'} {pagination.page} / {pagination.totalPages}</span>
              <button className="pagination-btn" disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {formOpen && (
        <UserFormModal
          user={editUser}
          roles={roles}
          onClose={() => setFormOpen(false)}
          onSuccess={() => { qc.invalidateQueries(['users']); qc.invalidateQueries(['user-stats']); setFormOpen(false); }}
        />
      )}

      <ConfirmModal
        isOpen={!!deleteUser}
        onClose={() => setDeleteUser(null)}
        onConfirm={() => deleteMut.mutate(deleteUser?.id)}
        loading={deleteMut.isPending}
        title={t('users.deleteUser')}
        message={isAr ? `هل تريد حذف "${deleteUser?.name}" نهائياً؟` : `Delete "${deleteUser?.name}" permanently?`}
        confirmLabel={t('common.delete')}
      />

      <ConfirmModal
        isOpen={!!toggleUser}
        onClose={() => setToggleUser(null)}
        onConfirm={() => toggleMut.mutate(toggleUser?.id)}
        loading={toggleMut.isPending}
        title={toggleUser?.isActive ? t('common.inactive') : t('common.active')}
        message={isAr ? `هل تريد ${toggleUser?.isActive?'إيقاف':'تفعيل'} "${toggleUser?.name}"؟` : `${toggleUser?.isActive?'Deactivate':'Activate'} "${toggleUser?.name}"?`}
        confirmLabel={t('common.confirm')}
      />
    </div>
  );
}
