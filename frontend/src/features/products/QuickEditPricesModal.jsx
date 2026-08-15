// frontend/src/features/products/QuickEditPricesModal.jsx
import { useState, useEffect } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, Typography, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, Paper, InputAdornment, Box
} from '@mui/material';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { productsService } from '../../services/products.service';
import { useTranslation } from 'react-i18next';

export default function QuickEditPricesModal({ open, onClose, onSuccess, products = [] }) {
  const { t, i18n } = useTranslation('products');
  const isAr = i18n.language === 'ar';

  const [updates, setUpdates] = useState([]);

  useEffect(() => {
    if (open) {
      setUpdates(products.map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        costPrice: p.costPrice,
        mainPrice: p.mainPrice,
        wholesalePrice: p.wholesalePrice
      })));
    }
  }, [open, products]);

  const mut = useMutation({
    mutationFn: (data) => productsService.batchUpdatePrices(data),
    onSuccess: (res) => {
      toast.success(res.data?.message || (isAr ? 'تم تحديث الأسعار بنجاح' : 'Prices updated successfully'));
      onSuccess();
      onClose();
    },
    onError: (e) => toast.error(e.response?.data?.message || (isAr ? 'فشل التحديث' : 'Update failed')),
  });

  const handlePriceChange = (id, field, value) => {
    setUpdates(prev => prev.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Only send fields that exist in our update objects (id, prices)
    const payload = updates.map(({ id, costPrice, mainPrice, wholesalePrice }) => ({
      id, costPrice, mainPrice, wholesalePrice
    }));
    mut.mutate(payload);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {isAr ? 'تعديل سريع للأسعار' : 'Quick Price Edit'}
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f8fafc' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700 }}>{t('list.productIdentity')}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{isAr ? 'تكلفة الشراء' : 'Cost Price'}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{isAr ? 'سعر البيع' : 'Retail Price'}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{isAr ? 'سعر الجملة' : 'Wholesale'}</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {updates.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{p.sku}</Typography>
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={p.costPrice}
                        onChange={(e) => handlePriceChange(p.id, 'costPrice', e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                        sx={{ width: 120 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={p.mainPrice}
                        onChange={(e) => handlePriceChange(p.id, 'mainPrice', e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                        sx={{ width: 120 }}
                      />
                    </TableCell>
                    <TableCell>
                      <TextField
                        size="small"
                        type="number"
                        value={p.wholesalePrice}
                        onChange={(e) => handlePriceChange(p.id, 'wholesalePrice', e.target.value)}
                        InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                        sx={{ width: 120 }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f8fafc' }}>
          <Button onClick={onClose} color="inherit">{isAr ? 'إلغاء' : 'Cancel'}</Button>
          <Button 
            type="submit" 
            variant="contained" 
            color="primary" 
            disabled={mut.isPending || updates.length === 0}
          >
            {isAr ? 'حفظ الكل' : 'Save All'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
