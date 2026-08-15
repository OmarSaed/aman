// frontend/src/features/accounting/PaymentsPage.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { 
  ArrowUpRight, ArrowDownRight, Filter, Calendar, 
  Search, Download, Printer, DollarSign, PieChart, TrendingUp
} from 'lucide-react';
import { accountingService } from '../../services/accounting.service';

export default function PaymentsPage() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const params = { page, limit, startDate, endDate, search: searchQuery };

  const { data, isLoading } = useQuery({
    queryKey: ['unified-transactions', params],
    queryFn: () => accountingService.listTransactions(params).then(r => r.data),
  });

  const transactions = Array.isArray(data?.data) ? data.data : (data?.data?.data || []);
  const pagination = data?.pagination || data?.data;

  // Simple stats calculation for the current view
  const totalIn = Array.isArray(transactions) ? transactions.filter(t => t.direction === 'IN').reduce((sum, t) => sum + t.amount, 0) : 0;
  const totalOut = Array.isArray(transactions) ? transactions.filter(t => t.direction === 'OUT').reduce((sum, t) => sum + t.amount, 0) : 0;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="animate-fade space-y-6 pb-10">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="page-header">
        <div className="page-header-left">
          <div className="flex items-center gap-2 mb-1">
             <span className="text-xs font-bold text-primary-600 uppercase tracking-widest">{isAr ? 'المحاسبة' : 'ACCOUNTING'}</span>
          </div>
          <h1>{isAr ? 'سجل المدفوعات الموحد' : 'Unified Payments Ledger'}</h1>
          <p>{isAr ? 'عرض شامل لكافة التدفقات النقدية الداخلة والخارجة' : 'Comprehensive view of all financial inflows and outflows'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary btn-icon" onClick={handlePrint} title={isAr ? 'طباعة' : 'Print'}>
            <Printer size={16} />
          </button>
          <button className="btn btn-secondary" title={isAr ? 'تصدير' : 'Export Data'}>
            <Download size={16} /> {isAr ? 'تصدير' : 'Export'}
          </button>
        </div>
      </div>

      {/* ── Dashboard Stats ────────────────────────────────────────────── */}
      <div className="stat-grid mb-6">
        {/* TOTAL INFLOW - Emerald */}
        <div className="stat-card" style={{ background: 'var(--success-light)', border: 'none' }}>
          <div className="stat-icon" style={{ background: 'var(--success)', color: 'white' }}><ArrowUpRight size={24} /></div>
          <div className="stat-content">
            <div className="stat-label" style={{ color: '#065f46' }}>{isAr ? 'إجمالي المقبوضات' : 'TOTAL INFLOW'}</div>
            <div className="stat-value" style={{ color: '#065f46' }}>+{totalIn.toLocaleString()} <small style={{ fontSize: '0.6em' }}>USD</small></div>
          </div>
        </div>

        {/* TOTAL OUTFLOW - Rose */}
        <div className="stat-card" style={{ background: 'var(--danger-light)', border: 'none' }}>
          <div className="stat-icon" style={{ background: 'var(--danger)', color: 'white' }}><ArrowDownRight size={24} /></div>
          <div className="stat-content">
            <div className="stat-label" style={{ color: '#991b1b' }}>{isAr ? 'إجمالي المدفوعات' : 'TOTAL OUTFLOW'}</div>
            <div className="stat-value" style={{ color: '#991b1b' }}>-{totalOut.toLocaleString()} <small style={{ fontSize: '0.6em' }}>USD</small></div>
          </div>
        </div>

        {/* NET FLOW - Indigo */}
        <div className="stat-card" style={{ background: 'var(--primary-50)', border: 'none' }}>
          <div className="stat-icon" style={{ background: 'var(--primary-500)', color: 'white' }}><TrendingUp size={24} /></div>
          <div className="stat-content">
            <div className="stat-label" style={{ color: 'var(--primary-700)' }}>{isAr ? 'صافي التدفق' : 'NET CASH FLOW'}</div>
            <div className="stat-value" style={{ color: 'var(--primary-700)' }}>{(totalIn - totalOut).toLocaleString()} <small style={{ fontSize: '0.6em' }}>USD</small></div>
          </div>
        </div>
      </div>

      {/* ── Filters & Search ─────────────────────────────────────────── */}
      <div className="card no-print">
        <div className="card-header flex flex-wrap gap-4 items-center justify-between" style={{ padding: '12px 16px' }}>
           <div className="flex items-center gap-4 flex-1 flex-wrap">
             {/* Dates */}
             <div className="flex items-center gap-3">
               <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase">{isAr ? 'من' : 'From'}</label>
                  <input type="date" className="input-field" style={{ width: '130px', height: '32px', fontSize: '12px' }} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
               </div>
               <div className="flex items-center gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase">{isAr ? 'إلى' : 'To'}</label>
                  <input type="date" className="input-field" style={{ width: '130px', height: '32px', fontSize: '12px' }} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
               </div>
             </div>

             {/* Search */}
             <div style={{ width: '200px' }}>
               <input 
                 type="text" 
                 className="input-field" 
                 style={{ height: '32px', fontSize: '12px' }}
                 placeholder={isAr ? 'ابحث عن حركة...' : 'Search transactions...'}
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
             </div>

             {/* Clear at the end */}
             <button className="btn btn-secondary" style={{ height: '32px', padding: '0 12px', fontSize: '11px', fontWeight: 700 }} onClick={() => { setStartDate(''); setEndDate(''); setSearchQuery(''); setPage(1); }}>
                {isAr ? 'تصفية الكل' : 'Clear All'}
             </button>
           </div>
        </div>

        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>{isAr ? 'التاريخ' : 'Date'}</th>
                <th>{isAr ? 'النوع' : 'Type'}</th>
                <th>{isAr ? 'الجهة / الطرف' : 'Party'}</th>
                <th>{isAr ? 'المبلغ' : 'Amount'}</th>
                <th>{isAr ? 'ملاحظات' : 'Notes'}</th>
                <th className="text-center">{isAr ? 'الوحدة' : 'Module'}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} className="text-center py-12"><span className="loader loader-dark" /></td></tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 font-medium text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                       <Filter size={32} className="opacity-20" />
                       {isAr ? 'لا توجد حركات مالية مطابقة' : 'No matching transactions found'}
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map(t => (
                  <tr key={t.id}>
                    <td>
                      <div className="text-xs font-bold text-slate-700">{new Date(t.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold">{new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {t.direction === 'IN' ? (
                          <div className="w-5 h-5 rounded bg-success-light text-success flex items-center justify-center"><ArrowUpRight size={13} /></div>
                        ) : (
                          <div className="w-5 h-5 rounded bg-danger-light text-danger flex items-center justify-center"><ArrowDownRight size={13} /></div>
                        )}
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight">
                          {isAr ? (
                            t.type === 'CUSTOMER_PAYMENT' ? 'دفعة عميل' : 
                            t.type === 'SUPPLIER_PAYMENT' ? 'دفعة مورد' : 
                            t.type === 'EXPENSE' ? 'نثرية' : t.type
                          ) : t.type.replace('_', ' ')}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div className="text-[13px] font-bold text-slate-800">{t.party}</div>
                      <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{t.subType}</div>
                    </td>
                    <td>
                      <span className={`text-sm font-black ${t.direction === 'IN' ? 'text-success' : 'text-danger'}`}>
                        {t.direction === 'IN' ? '+' : '-'}{t.amount.toLocaleString()} <small style={{ fontSize: '10px' }}>USD</small>
                      </span>
                    </td>
                    <td className="text-[11px] text-slate-500 max-w-[200px] truncate" title={t.notes}>{t.notes || '—'}</td>
                    <td className="text-center">
                      <span className="badge badge-secondary" style={{ textTransform: 'uppercase', fontSize: '9px', fontWeight: 800 }}>
                        {t.module}
                      </span>
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
                {isAr ? `إجمالي ${pagination.total} حركة` : `Total ${pagination.total} records`}
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
    </div>
  );
}
