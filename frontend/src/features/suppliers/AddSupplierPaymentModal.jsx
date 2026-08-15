// frontend/src/features/suppliers/AddSupplierPaymentModal.jsx
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { suppliersService } from '../../services/suppliers.service';
import Modal from '../../components/ui/Modal';
import { Button, Grid, CircularProgress, Alert } from '@mui/material';

export default function AddSupplierPaymentModal({ supplierId, supplierName, onClose, onSuccess }) {
  const { i18n } = useTranslation();
  const qc = useQueryClient();
  const isAr = i18n.language === 'ar';

  const [formData, setFormData] = useState({
    supplierId,
    amount: '',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  const mutAdd = useMutation({
    mutationFn: (data) => suppliersService.addPayment(data),
    onSuccess: () => {
      toast.success(isAr ? 'تم تسجيل الدفعة للمورد بنجاح' : 'Supplier payment recorded successfully');
      qc.invalidateQueries(['supplier-account', supplierId]);
      qc.invalidateQueries(['suppliers']);
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error adding payment')
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.amount) return toast.error(isAr ? 'يجب إدخال المبلغ' : 'Amount is required');
    mutAdd.mutate(formData);
  };

  const footer = (
    <>
      <Button onClick={onClose} color="inherit">{isAr ? 'إلغاء' : 'Cancel'}</Button>
      <Button 
        variant="contained" 
        onClick={handleSubmit} 
        disabled={mutAdd.isPending}
        sx={{ minWidth: 120 }}
      >
        {mutAdd.isPending ? <CircularProgress size={20} color="inherit" /> : (isAr ? 'تأكيد الدفع' : 'Record Payment')}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isAr ? 'تسجيل دفعة مورد' : 'Record Supplier Payment'}
      size="sm"
      footer={footer}
    >
      <div className="p-2 space-y-4">
        <Alert severity="info" sx={{ '& .MuiAlert-message': { fontSize: '0.75rem', fontWeight: 600 } }}>
          {isAr ? 'الدفعات تزيد من رصيد المورد (تقلل من الديون المستحقة له).' : 'Payments increase the supplier balance (reducing the debt owed to them).'}
        </Alert>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <div className="form-group">
                <label className="label">{isAr ? 'المبلغ المسدد (EGP)' : 'Payment Amount (EGP)'} *</label>
                <input 
                  type="number" step="0.01" className="input font-black"
                  required placeholder="0.00"
                  value={formData.amount}
                  onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))}
                />
              </div>
            </Grid>

            <Grid item xs={12}>
              <div className="form-group">
                <label className="label">{isAr ? 'تاريخ الدفع' : 'Payment Date'}</label>
                <input 
                  type="date" className="input"
                  value={formData.date}
                  onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                />
              </div>
            </Grid>

            <Grid item xs={12}>
              <div className="form-group">
                <label className="label">{isAr ? 'ملاحظات' : 'Notes'}</label>
                <textarea 
                  className="input" rows="2"
                  placeholder={isAr ? 'مثل رقم الشيك أو وسيلة الدفع...' : 'e.g. check number or payment method...'}
                  value={formData.notes}
                  onChange={e => setFormData(p => ({ ...p, notes: e.target.value }))}
                ></textarea>
              </div>
            </Grid>
          </Grid>
        </form>
      </div>
    </Modal>
  );
}
