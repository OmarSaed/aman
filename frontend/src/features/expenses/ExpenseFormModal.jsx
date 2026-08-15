// frontend/src/features/expenses/ExpenseFormModal.jsx
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { expensesService } from '../../services/expenses.service';
import Modal from '../../components/ui/Modal';
import { Grid, Button, CircularProgress } from '@mui/material';

export default function ExpenseFormModal({ onClose, categories }) {
  const { i18n } = useTranslation();
  const qc = useQueryClient();
  const isAr = i18n.language === 'ar';

  const [formData, setFormData] = useState({
    categoryId: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    paymentMethod: 'CASH',
    reference: ''
  });

  const mutCreate = useMutation({
    mutationFn: (data) => expensesService.create(data),
    onSuccess: () => {
      toast.success(isAr ? 'تم تسجيل المصروف بنجاح' : 'Expense recorded successfully');
      qc.invalidateQueries(['expenses']);
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error recording expense')
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.categoryId || !formData.amount) {
      return toast.error(isAr ? 'برجاء ملء البيانات الأساسية' : 'Please fill required fields');
    }
    mutCreate.mutate(formData);
  };

  const footer = (
    <>
      <Button onClick={onClose} color="inherit">{isAr ? 'إلغاء' : 'Cancel'}</Button>
      <Button 
        variant="contained" 
        onClick={handleSubmit} 
        disabled={mutCreate.isPending}
        sx={{ minWidth: 120 }}
      >
        {mutCreate.isPending ? <CircularProgress size={20} color="inherit" /> : (isAr ? 'حفظ' : 'Save')}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isAr ? 'تسجيل مصروف جديد' : 'New Expense Record'}
      size="md"
      footer={footer}
    >
      <form onSubmit={handleSubmit} className="p-2">
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <div className="form-group">
              <label className="label">{isAr ? 'الفئة' : 'Category'} *</label>
              <select 
                className="select" 
                required
                value={formData.categoryId}
                onChange={e => setFormData(p => ({ ...p, categoryId: e.target.value }))}
              >
                <option value="">{isAr ? 'اختر الفئة' : 'Select Category'}</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{isAr ? (c.nameAr || c.name) : c.name}</option>
                ))}
              </select>
            </div>
          </Grid>

          <Grid item xs={12} md={6}>
            <div className="form-group">
              <label className="label">{isAr ? 'المبلغ' : 'Amount'} *</label>
              <input 
                type="number" step="0.01" className="input font-bold" 
                required placeholder="0.00"
                value={formData.amount}
                onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))}
              />
            </div>
          </Grid>

          <Grid item xs={12} md={6}>
            <div className="form-group">
              <label className="label">{isAr ? 'التاريخ' : 'Date'}</label>
              <input 
                type="date" className="input" 
                value={formData.date}
                onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
              />
            </div>
          </Grid>

          <Grid item xs={12} md={6}>
            <div className="form-group">
              <label className="label">{isAr ? 'طريقة الدفع' : 'Payment Method'}</label>
              <select 
                className="select" 
                value={formData.paymentMethod}
                onChange={e => setFormData(p => ({ ...p, paymentMethod: e.target.value }))}
              >
                <option value="CASH">{isAr ? 'نقدي' : 'Cash'}</option>
                <option value="CARD">{isAr ? 'بطاقة' : 'Card'}</option>
                <option value="BANK">{isAr ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                <option value="CHECK">{isAr ? 'شيك' : 'Check'}</option>
              </select>
            </div>
          </Grid>

          <Grid item xs={12}>
            <div className="form-group">
              <label className="label">{isAr ? 'ملاحظات' : 'Notes'}</label>
              <textarea 
                className="input" rows="3"
                placeholder={isAr ? 'وصف المصروف...' : 'Describe the expense...'}
                value={formData.notes}
                onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
              ></textarea>
            </div>
          </Grid>
        </Grid>
      </form>
    </Modal>
  );
}
