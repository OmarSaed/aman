// frontend/src/features/products/ProductInventoryTab.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Box, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Typography, TextField, Button,
  Paper, Stack, IconButton, Tooltip, CircularProgress, Alert
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { inventoryService } from '../../services/inventory.service';
import { Add, Remove, Save, History as HistoryIcon } from '@mui/icons-material';
import toast from 'react-hot-toast';

export default function ProductInventoryTab({ productId }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const qc = useQueryClient();

  const [adjustments, setAdjustments] = useState({}); // { warehouseId: amount }
  const [notes, setNotes] = useState('');

  const { data: stockLevels, isLoading, error } = useQuery({
    queryKey: ['product-stock', productId],
    queryFn: () => inventoryService.getStock({ productId }).then(r => r.data.data),
  });

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => inventoryService.listWarehouses().then(r => r.data.data),
  });

  const mutAdjust = useMutation({
    mutationFn: (data) => inventoryService.adjustStock(data),
    onSuccess: () => {
      toast.success(isAr ? 'تم تحديث المخزون بنجاح' : 'Stock adjusted successfully');
      setAdjustments({});
      setNotes('');
      qc.invalidateQueries(['product-stock', productId]);
      qc.invalidateQueries(['product-transactions', productId]);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error')
  });

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">Error loading stock</Alert>;

  const handleAdjust = (warehouseId, amount) => {
    setAdjustments(prev => ({
      ...prev,
      [warehouseId]: (prev[warehouseId] || 0) + amount
    }));
  };

  const submitAdjustment = (warehouseId) => {
    const qty = adjustments[warehouseId];
    if (!qty) return;
    mutAdjust.mutate({
      productId,
      warehouseId,
      quantity: qty,
      notes: notes || (isAr ? 'تعديل يدوي من صفحة المنتج' : 'Manual adjustment from product page')
    });
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" fontWeight={800} mb={2}>
        {isAr ? 'إدارة المخزون الحالي' : 'Manage Current Stock'}
      </Typography>

      <TableContainer component={Paper} sx={{ borderRadius: 2, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f8fafc' }}>
            <TableRow>
              <TableCell>{isAr ? 'المخزن / الموقع' : 'Warehouse / Location'}</TableCell>
              <TableCell align="center">{isAr ? 'الرصيد الحالي' : 'Current Balance'}</TableCell>
              <TableCell align="center">{isAr ? 'التعديل (+/-)' : 'Adjustment (+/-)'}</TableCell>
              <TableCell align="right">{isAr ? 'إجراء' : 'Action'}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {warehouses?.map(w => {
              const currentStock = stockLevels?.find(s => s.warehouseId === w.id)?.quantity || 0;
              const adj = adjustments[w.id] || 0;
              
              return (
                <TableRow key={w.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={700}>{w.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{w.location || (isAr ? 'لا يوجد موقع' : 'No location')}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Typography variant="h6" color={currentStock > 0 ? 'primary.main' : 'error.main'} fontWeight={900}>
                      {currentStock}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                      <IconButton size="small" color="error" onClick={() => handleAdjust(w.id, -1)}>
                        <Remove fontSize="small" />
                      </IconButton>
                      <TextField 
                        size="small" 
                        type="number" 
                        value={adj} 
                        onChange={(e) => setAdjustments(p => ({ ...p, [w.id]: parseInt(e.target.value) || 0 }))}
                        sx={{ width: 80, input: { textAlign: 'center', fontWeight: 800 } }}
                      />
                      <IconButton size="small" color="success" onClick={() => handleAdjust(w.id, 1)}>
                        <Add fontSize="small" />
                      </IconButton>
                    </Stack>
                  </TableCell>
                  <TableCell align="right">
                    <Button 
                      variant="contained" 
                      size="small" 
                      disabled={!adj || mutAdjust.isPending}
                      onClick={() => submitAdjustment(w.id)}
                      startIcon={<Save />}
                    >
                      {isAr ? 'تحديث' : 'Apply'}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 3, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
        <Typography variant="subtitle2" mb={1} fontWeight={700}>{isAr ? 'سبب التعديل (اختياري)' : 'Reason for Adjustment (Optional)'}</Typography>
        <TextField 
          fullWidth 
          multiline 
          rows={2} 
          placeholder={isAr ? 'مثال: جرد سنوي، تالف، هدايا...' : 'Example: Annual inventory, damaged, gift...'} 
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Box>
    </Box>
  );
}
