// frontend/src/features/customers/CustomerAccountPage.jsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, Wallet, Plus, Calendar, FileText, 
  TrendingUp, Clock, User, 
  Phone, Printer, Search, RotateCcw
} from 'lucide-react';
import { customersService } from '../../services/customers.service';
import { formatCurrency } from '../../utils/format';
import AddPaymentModal from './AddPaymentModal';
import ResetCustomerModal from './ResetCustomerModal';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

export default function CustomerAccountPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  const resetMut = useMutation({
    mutationFn: (data) => customersService.resetAccount(id, data),
    onSuccess: () => {
      toast.success(isAr ? 'تم تصفير الحساب بنجاح' : 'Account reset successfully');
      setResetModalOpen(false);
      refetch();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error resetting account')
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customer-account', id, { page, limit, search }],
    queryFn: () => customersService.getAccount(id, { page, limit, search }).then(r => r.data),
  });

  const customer = data?.customer;
  const transactions = data?.data || [];
  const pagination = data?.pagination;

  const handlePrint = () => {
    window.print();
  };

  if (isLoading && !customer) {
    return <div className="flex items-center justify-center min-h-[400px]"><span className="loader loader-dark" /></div>;
  }

  return (
    <div className="animate-fade space-y-8 pb-10">
      {/* ── Print-only Header ────────────────────────────────────────── */}
      <div className="print-only mb-8 text-center border-b-2 border-slate-900 pb-6">
        <div className="text-3xl font-black tracking-tighter mb-1">AMAN ERP</div>
        <div className="text-sm font-bold uppercase tracking-widest text-slate-500">Official Account Statement</div>
        <div className="flex items-center justify-between mt-6 text-xs text-slate-400">
          <div>{isAr ? 'تاريخ الكشف' : 'Statement Date'}: {new Date().toLocaleDateString()}</div>
          <div>{isAr ? 'رقم العميل' : 'Customer ID'}: #{customer?.id.substring(0, 8)}</div>
        </div>
      </div>

      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="page-header no-print">
        <div className="page-header-left">
          <div className="flex items-center gap-2 mb-1">
             <button className="btn btn-ghost btn-icon p-0 h-auto" onClick={() => navigate('/customers')}>
               <ArrowLeft size={16} className={isAr ? 'rotate-180' : ''} />
             </button>
             <span className="text-xs font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:text-primary transition-colors" onClick={() => navigate('/customers')}>
               {isAr ? 'العملاء' : 'Customers'}
             </span>
             <span className="text-slate-300">/</span>
             <span className="text-xs font-bold text-primary-600 uppercase tracking-widest">{customer?.name}</span>
          </div>
          <h1>{customer?.name}</h1>
          <p>{isAr ? 'كشف الحساب التفصيلي وحركات الرصيد' : 'Detailed statement and financial history'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-outline" style={{ borderColor: 'var(--danger)', color: 'var(--danger)', gap: '4px' }} onClick={() => setResetModalOpen(true)}>
             <RotateCcw size={16} /> {isAr ? 'تصفير الحساب' : 'Reset Account'}
          </button>
          <button className="btn btn-secondary btn-icon" onClick={handlePrint} title={isAr ? 'طباعة' : 'Print'}>
            <Printer size={16} />
          </button>
          <button className="btn btn-primary" onClick={() => setPaymentModalOpen(true)}>
            <Plus size={16} /> {isAr ? 'إضافة دفعة/سلفة' : 'Add Payment'}
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/customers')}>
            {isAr ? 'رجوع' : 'Back'}
          </button>
        </div>
      </div>

      {/* ── Stat Cards Row ────────────────────────────────────────── */}
      <div className="stat-grid no-print mb-6">
         {/* Card 1: Balance */}
        <div className="stat-card" style={{ background: customer?.balance > 0 ? 'var(--danger-light)' : 'var(--success-light)', border: 'none' }}>
           <div className="stat-icon" style={{ background: customer?.balance > 0 ? 'var(--danger)' : 'var(--success)', color: 'white' }}>
             <Wallet size={24} />
           </div>
           <div className="stat-content">
             <div className="stat-label" style={{ color: customer?.balance > 0 ? '#7f1d1d' : '#065f46' }}>{isAr ? 'الرصيد' : 'TOTAL BALANCE'} {customer?.balance > 0 ? (isAr ? '(مدين)' : '(Owes You)') : (customer?.balance < 0 ? (isAr ? '(دائن)' : '(Credit)') : '')}</div>
             <div className="stat-value" style={{ color: customer?.balance > 0 ? '#7f1d1d' : '#065f46' }}>
               {formatCurrency(Math.abs(customer?.balance || 0))}
             </div>
           </div>
        </div>

        {/* Card 2: Contact Info */}
        <div className="stat-card" style={{ background: 'var(--primary-50)', border: 'none' }}>
           <div className="stat-icon" style={{ background: 'var(--primary-500)', color: 'white' }}>
             <User size={24} />
           </div>
           <div className="stat-content">
             <div className="stat-label" style={{ color: 'var(--primary-700)' }}>{isAr ? 'بيانات التواصل' : 'CONTACT INFO'}</div>
             <div className="stat-value" style={{ fontSize: '14px', color: 'var(--primary-700)' }}>{customer?.phone || '—'}</div>
             <div className="stat-change" style={{ color: 'var(--primary-600)' }}>{customer?.email || '—'}</div>
           </div>
        </div>

        {/* Card 3: Status */}
        <div className="stat-card" style={{ background: 'var(--info-light)', border: 'none' }}>
           <div className="stat-icon" style={{ background: 'var(--info)', color: 'white' }}>
             <TrendingUp size={24} />
           </div>
           <div className="stat-content">
             <div className="stat-label" style={{ color: '#1e3a8a' }}>{isAr ? 'حالة الحساب' : 'ACCOUNT STATUS'}</div>
             <div className="stat-value" style={{ color: '#1e3a8a' }}>{isAr ? 'نشط' : 'ACTIVE'}</div>
             <div className="badge badge-primary mt-1">{customer?.type || 'NORMAL'}</div>
           </div>
        </div>

        {/* Card 4: Action / Info */}
        <div className="stat-card" style={{ background: '#0f172a', border: 'none' }}>
           <div className="stat-icon" style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}>
             <Calendar size={24} />
           </div>
           <div className="stat-content">
             <div className="stat-label" style={{ color: 'rgba(255,255,255,0.6)' }}>{isAr ? 'منذ تاريخ' : 'SINCE'}</div>
             <div className="stat-value" style={{ color: 'white', fontSize: '18px' }}>{new Date(customer?.createdAt).toLocaleDateString()}</div>
             <button className="btn btn-ghost btn-sm p-0 mt-2" style={{ color: 'var(--primary-400)', borderBottom: '1px solid currentColor', borderRadius: 0 }} onClick={handlePrint}>
               {isAr ? 'طباعة كشف' : 'Print Statement'}
             </button>
           </div>
        </div>
      </div>

      {/* ── Ledger Card ───────────────────────────────────────────── */}
      <div className="card shadow-md">
        <div className="card-header bg-slate-50">
          <div>
            <h2 className="card-title flex items-center gap-2">
              <FileText size={18} className="text-primary-500" />
              {isAr ? 'سجل الحركات المالية' : 'Financial Ledger Statement'}
            </h2>
          </div>
          
          <div className="input-with-icon no-print" style={{ width: '300px' }}>
            <Search className="input-icon" size={16} />
            <input 
              type="text"
              placeholder={isAr ? 'بحث في الحركات...' : 'Search transactions...'}
              className="input"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
        
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>{isAr ? 'التاريخ' : 'Date'}</th>
                <th>{isAr ? 'النوع' : 'Type'}</th>
                <th>{isAr ? 'البيان' : 'Description'}</th>
                <th className="text-center">{isAr ? 'المبلغ' : 'Amount'}</th>
                <th className="text-center">{isAr ? 'الرصيد بعد' : 'Balance After'}</th>
                <th>{isAr ? 'الموظف' : 'By'}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-20 text-slate-400 italic">{isAr ? 'لا توجد حركات مسجلة' : 'No recorded movements'}</td></tr>
              ) : [...transactions].reverse().map(t => (
                <tr key={t.id}>
                  <td className="font-medium">
                    <div className="flex items-center gap-2">
                       <Calendar size={14} className="text-slate-300" />
                       {new Date(t.date).toLocaleDateString()}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${t.type === 'PAYMENT' ? 'badge-success' : 'badge-danger'}`}>
                       {t.type === 'PAYMENT' ? (isAr ? 'إيداع' : 'PAYMENT') : (isAr ? 'بيع' : 'SALE')}
                    </span>
                  </td>
                  <td className="truncate italic" style={{ maxWidth: '300px' }} title={t.notes}>{t.notes || '—'}</td>
                  <td className={`font-bold text-center ${t.type === 'PAYMENT' ? 'text-success' : 'text-danger'}`}>
                    {formatCurrency(t.amount)}
                  </td>
                  <td className={`font-bold text-center ${t.balanceAfter > 0 ? 'text-danger' : 'text-success'}`}>
                    {formatCurrency(Math.abs(t.balanceAfter))}
                    {t.balanceAfter > 0 && <span className="text-[10px] ml-1 opacity-70">({isAr ? 'مدين' : 'Debt'})</span>}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="avatar avatar-sm" style={{ background: 'var(--primary-400)' }}>
                         {t.creator?.name?.substring(0, 1).toUpperCase() || 'S'}
                      </div>
                      <span className="text-xs">{t.creator?.name || 'System'}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination && (
          <div className="pagination no-print">
            <div className="pagination-info">
              <span className="text-xs mr-4">{isAr ? 'عرض' : 'Show'}</span>
              <select 
                value={limit} 
                onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}
                className="select" style={{ width: '70px', display: 'inline-block' }}
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <button className="pagination-btn" disabled={!pagination.hasPrev} onClick={() => { setPage(p => p - 1); }}>‹</button>
              <div className="px-3 text-xs font-bold">{isAr ? 'صفحة' : 'Page'} {pagination.page} / {pagination.totalPages}</div>
              <button className="pagination-btn" disabled={!pagination.hasNext} onClick={() => { setPage(p => p + 1); }}>›</button>
            </div>
          </div>
        )}
      </div>

      {paymentModalOpen && (
        <AddPaymentModal
          customerId={customer.id}
          customerName={customer.name}
          onClose={() => setPaymentModalOpen(false)}
          onSuccess={() => { refetch(); setPaymentModalOpen(false); }}
        />
      )}

      {resetModalOpen && (
        <ResetCustomerModal
          open={resetModalOpen}
          onClose={() => setResetModalOpen(false)}
          onConfirm={(data) => resetMut.mutate(data)}
          isPending={resetMut.isPending}
          customerName={customer?.name}
        />
      )}
    </div>
  );
}
