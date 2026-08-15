// frontend/src/features/products/BulkPriceUpdateModal.jsx
import { useState } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, Typography, Box, Switch, FormControlLabel,
  InputAdornment, Stack, Checkbox, Divider, Alert
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { productsService } from '../../services/products.service';
import { useTranslation } from 'react-i18next';

export default function BulkPriceUpdateModal({ open, onClose, onSuccess, selectedIds = [] }) {
  const { t, i18n } = useTranslation('products');
  const isAr = i18n.language === 'ar';

  const [updateFields, setUpdateFields] = useState({
    costPrice: false,
    mainPrice: false,
    wholesalePrice: false,
    isPriceLocked: false
  });

  const [formData, setFormData] = useState({
    costPrice: '',
    mainPrice: '',
    wholesalePrice: '',
    isPriceLocked: false // Note: False means auto-calc is ON in UI logic
  });

  const mut = useMutation({
    mutationFn: (data) => productsService.bulkUpdatePrices(data),
    onSuccess: (res) => {
      toast.success(res.data?.message || (isAr ? 'تم تحديث الأسعار بنجاح' : 'Prices updated successfully'));
      onSuccess();
      onClose();
      resetForm();
    },
    onError: (e) => toast.error(e.response?.data?.message || (isAr ? 'فشل التحديث' : 'Update failed')),
  });

  const resetForm = () => {
    setUpdateFields({
      costPrice: false,
      mainPrice: false,
      wholesalePrice: false,
      isPriceLocked: false
    });
    setFormData({
      costPrice: '',
      mainPrice: '',
      wholesalePrice: '',
      isPriceLocked: false
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedIds.length === 0) return;

    const payload = { productIds: selectedIds };
    let hasUpdates = false;

    if (updateFields.costPrice && formData.costPrice !== '') {
      payload.costPrice = parseFloat(formData.costPrice);
      hasUpdates = true;
    }
    if (updateFields.mainPrice && formData.mainPrice !== '') {
      payload.mainPrice = parseFloat(formData.mainPrice);
      hasUpdates = true;
    }
    if (updateFields.wholesalePrice && formData.wholesalePrice !== '') {
      payload.wholesalePrice = parseFloat(formData.wholesalePrice);
      hasUpdates = true;
    }
    if (updateFields.isPriceLocked) {
      payload.isPriceLocked = !formData.isPriceLocked; // UI "Auto" means DB isPriceLocked = false
      hasUpdates = true;
    }

    if (!hasUpdates) {
      toast.error(isAr ? 'الرجاء اختيار حقل واحد على الأقل وتحديد قيمته' : 'Please select at least one field and provide a value');
      return;
    }

    mut.mutate(payload);
  };

  const handleFieldToggle = (field) => {
    setUpdateFields(p => ({ ...p, [field]: !p[field] }));
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {isAr ? 'تحديث الأسعار المجمع' : 'Bulk Price Update'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 3 }}>
            {isAr 
              ? `سيتم تطبيق هذه التغييرات على ${selectedIds.length} منتجات محددة. قم بتفعيل الحقول التي تريد تغييرها فقط.` 
              : `These changes will be applied to ${selectedIds.length} selected products. Enable only the fields you wish to update.`}
          </Alert>

          <Stack spacing={3}>
            {/* Cost Price */}
            <Box display="flex" alignItems="center" gap={2}>
              <FormControlLabel
                control={<Checkbox checked={updateFields.costPrice} onChange={() => handleFieldToggle('costPrice')} />}
                label={isAr ? 'تكلفة الشراء (Cost)' : 'Cost Price'}
                sx={{ minWidth: 150 }}
              />
              <TextField
                size="small"
                type="number"
                disabled={!updateFields.costPrice}
                value={formData.costPrice}
                onChange={(e) => setFormData(p => ({ ...p, costPrice: e.target.value }))}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                fullWidth
              />
            </Box>

            {/* Main Price */}
            <Box display="flex" alignItems="center" gap={2}>
              <FormControlLabel
                control={<Checkbox checked={updateFields.mainPrice} onChange={() => handleFieldToggle('mainPrice')} />}
                label={isAr ? 'سعر البيع للجمهور' : 'Retail Price'}
                sx={{ minWidth: 150 }}
              />
              <TextField
                size="small"
                type="number"
                disabled={!updateFields.mainPrice}
                value={formData.mainPrice}
                onChange={(e) => setFormData(p => ({ ...p, mainPrice: e.target.value }))}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                fullWidth
              />
            </Box>

            {/* Wholesale Price */}
            <Box display="flex" alignItems="center" gap={2}>
              <FormControlLabel
                control={<Checkbox checked={updateFields.wholesalePrice} onChange={() => handleFieldToggle('wholesalePrice')} />}
                label={isAr ? 'سعر الجملة' : 'Wholesale Price'}
                sx={{ minWidth: 150 }}
              />
              <TextField
                size="small"
                type="number"
                disabled={!updateFields.wholesalePrice}
                value={formData.wholesalePrice}
                onChange={(e) => setFormData(p => ({ ...p, wholesalePrice: e.target.value }))}
                InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                fullWidth
              />
            </Box>

            <Divider />

            {/* Auto Pricing Toggle */}
            <Box display="flex" alignItems="center" gap={2}>
              <FormControlLabel
                control={<Checkbox checked={updateFields.isPriceLocked} onChange={() => handleFieldToggle('isPriceLocked')} />}
                label={isAr ? 'إعداد التسعير التلقائي' : 'Auto Pricing Setting'}
                sx={{ minWidth: 150 }}
              />
              <Box flex={1}>
                <FormControlLabel
                  control={
                    <Switch
                      disabled={!updateFields.isPriceLocked}
                      checked={formData.isPriceLocked}
                      onChange={(e) => setFormData(p => ({ ...p, isPriceLocked: e.target.checked }))}
                      color="primary"
                    />
                  }
                  label={
                    <Typography variant="body2" color={!updateFields.isPriceLocked ? 'text.disabled' : 'text.primary'}>
                      {isAr 
                        ? (formData.isPriceLocked ? 'مفعل (الحساب من المشتريات)' : 'معطل (استخدام السعر الثابت)') 
                        : (formData.isPriceLocked ? 'ON (Calculate from PO)' : 'OFF (Use Fixed Price)')}
                    </Typography>
                  }
                />
              </Box>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
          <Button onClick={handleClose} color="inherit">{isAr ? 'إلغاء' : 'Cancel'}</Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            disabled={mut.isPending || selectedIds.length === 0}
          >
            {isAr ? 'تطبيق التحديثات' : 'Apply Updates'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
