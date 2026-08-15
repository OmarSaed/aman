// frontend/src/features/customers/ResetCustomerModal.jsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, FormControlLabel, Checkbox } from '@mui/material';
import { AlertTriangle, Trash2 } from 'lucide-react';

export default function ResetCustomerModal({ open, onClose, onConfirm, isPending, customerName }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  
  const [deleteHistory, setDeleteHistory] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm({ deleteHistory });
  };

  return (
    <Dialog open={open} onClose={!isPending ? onClose : undefined} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, color: 'error.main', pb: 1 }}>
        <AlertTriangle size={24} />
        <Typography variant="h6" fontWeight={800}>
          {isAr ? 'تصفير حساب العميل' : 'Reset Customer Account'}
        </Typography>
      </DialogTitle>
      
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 1 }}>
          <Typography variant="body1" mb={3}>
            {isAr 
              ? `أنت على وشك تصفير رصيد العميل (${customerName}). هذه العملية ستعيد رصيد العميل إلى 0.` 
              : `You are about to reset the balance for customer (${customerName}). This will return their balance to 0.`}
          </Typography>

          <Box sx={{ p: 2, bgcolor: 'error.50', border: '1px solid', borderColor: 'error.200', borderRadius: 2 }}>
            <FormControlLabel
              control={
                <Checkbox 
                  color="error" 
                  checked={deleteHistory} 
                  onChange={(e) => setDeleteHistory(e.target.checked)} 
                />
              }
              label={
                <Box>
                  <Typography variant="subtitle2" color="error.900" fontWeight={700}>
                    {isAr ? 'حذف السجل بالكامل (الطلبات والدفعات)' : 'Delete complete history (Orders & Payments)'}
                  </Typography>
                  <Typography variant="caption" color="error.700">
                    {isAr 
                      ? 'تحذير: سيتم حذف جميع الطلبات والدفعات الخاصة بهذا العميل نهائياً ولا يمكن التراجع عن ذلك.' 
                      : 'Warning: All orders and payments for this customer will be permanently deleted.'}
                  </Typography>
                </Box>
              }
              sx={{ alignItems: 'flex-start', m: 0 }}
            />
          </Box>
        </DialogContent>
        
        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={onClose} disabled={isPending} color="inherit" variant="outlined" sx={{ borderRadius: 2 }}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button 
            type="submit" 
            disabled={isPending} 
            color="error" 
            variant="contained" 
            startIcon={<Trash2 size={18} />}
            sx={{ borderRadius: 2 }}
          >
            {isPending 
              ? (isAr ? 'جاري المعالجة...' : 'Processing...') 
              : (isAr ? 'تأكيد التصفير' : 'Confirm Reset')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
