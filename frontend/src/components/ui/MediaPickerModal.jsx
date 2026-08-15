import React, { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { 
  Box, Grid, Typography, Button, IconButton, 
  CircularProgress, Stack, Tooltip, Dialog,
  DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { 
  CloudUpload as UploadCloud, Image as ImageIcon, Refresh, 
  CheckCircle, Close
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { mediaService } from '../../services/media.service';

/**
 * MUI-based Media Picker for ERP
 * Refactored to avoid CSS conflicts and ensure premium display
 */
export default function MediaPickerModal({ onClose, onSelect }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const qc = useQueryClient();
  const fileInputRef = useRef(null);
  
  const [selectedAssetUrl, setSelectedAssetUrl] = useState(null);

  const { data: qData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['media'],
    queryFn: () => mediaService.listMedia().then(r => r.data)
  });

  const assets = qData?.data || [];

  const uploadMut = useMutation({
    mutationFn: (file) => mediaService.uploadMedia(file),
    onSuccess: (res) => {
      toast.success(isAr ? 'تم الرفع' : 'Uploaded');
      qc.invalidateQueries(['media']);
      if (res.data?.data?.url) {
        setSelectedAssetUrl(res.data.data.url);
      }
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error uploading file')
  });

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) return toast.error(isAr ? 'حجم الملف يتجاوز الحد المسموح' : 'File too large');
    uploadMut.mutate(file);
    e.target.value = null;
  };

  const handleConfirm = () => {
    if (selectedAssetUrl) onSelect(selectedAssetUrl);
  };

  return (
    <Dialog 
      open={true} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      sx={{ '& .MuiDialog-paper': { borderRadius: 4 } }}
    >
      <DialogTitle sx={{ m: 0, p: 2.5, fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6" fontWeight={800}>{isAr ? 'مكتبة الوسائط' : 'Media Library Picker'}</Typography>
          <Typography variant="caption" color="text.secondary">
            {isAr ? 'اختر صورة للمنتج' : 'Select or upload an image for this product'}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ p: 3, bgcolor: '#fbfcfd' }}>
        <Box sx={{ minHeight: 400, display: 'flex', flexDirection: 'column' }}>
          
          {/* Toolbar */}
          <Stack direction="row" spacing={2} mb={3} alignItems="center">
            <Button 
              variant="contained" 
              startIcon={<UploadCloud />} 
              onClick={() => fileInputRef.current?.click()} 
              disabled={uploadMut.isPending}
              sx={{ borderRadius: '10px', fontWeight: 700, px: 3 }}
            >
              {uploadMut.isPending ? '...' : isAr ? 'رفع صورة' : 'Upload Image'}
            </Button>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*" 
              onChange={handleFileUpload} 
            />
            <Box sx={{ flex: 1 }} />
            <Tooltip title={isAr ? 'تحديث' : 'Refresh'}>
              <IconButton onClick={() => refetch()} disabled={isFetching}>
                <Refresh sx={{ fontSize: 20 }} className={isFetching ? 'spin' : ''} />
              </IconButton>
            </Tooltip>
          </Stack>

          {/* Grid Area */}
          <Box sx={{ flex: 1, overflowY: 'auto', pr: 1, maxHeight: 450 }}>
            {isLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                <CircularProgress size={40} />
              </Box>
            ) : assets.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 10, opacity: 0.5 }}>
                <ImageIcon sx={{ fontSize: 64, mb: 2, color: 'text.tertiary' }} />
                <Typography variant="h6" color="text.secondary">{isAr ? 'لا توجد وسائط' : 'Library is empty'}</Typography>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {assets.map(asset => {
                  const isSelected = selectedAssetUrl === asset.url;
                  return (
                    <Grid item xs={6} sm={4} md={3} key={asset.id}>
                      <Box 
                        onClick={() => setSelectedAssetUrl(asset.url)}
                        sx={{
                          height: 120, 
                          borderRadius: 3, 
                          cursor: 'pointer', 
                          position: 'relative',
                          border: isSelected ? '3px solid #6366f1' : '1px solid #e2e8f0',
                          backgroundImage: `url(${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${asset.url})`,
                          backgroundSize: 'cover', 
                          backgroundPosition: 'center',
                          transition: 'all 0.2s ease',
                          bgcolor: 'white',
                          '&:hover': {
                            transform: 'translateY(-2px)',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
                          }
                        }}>
                          {isSelected && (
                            <Box sx={{ 
                              position: 'absolute', top: 6, right: 6, 
                              bgcolor: '#6366f1', color: 'white', 
                              borderRadius: '50%', display: 'flex', p: 0.5,
                              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                            }}>
                              <CheckCircle sx={{ fontSize: 16 }} />
                            </Box>
                          )}
                      </Box>
                      <Typography 
                        variant="caption" 
                        sx={{ 
                          mt: 1, display: 'block', textAlign: 'center', 
                          fontWeight: isSelected ? 800 : 500,
                          color: isSelected ? 'primary.main' : 'text.secondary',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                        }}
                      >
                        {asset.filename}
                      </Typography>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, px: 3, gap: 1.5 }}>
        <Button onClick={onClose} variant="text" color="inherit" sx={{ fontWeight: 700 }}>
          {isAr ? 'إلغاء' : 'Cancel'}
        </Button>
        <Button 
          variant="contained" 
          disabled={!selectedAssetUrl} 
          onClick={handleConfirm}
          sx={{ px: 5, borderRadius: '10px', boxShadow: '0 4px 12px rgba(99,102,241,0.2)' }}
        >
          {isAr ? 'تأكيد الاختيار' : 'Select Image'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
