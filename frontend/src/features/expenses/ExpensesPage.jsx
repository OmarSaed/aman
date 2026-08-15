// frontend/src/features/expenses/ExpensesPage.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Search, Filter, Calendar, Receipt, 
  Trash2, CreditCard, Tag, Settings2 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { expensesService } from '../../services/expenses.service';
import ExpenseFormModal from './ExpenseFormModal';
import CategoryManagerModal from './CategoryManagerModal';
import Can from '../auth/Can';
import { ConfirmModal } from '../../components/ui/Modal';

export default function ExpensesPage() {
  const { i18n } = useTranslation();
  const qc = useQueryClient();
  const isAr = i18n.language === 'ar';

  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [categoryId, setCategoryId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [formOpen, setFormOpen] = useState(false);
  const [catOpen, setCatOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);

  const params = { page, limit, categoryId, startDate, endDate, search: searchQuery };

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', params],
    queryFn: () => expensesService.list(params).then(r => r.data),
  });

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => expensesService.listCategories().then(r => r.data),
  });

  const mutDelete = useMutation({
    mutationFn: (id) => expensesService.delete(id),
    onSuccess: () => {
      toast.success(isAr ? 'تم حذف المصروف' : 'Expense deleted');
      qc.invalidateQueries(['expenses']);
    }
  });

  const stats = data?.stats || { today: 0, month: 0, total: 0 };
  const expenses = data?.data || [];
  const pagination = data?.pagination;

  const handleDelete = (id) => {
    setExpenseToDelete(id);
    setDeleteModalOpen(true);
  };

  const onConfirmDelete = () => {
    if (expenseToDelete) {
      mutDelete.mutate(expenseToDelete);
      setDeleteModalOpen(false);
      setExpenseToDelete(null);
    }
  };

  return (
    <div className="animate-fade space-y-6 pb-10">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="flex items-center gap-2 mb-1">
             <span className="text-xs font-bold text-primary-600 uppercase tracking-widest">{isAr ? 'المحاسبة' : 'ACCOUNTING'}</span>
          </div>
          <h1>{isAr ? 'إدارة المصروفات' : 'Expense Management'}</h1>
          <p>{isAr ? 'تتبع تكاليف التشغيل والمصروفات النثرية' : 'Track operational costs and petty cash expenses'}</p>
        </div>
        <div className="flex items-center gap-2">
          <Can permission="expenses:manage-categories">
            <button className="btn btn-secondary" onClick={() => setCatOpen(true)}>
              <Settings2 size={16} /> {isAr ? 'الفئات' : 'Categories'}
            </button>
          </Can>
          <Can permission="expenses:create">
            <button className="btn btn-primary" onClick={() => setFormOpen(true)}>
              <Plus size={16} /> {isAr ? 'إضافة مصروف' : 'Add Expense'}
            </button>
          </Can>
        </div>
      </div>

      {/* ── Stats Summary ──────────────────────────────────────────────── */}
      <div className="stat-grid mb-6">
        {/* TODAY - Rose */}
        <div className="stat-card" style={{ background: 'var(--danger-light)', border: 'none' }}>
          <div className="stat-icon" style={{ background: 'var(--danger)', color: 'white' }}><Receipt size={24} /></div>
          <div className="stat-content">
            <div className="stat-label" style={{ color: '#991b1b' }}>{isAr ? 'مصروفات اليوم' : 'TODAY\'S EXPENSES'}</div>
            <div className="stat-value" style={{ color: '#991b1b' }}>{stats.today?.toLocaleString()} <small style={{ fontSize: '0.6em' }}>USD</small></div>
          </div>
        </div>

        {/* THIS MONTH - Orange */}
        <div className="stat-card" style={{ background: 'var(--warning-light)', border: 'none' }}>
          <div className="stat-icon" style={{ background: 'var(--warning)', color: 'white' }}><Calendar size={24} /></div>
          <div className="stat-content">
            <div className="stat-label" style={{ color: '#92400e' }}>{isAr ? 'مصروفات الشهر' : 'THIS MONTH'}</div>
            <div className="stat-value" style={{ color: '#92400e' }}>{stats.month?.toLocaleString()} <small style={{ fontSize: '0.6em' }}>USD</small></div>
          </div>
        </div>

        {/* TOTAL - Indigo */}
        <div className="stat-card" style={{ background: 'var(--primary-50)', border: 'none' }}>
          <div className="stat-icon" style={{ background: 'var(--primary-500)', color: 'white' }}><Tag size={24} /></div>
          <div className="stat-content">
            <div className="stat-label" style={{ color: 'var(--primary-700)' }}>{isAr ? 'إجمالي المصروفات' : 'TOTAL EXPENSES'}</div>
            <div className="stat-value" style={{ color: 'var(--primary-700)' }}>{stats.total?.toLocaleString()} <small style={{ fontSize: '0.6em' }}>USD</small></div>
          </div>
        </div>
      </div>

      {/* ── Filters & Search ─────────────────────────────────────────── */}
      <div className="card no-print">
        <div className="card-header flex flex-wrap gap-4 items-center justify-between" style={{ padding: '12px 16px' }}>
           <div className="flex items-center gap-4 flex-1 flex-wrap">
             {/* Category Select */}
             <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase">{isAr ? 'الفئة' : 'Category'}</label>
                <select 
                  className="input-field" 
                  style={{ width: '150px', height: '32px', fontSize: '12px' }}
                  value={categoryId} 
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">{isAr ? 'كل الفئات' : 'All Categories'}</option>
                  {categories?.data?.map(c => (
                    <option key={c.id} value={c.id}>{isAr ? (c.nameAr || c.name) : c.name}</option>
                  ))}
                </select>
             </div>

             {/* Dates */}
             <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase">{isAr ? 'من' : 'From'}</label>
                <input type="date" className="input-field" style={{ width: '130px', height: '32px', fontSize: '12px' }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
             </div>
             <div className="flex items-center gap-2">
                <label className="text-[10px] font-black text-slate-400 uppercase">{isAr ? 'إلى' : 'To'}</label>
                <input type="date" className="input-field" style={{ width: '130px', height: '32px', fontSize: '12px' }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
             </div>

             {/* Search */}
             <div style={{ width: '180px' }}>
               <input 
                 type="text" 
                 className="input-field" 
                 style={{ height: '32px', fontSize: '12px' }}
                 placeholder={isAr ? 'بحث...' : 'Search...'}
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
             </div>

             {/* Clear at the end */}
             <button className="btn btn-secondary" style={{ height: '32px', padding: '0 12px', fontSize: '11px', fontWeight: 700 }} onClick={() => { setCategoryId(''); setStartDate(''); setEndDate(''); setSearchQuery(''); setPage(1); }}>
                {isAr ? 'تصفية الكل' : 'Clear All'}
             </button>
           </div>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>{isAr ? 'التاريخ' : 'Date'}</th>
                <th>{isAr ? 'الفئة' : 'Category'}</th>
                <th>{isAr ? 'المبلغ' : 'Amount'}</th>
                <th>{isAr ? 'الوسيلة' : 'Method'}</th>
                <th>{isAr ? 'ملاحظات' : 'Notes'}</th>
                <th>{isAr ? 'بواسطة' : 'User'}</th>
                <th className="no-print"></th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={7} className="text-center py-12"><span className="loader loader-dark" /></td></tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 font-medium text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                       <Filter size={32} className="opacity-20" />
                       {isAr ? 'لا توجد مصروفات مطابقة' : 'No matching expenses found'}
                    </div>
                  </td>
                </tr>
              ) : (
                expenses.map(ex => (
                  <tr key={ex.id}>
                    <td>
                      <div className="text-xs font-bold text-slate-700">{new Date(ex.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">{new Date(ex.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td>
                      <span className="badge badge-primary" style={{ fontSize: '10px', fontWeight: 800 }}>
                        {isAr ? (ex.category?.nameAr || ex.category?.name) : ex.category?.name}
                      </span>
                    </td>
                    <td className="font-black text-danger">{parseFloat(ex.amount).toLocaleString()} <small style={{ fontSize: '10px' }}>USD</small></td>
                    <td>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600 uppercase">
                        <CreditCard size={12} className="text-slate-300" />
                        {ex.paymentMethod}
                      </div>
                    </td>
                    <td className="text-[11px] text-slate-500 max-w-[200px] truncate" title={ex.notes}>{ex.notes || '—'}</td>
                    <td>
                       <div className="flex items-center gap-2">
                          <div className="avatar avatar-sm" style={{ width: '20px', height: '20px', fontSize: '9px', background: 'var(--primary-400)' }}>
                             {ex.creator?.name?.substring(0, 1).toUpperCase()}
                          </div>
                          <span className="text-[11px] font-bold text-slate-600">{ex.creator?.name}</span>
                       </div>
                    </td>
                    <td className="no-print text-center">
                      <Can permission="expenses:delete">
                        <button className="btn btn-ghost btn-icon text-error h-8 w-8" onClick={() => handleDelete(ex.id)}>
                          <Trash2 size={14} />
                        </button>
                      </Can>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ────────────────────────────────────────────────── */}
        {!isLoading && pagination && (
          <div className="pagination no-print">
            <div className="pagination-info">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                {isAr ? `إجمالي ${pagination.total} مصروف` : `Total ${pagination.total} records`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                className="pagination-btn" 
                disabled={pagination.page <= 1}
                onClick={() => setPage(p => p - 1)}
              >
                ‹
              </button>
              <div className="px-3 text-xs font-black text-slate-700">
                {isAr ? 'صفحة' : 'Page'} {pagination.page} / {pagination.totalPages}
              </div>
              <button 
                className="pagination-btn" 
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                ›
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal 
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={onConfirmDelete}
        loading={mutDelete.isPending}
        title={isAr ? 'حذف المصروف' : 'Delete Expense'}
        message={isAr ? 'هل أنت متأكد من رغبتك في حذف هذا المصروف؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this expense? This action cannot be undone.'}
      />

      {formOpen && <ExpenseFormModal onClose={() => setFormOpen(false)} categories={categories?.data || []} />}
      {catOpen && <CategoryManagerModal onClose={() => setCatOpen(false)} />}
    </div>
  );
}
