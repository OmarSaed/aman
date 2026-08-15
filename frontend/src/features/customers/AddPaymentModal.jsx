// frontend/src/features/customers/AddPaymentModal.jsx
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { customersService } from '../../services/customers.service';
import Modal from '../../components/ui/Modal';

const AddPaymentModal = ({ customerId, customerName, onClose, onSuccess }) => {
  const { i18n } = useTranslation();
  const qc = useQueryClient();
  const isAr = i18n.language === 'ar';

  const [formData, setFormData] = useState({
    customerId,
    amount: '',
    notes: '',
    date: new Date().toISOString().split('T')[0],
  });

  const mut = useMutation({
    mutationFn: (data) => customersService.addPayment(data),
    onSuccess: () => {
      toast.success(isAr ? 'تم تسجيل الدفعة بنجاح' : 'Payment recorded successfully');
      qc.invalidateQueries(['customer-account', customerId]);
      qc.invalidateQueries(['customers']);
      onSuccess();
    },
    onError: (e) => toast.error(e.response?.data?.message || (isAr ? 'خطأ أثناء التسجيل' : 'Error recording'))
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (parseFloat(formData.amount) <= 0) {
      return toast.error(isAr ? 'المبلغ يجب أن يكون أكبر من الصفر' : 'Amount must be greater than zero');
    }
    mut.mutate(formData);
  };

  return (
    <Modal 
      isOpen={true} 
      title={isAr ? `إضافة دفعة/سلفة: ${customerName}` : `Add Payment/Advance: ${customerName}`} 
      onClose={onClose} 
      size="sm"
    >
      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
        <div className="form-group">
          <label className="label">{isAr ? 'المبلغ ($)' : 'Amount ($)'}</label>
          <input 
            required 
            type="number" 
            step="0.01" 
            className="input" 
            autoFocus
            value={formData.amount} 
            onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} 
          />
        </div>
        <div className="form-group">
          <label className="label">{isAr ? 'التاريخ' : 'Date'}</label>
          <input 
            required 
            type="date" 
            className="input" 
            value={formData.date} 
            onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} 
          />
        </div>
        <div className="form-group">
          <label className="label">{isAr ? 'ملاحظات' : 'Notes'}</label>
          <textarea 
            className="input" 
            rows="2" 
            placeholder={isAr ? 'مثال: سلفة نقدية، تحويل بنكي...' : 'e.g., Cash deposit, bank transfer...'}
            value={formData.notes} 
            onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))} 
          />
        </div>
        
        <div className="flex justify-end gap-3 mt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{isAr ? 'إلغاء' : 'Cancel'}</button>
          <button type="submit" className="btn btn-primary" disabled={mut.isPending}>
            {mut.isPending ? '...' : (isAr ? 'تسجيل الدفعة' : 'Record Payment')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AddPaymentModal;
