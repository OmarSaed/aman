import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Pencil, Truck, Trash2, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { suppliersService } from '../../services/suppliers.service';
import Modal, { ConfirmModal } from '../../components/ui/Modal';
import Can from '../auth/Can';
import { useNavigate } from 'react-router-dom';

const SupplierFormModal = ({ supplier, onClose, onSuccess }) => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const isEdit = !!supplier;

  const [formData, setFormData] = useState({
    name: supplier?.name || '',
    contactInfo: supplier?.contactInfo || ''
  });

  const mut = useMutation({
    mutationFn: (data) => isEdit ? suppliersService.update(supplier.id, data) : suppliersService.create(data),
    onSuccess: () => {
      toast.success(isAr ? 'تم الحفظ بنجاح' : 'Saved successfully');
      onSuccess();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error')
  });

  const handleSubmit = (e) => { e.preventDefault(); mut.mutate(formData); };

  return (
    <Modal isOpen={true} title={isEdit ? (isAr ? 'تعديل مسجل' : 'Edit Supplier') : (isAr ? 'إضافة مورد' : 'Add Supplier')} onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
        <div className="form-group">
          <label className="label">{isAr ? 'اسم المورد' : 'Supplier Name'}</label>
          <input required type="text" className="input" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="label">{isAr ? 'معلومات التواصل' : 'Contact Info'}</label>
          <textarea className="input" rows="3" value={formData.contactInfo} onChange={e => setFormData(p => ({ ...p, contactInfo: e.target.value }))} />
        </div>
        <div className="flex justify-end gap-3 mt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{isAr ? 'إلغاء' : 'Cancel'}</button>
          <button type="submit" className="btn btn-primary" disabled={mut.isPending}>
            {mut.isPending ? '...' : (isAr ? 'حفظ' : 'Save')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default function SuppliersPage() {
  const { i18n } = useTranslation();
  const qc = useQueryClient();
  const isAr = i18n.language === 'ar';
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState(null);

  const params = { page, limit };

  const { data, isLoading } = useQuery({
    queryKey: ['suppliers', params],
    queryFn: () => suppliersService.list(params).then(r => r.data),
  });

  const mutDelete = useMutation({
    mutationFn: (id) => suppliersService.delete(id),
    onSuccess: () => {
      toast.success(isAr ? 'تم حذف المورد بنجاح' : 'Supplier deleted successfully');
      qc.invalidateQueries(['suppliers']);
    },
    onError: (e) => toast.error(e.response?.data?.message || (isAr ? 'خطأ أثناء الحذف' : 'Error deleting supplier'))
  });

  const handleDelete = (id) => {
    setSupplierToDelete(id);
    setDeleteModalOpen(true);
  };

  const onConfirmDelete = () => {
    if (supplierToDelete) {
      mutDelete.mutate(supplierToDelete);
      setDeleteModalOpen(false);
      setSupplierToDelete(null);
    }
  };

  const suppliers = data?.data || [];
  const pagination = data?.pagination;
  const filtered = suppliers.filter(s => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="animate-fade max-w-5xl">
      <div className="page-header">
        <div className="page-header-left">
          <h1>{isAr ? 'شبكة الموردين' : 'Suppliers Network'}</h1>
          <p>{isAr ? 'إدارة بيانات مورديك' : 'Manage your vendors and suppliers'}</p>
        </div>
        <Can permission="vendors:create">
          <button className="btn btn-primary" onClick={() => { setEditSupplier(null); setFormOpen(true); }}>
            <Plus size={16} />{isAr ? 'إضافة مورد' : 'Add Supplier'}
          </button>
        </Can>
      </div>

      <div className="card mb-4 min-h-[400px]" style={{ minWidth: 370 }}>
        <div style={{ padding: '14px 16px', display: 'flex', gap: 10 }}>
          <div className="input-with-icon" style={{ flex: 1, maxWidth: 300 }}>
            <Search className="input-icon" size={15} />
            <input className="input" placeholder={isAr ? 'بحث بالاسم...' : 'Search named...'} value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{isAr ? 'الاسم' : 'Name'}</th>
                <th>{isAr ? 'بيانات التواصل' : 'Contact Info'}</th>
                <th>{isAr ? 'الإضافة' : 'Added On'}</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={4} style={{ textAlign: 'center', padding: 40 }}><span className="loader loader-dark" style={{ margin: '0 auto', display: 'block' }}/></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4}>
                  <div className="empty-state"><div className="empty-state-icon"><Truck /></div><h3>{isAr ? 'لا يوجد موردين' : 'No suppliers found'}</h3></div>
                </td></tr>
              ) : filtered.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 600 }}>{s.name}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{s.contactInfo || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{new Date(s.createdAt).toLocaleDateString()}</td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        className="btn btn-ghost btn-icon" 
                        title={isAr ? 'كشف الحساب' : 'Account'}
                        onClick={() => navigate(`/vendors/${s.id}/account`)}
                      >
                        <BookOpen size={16} className="text-primary-600" />
                      </button>
                      
                      <Can permission="vendors:update">
                        <button className="btn btn-ghost btn-icon" onClick={() => { setEditSupplier(s); setFormOpen(true); }}>
                          <Pencil size={15} />
                        </button>
                      </Can>

                      <Can permission="vendors:delete">
                        <button className="btn btn-ghost btn-icon text-error" onClick={() => handleDelete(s.id)}>
                          <Trash2 size={15} />
                        </button>
                      </Can>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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

      {formOpen && (
        <SupplierFormModal
          supplier={editSupplier}
          onClose={() => setFormOpen(false)}
          onSuccess={() => { qc.invalidateQueries(['suppliers']); setFormOpen(false); }}
        />
      )}

      <ConfirmModal 
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={onConfirmDelete}
        loading={mutDelete.isPending}
        title={isAr ? 'حذف المورد' : 'Delete Supplier'}
        message={isAr ? 'هل أنت متأكد من حذف هذا المورد؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this supplier? This action cannot be undone.'}
      />
    </div>
  );
}
