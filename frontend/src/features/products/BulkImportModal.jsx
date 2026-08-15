// frontend/src/features/products/BulkImportModal.jsx
import { useState, useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { 
  Box, Typography, Button, Dialog, DialogTitle, DialogContent, 
  DialogActions, Stack, Paper, IconButton, CircularProgress,
  Alert, AlertTitle
} from '@mui/material';
import { 
  CloudUpload, InsertDriveFile, Info, Close, 
  CheckCircle, ErrorOutline, Download
} from '@mui/icons-material';
import { productsService } from '../../services/products.service';

export default function BulkImportModal({ open, onClose, onSuccess }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  
  const [file, setFile] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const fileInputRef = useRef(null);

  const handleDownloadTemplate = async () => {
    setDownloading(true);
    try {
      await productsService.downloadImportTemplate();
    } catch (e) {
      toast.error(isAr ? 'فشل تحميل القالب' : 'Failed to download template');
    } finally {
      setDownloading(false);
    }
  };

  const mut = useMutation({
    mutationFn: (f) => productsService.bulkImport(f),
    onSuccess: (res) => {
      const { created, updated, errors } = res.data.data;
      toast.success(isAr
        ? `نجاح الاستيراد: ${created} مضاف, ${updated} محدث`
        : `Import Results: ${created} created, ${updated} updated`
      );
      if (errors > 0) toast.error(isAr ? `تنبيه: ${errors} فشل استيرادهم` : `Warning: ${errors} rows failed`);
      onSuccess();
    },
    onError: (e) => toast.error(e.response?.data?.message || (isAr ? 'فشل معالجة الملف' : 'File processing failed'))
  });

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); };
  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) setFile(e.target.files[0]);
  };

  const submit = () => {
    if (!file) return;
    mut.mutate(file);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 800 }}>
        {isAr ? 'استيراد البيانات الشامل (CSV)' : 'Bulk Asset Import (CSV)'}
        <IconButton onClick={onClose} size="small"><Close /></IconButton>
      </DialogTitle>
      
      <DialogContent dividers>
        <Stack spacing={4} sx={{ py: 1 }}>
          
          <Box
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            sx={{
              border: '2px dashed',
              borderColor: file ? 'primary.main' : 'divider',
              borderRadius: 1,
              p: 6,
              textAlign: 'center',
              cursor: 'pointer',
              bgcolor: file ? 'rgba(99,102,241,0.04)' : 'transparent',
              transition: 'all 0.2s ease',
              '&:hover': { bgcolor: 'rgba(0,0,0,0.02)', borderColor: 'primary.main' }
            }}
          >
            {file ? (
              <Stack alignItems="center" spacing={1}>
                <CheckCircle sx={{ fontSize: 48, color: 'primary.main' }} />
                <Typography variant="subtitle1" fontWeight={700}>{file.name}</Typography>
                <Typography variant="caption" color="text.secondary">{(file.size / 1024).toFixed(1)} KB</Typography>
                <Button size="small" color="secondary" sx={{ mt: 1 }}>{isAr ? 'تغيير الملف' : 'Change File'}</Button>
              </Stack>
            ) : (
              <Stack alignItems="center" spacing={1.5}>
                <CloudUpload sx={{ fontSize: 52, color: 'text.secondary', opacity: 0.5 }} />
                <Typography variant="h6" fontWeight={700}>{isAr ? 'اضغط هنا أو اسحب الملف' : 'Tap to Browse or Drop CSV'}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {isAr ? 'يدعم الملفات بتنسيق .csv فقط' : 'Standard .csv files only (UTF-8 recommended)'}
                </Typography>
              </Stack>
            )}
            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".csv" style={{ display: 'none' }} />
          </Box>

          <Alert severity="info" variant="outlined" sx={{ borderRadius: 2 }}>
            <Info sx={{ flexShrink: 0, mt: 0.5 }} />
            <AlertTitle sx={{ fontWeight: 700 }}>{isAr ? 'متطلبات التنسيق' : 'Data Mapping Rules'}</AlertTitle>
            <Typography variant="caption" display="block" sx={{ opacity: 0.8 }}>
              • {isAr ? 'يجب وجود عمودي sku و name.' : 'Requires minimal "sku" and "name" columns.'}
            </Typography>
            <Typography variant="caption" display="block" sx={{ opacity: 0.8 }}>
              • {isAr ? 'سيتم التحديث التلقائي في حال وجود الـ SKU مسبقاً.' : 'Existing SKUs will trigger an update (upsert).'}
            </Typography>
            <Typography variant="caption" display="block" sx={{ opacity: 0.8 }}>
              • {isAr
                ? 'أعمدة المخزون: stock_{اسم_المستودع} — مثال: stock_Main Warehouse'
                : 'Stock columns: stock_{WarehouseName} — e.g. stock_Main Warehouse'}
            </Typography>
            <Typography variant="caption" display="block" sx={{ opacity: 0.8 }}>
              • {isAr
                ? 'حمّل القالب أدناه للحصول على الأعمدة الصحيحة تلقائياً.'
                : 'Download the template below to get correct columns auto-generated from your warehouses.'}
            </Typography>
          </Alert>

        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
        <Button
          onClick={handleDownloadTemplate}
          disabled={downloading}
          startIcon={downloading ? <CircularProgress size={16} color="inherit" /> : <Download />}
          color="secondary"
          variant="outlined"
        >
          {isAr ? 'تحميل القالب' : 'Download Template'}
        </Button>
        <Stack direction="row" spacing={1}>
          <Button onClick={onClose} color="inherit">{isAr ? 'إلغاء' : 'Dismiss'}</Button>
          <Button 
            variant="contained" 
            onClick={submit} 
            disabled={!file || mut.isPending}
            startIcon={mut.isPending ? <CircularProgress size={16} color="inherit" /> : <CloudUpload />}
          >
            {mut.isPending ? (isAr ? 'جاري المعالجة...' : 'Processing...') : (isAr ? 'بدء الاستيراد' : 'Execute Import')}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
