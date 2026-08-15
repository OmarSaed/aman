// frontend/src/features/customers/CustomersPage.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Plus, Search, MoreVertical, Pencil, User, Trash2, Wallet, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { customersService } from '../../services/customers.service';
import CustomerFormModal from './CustomerFormModal';
import { ConfirmModal } from '../../components/ui/Modal';
import Can from '../auth/Can';

export default function CustomersPage() {
  const { i18n } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isAr = i18n.language === 'ar';

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [openMenu, setOpenMenu] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [customerToDelete, setCustomerToDelete] = useState(null);

  const params = { page, limit, search, type };

  const { data, isLoading } = useQuery({
    queryKey: ['customers', params],
    queryFn: () => customersService.list(params).then(r => r.data),
  });

  const mutDelete = useMutation({
    mutationFn: (id) => customersService.delete(id),
    onSuccess: () => {
      toast.success(isAr ? 'تم حذف العميل بنجاح' : 'Customer deleted successfully');
      qc.invalidateQueries(['customers']);
    },
    onError: (e) => toast.error(e.response?.data?.message || (isAr ? 'خطأ أثناء الحذف' : 'Error deleting'))
  });

  const handleDelete = (id) => {
    setCustomerToDelete(id);
    setDeleteModalOpen(true);
  };

  const onConfirmDelete = () => {
    if (customerToDelete) {
      mutDelete.mutate(customerToDelete);
      setDeleteModalOpen(false);
      setCustomerToDelete(null);
    }
  };

  const customers = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div className="page-header-left">
          <h1>{isAr ? 'العملاء' : 'Customers'}</h1>
          <p>{isAr ? 'إدارة قاعدة بيانات عملائك وحساباتهم' : 'Manage your customer database and accounts'}</p>
        </div>
        <Can permission="customers:create">
          <button className="btn btn-primary" onClick={() => { setEditCustomer(null); setFormOpen(true); }}>
            <Plus size={16} />{isAr ? 'إضافة عميل' : 'Add Customer'}
          </button>
        </Can>
      </div>

      <div className="card mb-4 min-h-[400px]">
        <div style={{ padding: '14px 16px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <div className="input-with-icon" style={{ flex: 1, minWidth: 200, maxWidth: 300 }}>
            <Search className="input-icon" size={15} />
            <input 
              className="input" 
              placeholder={isAr ? 'بحث بالاسم أو الهاتف...' : 'Search name or phone...'} 
              value={search} 
              onChange={e => { setSearch(e.target.value); setPage(1); }} 
            />
          </div>
          
          <select 
            className="select" 
            style={{ width: 140 }} 
            value={type} 
            onChange={e => { setType(e.target.value); setPage(1); }}
          >
            <option value="">{isAr ? 'كل الأنواع' : 'All Types'}</option>
            <option value="NORMAL">{isAr ? 'عادي' : 'Normal'}</option>
            <option value="WHOLESALE">{isAr ? 'جملة' : 'Wholesale'}</option>
          </select>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{isAr ? 'الاسم' : 'Name'}</th>
                <th>{isAr ? 'الهاتف' : 'Phone'}</th>
                <th>{isAr ? 'النوع' : 'Type'}</th>
                <th>{isAr ? 'الرصيد' : 'Balance'}</th>
                <th>{isAr ? 'الحالة' : 'Status'}</th>
                <th style={{ width: 60 }}></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}><span className="loader loader-dark" style={{ margin: '0 auto', display: 'block' }}/></td></tr>
              ) : customers.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state"><div className="empty-state-icon"><User /></div><h3>{isAr ? 'لا يوجد عملاء' : 'No customers found'}</h3></div>
                </td></tr>
              ) : customers.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>
                    <div className="flex items-center gap-2">
                      {c.name}
                      {c.isDefaultPos && (
                        <span className="badge badge-primary" style={{ fontSize: '0.65rem', padding: '2px 6px', opacity: 0.9 }} title={isAr ? 'العميل الافتراضي لنقطة البيع' : 'Default POS Customer'}>
                          POS
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>{c.phone || '—'}</td>
                  <td>
                    <span className={`badge badge-${c.type === 'WHOLESALE' ? 'primary' : 'secondary'}`}>
                      {c.type === 'WHOLESALE' ? (isAr ? 'جملة' : 'Wholesale') : (isAr ? 'عادي' : 'Normal')}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: c.balance >= 0 ? 'var(--success)' : 'var(--error)' }}>
                    {parseFloat(c.balance).toLocaleString()} $
                  </td>
                  <td>
                    <span className={`badge badge-${c.isActive ? 'success' : 'error'}`}>
                      {c.isActive ? (isAr ? 'نشط' : 'Active') : (isAr ? 'معطل' : 'Disabled')}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-1">
                      <button 
                        className="btn btn-ghost btn-icon" 
                        title={isAr ? 'كشف الحساب' : 'Account Details'}
                        onClick={() => navigate(`/customers/${c.id}/account`)}
                      >
                        <Wallet size={15} className="text-primary-500" />
                      </button>
                      <Can permission="customers:update">
                        <button 
                          className="btn btn-ghost btn-icon" 
                          title={isAr ? 'تعديل' : 'Edit'}
                          onClick={() => { setEditCustomer(c); setFormOpen(true); }}
                        >
                          <Pencil size={15} className="text-slate-500" />
                        </button>
                      </Can>
                      <Can permission="customers:delete">
                        <button 
                          className="btn btn-ghost btn-icon" 
                          title={isAr ? 'حذف' : 'Delete'}
                          onClick={() => handleDelete(c.id)}
                        >
                          <Trash2 size={15} className="text-error" />
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
          <div className="pagination">
            <div className="pagination-left">
              <span className="pagination-total">{isAr ? `إجمالي ${pagination.total} عميل` : `Total ${pagination.total} customers`}</span>
            </div>
            <div className="pagination-right">
              <button className="pagination-btn" disabled={!pagination.hasPrev} onClick={() => setPage(p => p - 1)}>‹</button>
              <span className="pagination-info">{isAr ? 'صفحة' : 'Page'} {pagination.page} / {pagination.totalPages}</span>
              <button className="pagination-btn" disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          </div>
        )}
      </div>

      {formOpen && (
        <CustomerFormModal
          customer={editCustomer}
          onClose={() => setFormOpen(false)}
          onSuccess={() => { qc.invalidateQueries(['customers']); setFormOpen(false); }}
        />
      )}

      <ConfirmModal 
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={onConfirmDelete}
        loading={mutDelete.isPending}
        title={isAr ? 'حذف العميل' : 'Delete Customer'}
        message={isAr ? 'هل أنت متأكد من رغبتك في حذف هذا العميل؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this customer? This action cannot be undone.'}
        confirmLabel={isAr ? 'حذف نهائي' : 'Delete Permanent'}
      />
    </div>
  );
}
