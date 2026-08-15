import React, { useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, MenuItem, InputAdornment, Alert, Typography } from '@mui/material';
import { DollarSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/format';

export default function AddPaymentModal({ open, onClose, onSave, order }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [notes, setNotes] = useState('');

  React.useEffect(() => {
    if (open && order) {
      setAmount(order.balanceDue);
      setPaymentMethod('CASH');
      setNotes('');
    }
  }, [open, order]);

  if (!order) return null;

  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ sx: { borderRadius: 3, width: '100%', maxWidth: 400 } }}>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {isAr ? 'إضافة دفعة' : 'Add Payment'}
      </DialogTitle>
      <DialogContent dividers>
        <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
          <Typography variant="body2">
            {isAr ? 'المبلغ المتبقي:' : 'Balance Due:'}
            <b style={{ marginLeft: 4 }}>{formatCurrency(order.balanceDue, order.currency)}</b>
          </Typography>
        </Alert>

        <TextField
          fullWidth
          label={isAr ? 'المبلغ' : 'Amount'}
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          sx={{ mb: 2 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><DollarSign size={16}/></InputAdornment>
          }}
        />

        <TextField
          select
          fullWidth
          label={isAr ? 'طريقة الدفع' : 'Payment Method'}
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          sx={{ mb: 2 }}
        >
          <MenuItem value="CASH">{isAr ? 'نقدي (يرتبط بالصندوق)' : 'Cash (Updates Daybox)'}</MenuItem>
          <MenuItem value="CARD">{isAr ? 'بطاقة' : 'Card'}</MenuItem>
          <MenuItem value="BANK_TRANSFER">{isAr ? 'حوالة بنكية' : 'Bank Transfer'}</MenuItem>
        </TextField>

        <TextField
          fullWidth
          multiline
          rows={2}
          label={isAr ? 'الملاحظات' : 'Notes'}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit">{isAr ? 'إلغاء' : 'Cancel'}</Button>
        <Button 
          variant="contained" 
          onClick={() => onSave({ amount: Number(amount), paymentMethod, notes })}
        >
          {isAr ? 'تأكيد ودفع' : 'Confirm Payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
