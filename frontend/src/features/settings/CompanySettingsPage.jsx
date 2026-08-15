// frontend/src/features/settings/CompanySettingsPage.jsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { 
  Box, Paper, Typography, Grid, TextField, Button, 
  Divider, CircularProgress, InputAdornment, Stack, 
  Card, CardHeader, CardContent
} from '@mui/material';
import { 
  Save, Business, LocationOn, Phone, Language, 
  Receipt, ColorLens, Email, AccessTime
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { settingsService } from '../../services/settings.service';

export default function CompanySettingsPage() {
  const { t, i18n } = useTranslation('settings');
  const isAr = i18n.language === 'ar';
  const qc = useQueryClient();

  const [formData, setFormData] = useState({
    companyName: '',
    address: '',
    phoneNumber: '',
    email: '',
    website: '',
    taxNumber: '',
    posFooterMessage: '',
    invoiceHeaderMessage: '',
    invoiceFooterMessage: '',
    primaryColor: '#6366f1',
    secondaryColor: '#8b5cf6'
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['company-settings'],
    queryFn: () => settingsService.getCompanySettings().then(r => r.data.data),
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        companyName: settings.companyName || '',
        address: settings.address || '',
        phoneNumber: settings.phoneNumber || '',
        email: settings.email || '',
        website: settings.website || '',
        taxNumber: settings.taxNumber || '',
        posFooterMessage: settings.posFooterMessage || '',
        invoiceHeaderMessage: settings.invoiceHeaderMessage || '',
        invoiceFooterMessage: settings.invoiceFooterMessage || '',
        primaryColor: settings.primaryColor || '#6366f1',
        secondaryColor: settings.secondaryColor || '#8b5cf6'
      });
    }
  }, [settings]);

  const mut = useMutation({
    mutationFn: (data) => settingsService.updateCompanySettings(data),
    onSuccess: () => {
      toast.success(t('company.saved'));
      qc.invalidateQueries(['company-settings']);
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
  };

  const handleSave = () => { mut.mutate(formData); };

  if (isLoading) return <CircularProgress />;

  return (
    <Box sx={{ width: '100%' }}>
      <Grid container spacing={4}>
        
        {/* BRANDING & IDENTITY */}
        <Grid item xs={12} md={7}>
          <Box className="card" sx={{ p: 4, height: '100%', borderTop: '4px solid var(--primary-500)' }}>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={4}>
               <Box sx={{ p: 1, borderRadius: '8px', bgcolor: 'var(--primary-50)' }}>
                 <Business sx={{ color: 'var(--primary-600)' }} />
               </Box>
               <Typography variant="h6" fontWeight={800}>{t('company.identityTitle')}</Typography>
            </Stack>
            <Grid container spacing={3}>
              <Grid item xs={12} sm={8}>
                 <TextField 
                    label={t('company.entityName')} 
                    name="companyName" 
                    value={formData.companyName} 
                    onChange={handleChange} 
                    fullWidth 
                    size="small"
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                  />
              </Grid>
              <Grid item xs={12} sm={4}>
                 <TextField 
                    label={t('company.taxNumber')} 
                    name="taxNumber" 
                    value={formData.taxNumber} 
                    onChange={handleChange} 
                    fullWidth 
                    size="small"
                    InputProps={{
                      startAdornment: <InputAdornment position="start"><Receipt fontSize="small" /></InputAdornment>
                    }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                  />
              </Grid>
              <Grid item xs={12}>
                <Divider sx={{ my: 1 }} />
              </Grid>
              <Grid item xs={12}>
                <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                   <Box sx={{ p: 1, borderRadius: '8px', bgcolor: 'var(--primary-50)' }}>
                     <LocationOn sx={{ color: 'var(--primary-600)' }} />
                   </Box>
                   <Typography variant="h6" fontWeight={800}>{t('company.contactTitle')}</Typography>
                </Stack>
              </Grid>
              <Grid item xs={12}>
                <TextField label={t('company.address')} name="address" value={formData.address} onChange={handleChange} fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                 <TextField 
                   label={t('company.email')} 
                   name="email" value={formData.email} onChange={handleChange} fullWidth 
                   size="small"
                   InputProps={{ startAdornment: <InputAdornment position="start"><Email fontSize="small" /></InputAdornment> }}
                   sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                 />
              </Grid>
              <Grid item xs={12} sm={6}>
                 <TextField 
                    label={t('company.phone')} 
                    name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} fullWidth 
                    size="small"
                    InputProps={{ startAdornment: <InputAdornment position="start"><Phone fontSize="small" /></InputAdornment> }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                 />
              </Grid>
              <Grid item xs={12}>
                 <TextField 
                    label={t('company.website')} 
                    name="website" value={formData.website} onChange={handleChange} fullWidth 
                    size="small"
                    InputProps={{ startAdornment: <InputAdornment position="start"><Language fontSize="small" /></InputAdornment> }}
                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                 />
              </Grid>
            </Grid>
          </Box>
        </Grid>

        {/* PRINTING & MESSAGING */}
        <Grid item xs={12} md={5}>
          <Stack spacing={4}>
             <Box className="card" sx={{ p: 3, borderLeft: '4px solid var(--success)' }}>
                <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
                   <Box sx={{ p: 1, borderRadius: '8px', bgcolor: 'var(--success-light)' }}>
                     <Receipt color="success" />
                   </Box>
                   <Typography variant="h6" fontWeight={800}>{t('company.invoicingTitle')}</Typography>
                </Stack>
                <Stack spacing={3}>
                   <TextField label={t('company.invoiceHeader')} name="invoiceHeaderMessage" value={formData.invoiceHeaderMessage} onChange={handleChange} fullWidth multiline rows={2} size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}/>
                   <TextField label={t('company.invoiceFooter')} name="invoiceFooterMessage" value={formData.invoiceFooterMessage} onChange={handleChange} fullWidth multiline rows={2} size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}/>
                   <TextField label={t('company.posMessage')} name="posFooterMessage" value={formData.posFooterMessage} onChange={handleChange} fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}/>
                </Stack>
             </Box>

             <Box className="card" sx={{ p: 3, borderLeft: '4px solid var(--primary-400)' }}>
                <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
                   <Box sx={{ p: 1, borderRadius: '8px', bgcolor: 'var(--primary-50)' }}>
                     <ColorLens color="primary" />
                   </Box>
                   <Typography variant="h6" fontWeight={800}>{t('company.brandingTitle')}</Typography>
                </Stack>
                <Grid container spacing={2}>
                   <Grid item xs={12} sm={6}>
                      <TextField label={t('company.primaryColor')} name="primaryColor" value={formData.primaryColor} onChange={handleChange} fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
                      <Box sx={{ mt:1, height: 6, bgcolor: formData.primaryColor, borderRadius: 3 }} />
                   </Grid>
                   <Grid item xs={12} sm={6}>
                      <TextField label={t('company.secondaryColor')} name="secondaryColor" value={formData.secondaryColor} onChange={handleChange} fullWidth size="small" sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }} />
                      <Box sx={{ mt:1, height: 6, bgcolor: formData.secondaryColor, borderRadius: 3 }} />
                   </Grid>
                </Grid>
             </Box>
          </Stack>
        </Grid>

        <Grid item xs={12}>
           <Box sx={{ display: 'flex', justifyContent: isAr ? 'flex-start' : 'flex-end', mt: 2 }}>
              <button className="btn btn-primary" onClick={handleSave} disabled={mut.isPending} style={{ minWidth: 200, height: 48 }}>
                 {mut.isPending ? '...' : t('company.updateProfile')}
              </button>
           </Box>
        </Grid>

      </Grid>
    </Box>
  );
}
