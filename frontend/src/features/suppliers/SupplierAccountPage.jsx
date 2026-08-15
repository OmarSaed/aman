// frontend/src/features/suppliers/SupplierAccountPage.jsx
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { 
  ArrowLeft, Printer, Plus, Phone, Mail, 
  MapPin, Calendar, CreditCard, ChevronRight, 
  ArrowUpRight, ArrowDownRight, Wallet, ShieldCheck, 
  PackageCheck, Receipt
} from 'lucide-react';
import { suppliersService } from '../../services/suppliers.service';
import AddSupplierPaymentModal from './AddSupplierPaymentModal';
import Can from '../auth/Can';

export default function SupplierAccountPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['supplier-account', id, { page, limit }],
    queryFn: () => suppliersService.getAccount(id, { page, limit }).then(r => r.data),
  });

  const supplier = data?.supplier;
  const transactions = data?.transactions || data?.data || [];
  const balance = parseFloat(supplier?.balance || 0);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) return <div className="flex items-center justify-center h-64"><span className="loader loader-dark" /></div>;
  if (!supplier) return <div className="p-10 text-center text-slate-500 font-bold">{isAr ? 'المورد غير موجود' : 'Supplier not found'}</div>;

  return (
    <div className="animate-fade space-y-6 pb-20">
      {/* ── Page Header ────────────────────────────────────────────────── */}
      <div className="page-header no-print">
        <div className="page-header-left">
          <button onClick={() => navigate('/vendors')} className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-primary-600 transition-colors mb-2 uppercase tracking-widest">
            <ArrowLeft size={14} /> {isAr ? 'العودة للموردين' : 'Back to Suppliers'}
          </button>
          <div className="flex items-center gap-3">
             <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-xl shadow-lg border-2 border-white">
               {supplier.name.charAt(0)}
             </div>
             <div>
               <h1 className="text-2xl font-black text-slate-800 leading-tight">{supplier.name}</h1>
               <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{isAr ? 'كشف حساب مورد' : 'Supplier Account Statement'}</p>
             </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn btn-secondary btn-icon h-11 w-11 shadow-sm border-slate-200" onClick={handlePrint}>
            <Printer size={18} />
          </button>
          <Can permission="payments:process">
            <button className="btn btn-primary h-11 px-6 shadow-lg shadow-primary-100" onClick={() => setPaymentModalOpen(true)}>
              <Plus size={18} /> {isAr ? 'تسجيل دفع' : 'Add Payment'}
            </button>
          </Can>
        </div>
      </div>

      {/* ── Account Summary Grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 no-print">
        {/* Contact info */}
        <div className="glass-card p-5 border-l-4 border-slate-400">
           <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center"><Phone size={16}/></div>
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{isAr ? 'بيانات التواصل' : 'CONTACT INFO'}</h4>
           </div>
           <div className="space-y-2">
              <div className="text-sm font-bold text-slate-700">{supplier.contactInfo || '—'}</div>
              <div className="text-xs text-slate-400 font-medium">Joined: {new Date(supplier.createdAt).toLocaleDateString()}</div>
           </div>
        </div>

        {/* Balance */}
        <div className={`glass-card p-5 border-l-4 ${balance < 0 ? 'border-danger' : 'border-success'}`}>
           <div className="flex items-center gap-3 mb-4">
              <div className={`w-8 h-8 rounded-lg ${balance < 0 ? 'bg-danger-light text-danger' : 'bg-success-light text-success'} flex items-center justify-center`}><Wallet size={16}/></div>
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{isAr ? 'الرصيد الحالي' : 'ACCOUNT BALANCE'}</h4>
           </div>
           <div className={`text-2xl font-black ${balance < 0 ? 'text-danger' : 'text-success'}`}>
              {balance.toLocaleString()} <small className="text-xs font-medium text-slate-400 uppercase">EGP</small>
           </div>
           <div className="text-[10px] font-black text-slate-400 mt-1 uppercase tracking-tighter">
             {balance < 0 ? (isAr ? 'مستحق للمورد' : 'CREDIT OWE TO VENDOR') : (isAr ? 'رصيد دائن' : 'DEBIT BALANCE')}
           </div>
        </div>

        {/* Account Status */}
        <div className="glass-card p-5 border-l-4 border-blue-500">
           <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-500 flex items-center justify-center"><ShieldCheck size={16}/></div>
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{isAr ? 'حالة الحساب' : 'ACCOUNT STATUS'}</h4>
           </div>
           <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
              <span className="text-sm font-black text-slate-700 uppercase tracking-tight">{isAr ? 'نشط' : 'ACTIVE'}</span>
           </div>
           <div className="text-xs text-slate-400 font-bold mt-2 uppercase tracking-widest">{isAr ? 'عضوية موثوقة' : 'TRUSTED VENDOR'}</div>
        </div>

        {/* Orders Analytics */}
        <div className="glass-card p-5 border-l-4 border-indigo-500">
           <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center"><PackageCheck size={16}/></div>
              <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{isAr ? 'إحصائيات' : 'STATISTICS'}</h4>
           </div>
           <div className="text-xl font-black text-indigo-600">
              {supplier._count?.purchaseOrders || 0} <small className="text-xs font-bold text-slate-400 uppercase tracking-tighter">{isAr ? 'طلب' : 'ORDERS'}</small>
           </div>
           <div className="text-[10px] text-slate-400 font-bold mt-1 uppercase tracking-widest">{isAr ? 'إجمالي المعاملات' : 'LIFETIME VOLUME'}</div>
        </div>
      </div>

      {/* ── Financial Ledger ───────────────────────────────────────────── */}
      <div className="card overflow-hidden financial-ledger shadow-xl border-slate-100">
        <div className="p-5 border-b border-slate-50 flex items-center justify-between no-print bg-slate-50/50">
           <div className="flex items-center gap-2">
              <Receipt size={18} className="text-primary-600" />
              <h3 className="font-black text-slate-800 text-sm tracking-tight">{isAr ? 'كشف الحساب المالي' : 'Financial Ledger Statement'}</h3>
           </div>
        </div>

        {/* Printable Header */}
        <div className="print-only">
          <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-8">
            <div>
              <h1 className="text-4xl font-black text-slate-900 mb-2">AMAN ERP</h1>
              <p className="text-lg font-bold text-slate-500 uppercase tracking-[0.2em]">{isAr ? 'كشف حساب مورد' : 'Supplier Statement'}</p>
            </div>
            <div className="text-right">
              <h2 className="text-2xl font-black text-slate-900">{supplier.name}</h2>
              <p className="text-slate-500 font-bold">{new Date().toLocaleDateString(isAr ? 'ar-EG' : 'en-US', { dateStyle: 'long' })}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-10 mb-10">
             <div className="bg-slate-50 p-6 rounded-2xl border-2 border-slate-100">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">{isAr ? 'بيانات المورد' : 'SUPPLIER DETAILS'}</h4>
                <div className="space-y-2">
                   <div className="text-lg font-black text-slate-800">{supplier.name}</div>
                   <div className="text-sm font-bold text-slate-500">{supplier.contactInfo || 'N/A'}</div>
                </div>
             </div>
             <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-2xl">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">{isAr ? 'الرصيد المستحق' : 'OUTSTANDING BALANCE'}</h4>
                <div className="text-4xl font-black">{Math.abs(balance).toLocaleString()} <small className="text-sm font-medium opacity-50 uppercase">EGP</small></div>
                <p className="text-[10px] font-bold opacity-60 mt-2 uppercase tracking-widest">
                  {balance < 0 ? (isAr ? 'مبلغ مستحق للمورد' : 'NET DEBT TO VENDOR') : (isAr ? 'رصيد دائن للمحل' : 'CREDIT BALANCE TO STORE')}
                </p>
             </div>
          </div>
        </div>

        <div className="table-wrapper">
          <table className="table table-ledger">
            <thead className="bg-slate-50">
              <tr>
                <th className="w-[150px]">{isAr ? 'التاريخ' : 'Date'}</th>
                <th>{isAr ? 'البيان / المرجع' : 'Description / Ref'}</th>
                <th className="text-center w-[120px]">{isAr ? 'النوع' : 'Type'}</th>
                <th className="text-right w-[150px]">{isAr ? 'المبلغ' : 'Amount'}</th>
                <th className="text-right w-[150px]">{isAr ? 'الرصيد بعد' : 'Balance After'}</th>
                <th className="no-print w-[100px]">{isAr ? 'بواسطة' : 'User'}</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-20 font-medium text-slate-400 uppercase tracking-widest">{isAr ? 'لا توجد حركات مالية' : 'No transactions found'}</td></tr>
              ) : (
                transactions.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-0">
                    <td>
                      <div className="text-xs font-bold text-slate-700">{new Date(t.date).toLocaleDateString(isAr ? 'ar-EG' : 'en-US')}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{new Date(t.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td>
                      <div className="text-xs font-bold text-slate-800">{t.notes || (!t.referenceId ? '—' : '')}</div>
                      {t.referenceId && (
                        <div className="flex items-center gap-1 mt-1">
                           <span className="text-[10px] font-black text-primary-600 bg-primary-50 px-1.5 rounded uppercase tracking-tighter">{t.referenceId}</span>
                        </div>
                      )}
                    </td>
                    <td className="text-center">
                      <span className={`ledger-badge ${
                        t.type === 'PAYMENT' ? 'bg-success-light text-success' : 
                        t.type === 'RETURN' ? 'bg-indigo-50 text-indigo-600' : 
                        'bg-danger-light text-danger'
                      } text-[9px] font-black uppercase px-2 py-1 rounded inline-block tracking-tighter`}>
                        {isAr ? (
                          t.type === 'PAYMENT' ? 'دفعة مسددة' : 
                          t.type === 'PURCHASE' ? 'فاتورة شراء' : 
                          t.type === 'RETURN' ? 'مرتجع شراء' : t.type
                        ) : t.type}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className={`text-sm font-black ${t.type === 'PAYMENT' || t.type === 'RETURN' ? 'text-success' : 'text-danger'}`}>
                        {t.type === 'PAYMENT' || t.type === 'RETURN' ? '+' : '-'}{parseFloat(t.amount).toLocaleString()}
                      </div>
                    </td>
                    <td className="text-right">
                      <div className="text-sm font-black text-slate-800">{parseFloat(t.balanceAfter).toLocaleString()}</div>
                    </td>
                    <td className="no-print text-xs font-bold text-slate-500 italic">
                      {t.creator?.name}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {paymentModalOpen && (
        <AddSupplierPaymentModal 
          supplierId={supplier.id} 
          supplierName={supplier.name}
          onClose={() => setPaymentModalOpen(false)}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}
