// frontend/src/features/suppliers/POImportModal.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { 
  Box, Button, Typography, MenuItem, TextField, 
  Stack, Alert, CircularProgress, IconButton,
  Divider, FormControlLabel, Switch
} from '@mui/material';
import { 
  Close, CloudUpload, FileDownload, 
  ErrorOutline, CheckCircleOutline 
} from '@mui/icons-material';
import Modal from '../../components/ui/Modal';
import { suppliersService } from '../../services/suppliers.service';
import { inventoryService } from '../../services/inventory.service';
import toast from 'react-hot-toast';

export default function POImportModal({ onClose, onSuccess }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const qc = useQueryClient();

  const [file, setFile] = useState(null);
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [autoReceive, setAutoReceive] = useState(false);
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [importErrors, setImportErrors] = useState([]);

  const { data: suppliers } = useQuery({ 
    queryKey: ['suppliers'], 
    queryFn: () => suppliersService.list().then(r => r.data.data) 
  });

  const { data: warehouses } = useQuery({ 
    queryKey: ['warehouses'], 
    queryFn: () => inventoryService.listWarehouses().then(r => r.data.data) 
  });

  const mutImport = useMutation({
    mutationFn: (data) => suppliersService.importOrder(data),
    onSuccess: () => {
      toast.success(isAr ? 'تم استيراد الطلب بنجاح' : 'Purchase Order imported successfully');
      qc.invalidateQueries(['purchaseOrders']);
      onSuccess();
      onClose();
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Error importing file';
      const detailErrors = err.response?.data?.errors || [];
      toast.error(msg);
      setImportErrors(detailErrors);
    }
  });

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setImportErrors([]);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!file) return toast.error(isAr ? 'الرجاء اختيار ملف' : 'Please select a file');
    if (!supplierId) return toast.error(isAr ? 'الرجاء اختيار المورد' : 'Please select a supplier');
    if (autoReceive && !warehouseId) return toast.error(isAr ? 'الرجاء اختيار المستودع للاستلام' : 'Please select a warehouse for auto-receipt');

    mutImport.mutate({
      file,
      supplierId,
      warehouseId,
      autoReceive,
      expectedDate,
      notes
    });
  };

  return (
    <Modal 
      isOpen={true}
      title={isAr ? 'استيراد أمر شراء من Excel' : 'Import Purchase Order from Excel'} 
      onClose={onClose}
      size="md"
    >
      <form onSubmit={handleSubmit}>
        <Stack spacing={3} sx={{ p: 3 }}>
          <Alert severity="info" sx={{ borderRadius: 2 }}>
            <Typography variant="caption" display="block" fontWeight={700} gutterBottom>
              {isAr ? 'تنسيق الملف المطلوب:' : 'Required File Format:'}
            </Typography>
            <Typography variant="caption" component="div">
              {isAr 
                ? 'يجب أن يحتوي الملف على الأعمدة التالية: SKU أو Barcode، الكمية (Quantity)، وسعر الوحدة (UnitPrice - اختياري).'
                : 'File must contain: SKU or Barcode, Quantity, and optionally UnitPrice.'}
            </Typography>
          </Alert>

          <TextField
            select
            fullWidth
            required
            label={isAr ? 'المورد' : 'Supplier'}
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
          >
            {suppliers?.map(s => (
              <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
            ))}
          </TextField>

          <Stack direction="row" spacing={2}>
            <TextField
              type="date"
              fullWidth
              label={isAr ? 'التاريخ المتوقع' : 'Expected Date'}
              InputLabelProps={{ shrink: true }}
              value={expectedDate}
              onChange={(e) => setExpectedDate(e.target.value)}
            />
          </Stack>

          <Box>
            <FormControlLabel
              control={<Switch checked={autoReceive} onChange={e => setAutoReceive(e.target.checked)} color="primary" />}
              label={<Typography variant="body2" fontWeight={700}>{isAr ? 'تأكيد واستلام المخزون فورياً' : 'Auto-Receive & Update Stock'}</Typography>}
            />
            {autoReceive && (
              <TextField
                select
                fullWidth
                required
                size="small"
                label={isAr ? 'مستودع الاستلام' : 'Destination Warehouse'}
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                sx={{ mt: 1.5 }}
              >
                {warehouses?.map(w => (
                  <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>
                ))}
              </TextField>
            )}
          </Box>

          <Box
            sx={{
              border: '2px dashed #e2e8f0',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              bgcolor: file ? '#f0fdf4' : '#f8fafc',
              cursor: 'pointer',
              '&:hover': { bgcolor: '#f1f5f9' }
            }}
            onClick={() => document.getElementById('po-import-file').click()}
          >
            <input 
              type="file" 
              id="po-import-file" 
              hidden 
              accept=".xlsx, .xls" 
              onChange={handleFileChange}
            />
            <CloudUpload sx={{ fontSize: 40, color: file ? 'success.main' : 'primary.main', mb: 1 }} />
            <Typography variant="body2" fontWeight={700}>
              {file ? file.name : (isAr ? 'اضغط لرفع ملف Excel' : 'Click to upload Excel file')}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              (.xlsx, .xls)
            </Typography>
          </Box>

          {importErrors.length > 0 && (
            <Alert severity="error" icon={<ErrorOutline />} sx={{ borderRadius: 2, maxHeight: 150, overflow: 'auto' }}>
              <Typography variant="caption" fontWeight={700}>{isAr ? 'أخطاء في التحقق:' : 'Validation Errors:'}</Typography>
              <ul style={{ margin: '4px 0', paddingLeft: '16px', fontSize: '0.75rem' }}>
                {importErrors.map((err, idx) => <li key={idx}>{err}</li>)}
              </ul>
            </Alert>
          )}

          <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ pt: 2 }}>
            <Button onClick={onClose} color="inherit">{isAr ? 'إلغاء' : 'Cancel'}</Button>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={mutImport.isPending || !file || !supplierId}
              startIcon={mutImport.isPending ? <CircularProgress size={16} color="inherit" /> : <FileDownload />}
            >
              {isAr ? 'بدء الاستيراد' : 'Start Import'}
            </Button>
          </Stack>
        </Stack>
      </form>
    </Modal>
  );
}
