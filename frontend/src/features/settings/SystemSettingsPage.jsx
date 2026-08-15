// frontend/src/features/settings/SystemSettingsPage.jsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { 
  Box, Paper, Typography, Grid, TextField, Button, 
  Switch, FormControlLabel, Divider, CircularProgress, 
  InputAdornment, IconButton, Card, CardContent, Stack, MenuItem
} from '@mui/material';
import { 
  Save, History, Percent, Monitor, Public, ReceiptLong, 
  Inventory2, PriceCheck
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { settingsService } from '../../services/settings.service';
import Can from '../auth/Can';

export default function SystemSettingsPage() {
  const { t, i18n } = useTranslation('settings');
  const isAr = i18n.language === 'ar';
  const qc = useQueryClient();

  const [formData, setFormData] = useState({
    defaultPricingStrategy: 'Average',
    allowNegativeStock: false,
    lowStockThresholdDefault: 10,
    currency: 'USD',
    taxPercentage: 0,
    enableWholesalePricing: true,
    exchangeRate: 1
  });

  const { data: settings, isLoading } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => settingsService.getSystemSettings().then(r => r.data.data),
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        defaultPricingStrategy: settings.defaultPricingStrategy || 'Average',
        allowNegativeStock: settings.allowNegativeStock || false,
        lowStockThresholdDefault: settings.lowStockThresholdDefault || 10,
        currency: settings.currency || 'USD',
        taxPercentage: parseFloat(settings.taxPercentage) || 0,
        enableWholesalePricing: settings.enableWholesalePricing ?? true,
        exchangeRate: parseFloat(settings.exchangeRate) || 1
      });
    }
  }, [settings]);

  const mut = useMutation({
    mutationFn: (data) => settingsService.updateSystemSettings(data),
    onSuccess: () => {
      toast.success(t('system.saved'));
      qc.invalidateQueries(['system-settings']);
    }
  });

  const fixCustomerBalancesMut = useMutation({
    mutationFn: () => settingsService.fixCustomerBalances(),
    onSuccess: () => toast.success(isAr ? 'تم تصحيح أرصدة العملاء بنجاح' : 'Customer balances fixed successfully'),
    onError: (e) => toast.error(e.response?.data?.message || 'Error fixing customer balances')
  });

  const fixStockMut = useMutation({
    mutationFn: () => settingsService.fixStock(),
    onSuccess: () => toast.success(isAr ? 'تم تصحيح كميات المخزون بنجاح' : 'Stock calculations fixed successfully'),
    onError: (e) => toast.error(e.response?.data?.message || 'Error fixing stock')
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSave = () => {
    mut.mutate({
      ...formData,
      taxPercentage: parseFloat(formData.taxPercentage) || 0,
      lowStockThresholdDefault: parseInt(formData.lowStockThresholdDefault) || 10,
      exchangeRate: parseFloat(formData.exchangeRate) || 1
    });
  };

  if (isLoading) return <CircularProgress />;

  return (
    <Box sx={{ width: '100%' }}>
      <Grid container spacing={3}>
        
        {/* INVENTORY LOGIC */}
        <Grid item xs={12} md={6}>
          <Box className="card" sx={{ p: 3, height: '100%', borderTop: '4px solid var(--primary-500)' }}>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
               <Box sx={{ p: 1, borderRadius: '8px', bgcolor: 'var(--primary-50)' }}>
                 <Inventory2 sx={{ color: 'var(--primary-600)' }} />
               </Box>
               <Typography variant="h6" fontWeight={800} color="var(--text-primary)">{t('system.inventoryTitle')}</Typography>
            </Stack>
            <Stack spacing={3}>
              <FormControlLabel
                control={<Switch checked={formData.allowNegativeStock} onChange={handleChange} name="allowNegativeStock" color="primary" />}
                label={<Typography fontWeight={600} fontSize={14}>{t('system.allowNegativeStock')}</Typography>}
              />
              <Divider />
              <TextField 
                label={t('system.lowStockThreshold')} 
                name="lowStockThresholdDefault" 
                value={formData.lowStockThresholdDefault} 
                onChange={handleChange} 
                type="number"
                size="small"
                helperText={t('system.lowStockHelper')}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />
              <TextField 
                select
                label={t('system.pricingStrategy')} 
                name="defaultPricingStrategy" 
                value={formData.defaultPricingStrategy} 
                onChange={handleChange}
                size="small"
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              >
                <MenuItem value="Average">{t('system.strategyAverage')}</MenuItem>
                <MenuItem value="Highest">{t('system.strategyHighest')}</MenuItem>
                <MenuItem value="Lowest">{t('system.strategyLowest')}</MenuItem>
              </TextField>
            </Stack>
          </Box>
        </Grid>

        {/* PRICING & TAXATION */}
        <Grid item xs={12} md={6}>
          <Box className="card" sx={{ p: 3, height: '100%', borderTop: '4px solid var(--success)' }}>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
               <Box sx={{ p: 1, borderRadius: '8px', bgcolor: 'var(--success-light)' }}>
                 <PriceCheck sx={{ color: 'var(--success)' }} />
               </Box>
               <Typography variant="h6" fontWeight={800} color="var(--text-primary)">{t('system.fiscalTitle')}</Typography>
            </Stack>
            <Stack spacing={3}>
              <TextField 
                label={t('system.taxPercentage')} 
                name="taxPercentage" 
                value={formData.taxPercentage} 
                onChange={handleChange} 
                type="number"
                size="small"
                InputProps={{
                  endAdornment: <InputAdornment position="end"><Percent fontSize="small"/></InputAdornment>
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />
              <TextField 
                label={t('system.currency')} 
                name="currency" 
                value={formData.currency} 
                onChange={handleChange} 
                size="small"
                placeholder="USD, EGP, SAR..."
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />
              <TextField 
                label={t('system.exchangeRate')} 
                name="exchangeRate" 
                value={formData.exchangeRate} 
                onChange={handleChange} 
                type="number"
                size="small"
                helperText={t('system.exchangeRateHelper')}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />
              <FormControlLabel
                control={<Switch checked={formData.enableWholesalePricing} onChange={handleChange} name="enableWholesalePricing" color="primary" />}
                label={<Typography fontWeight={600} fontSize={14}>{t('system.enableWholesale')}</Typography>}
              />
            </Stack>
          </Box>
        </Grid>

        {/* DATA MAINTENANCE */}
        <Grid item xs={12}>
          <Box className="card" sx={{ p: 3, borderTop: '4px solid var(--danger)' }}>
            <Stack direction="row" spacing={1.5} alignItems="center" mb={3}>
               <Box sx={{ p: 1, borderRadius: '8px', bgcolor: 'var(--danger-light)' }}>
                 <Monitor sx={{ color: 'var(--danger)' }} />
               </Box>
               <Typography variant="h6" fontWeight={800} color="var(--text-primary)">
                 {isAr ? 'صيانة البيانات' : 'Data Maintenance'}
               </Typography>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Can permission="settings:manage">
                <Button 
                  variant="outlined" 
                  color="warning" 
                  onClick={() => fixCustomerBalancesMut.mutate()}
                  disabled={fixCustomerBalancesMut.isPending}
                >
                  {fixCustomerBalancesMut.isPending ? '...' : (isAr ? 'تصحيح أرصدة العملاء' : 'Fix Customer Balances')}
                </Button>
                <Button 
                  variant="outlined" 
                  color="warning" 
                  onClick={() => fixStockMut.mutate()}
                  disabled={fixStockMut.isPending}
                >
                  {fixStockMut.isPending ? '...' : (isAr ? 'تصحيح كميات المخزون' : 'Fix Stock Calculations')}
                </Button>
              </Can>
            </Stack>
          </Box>
        </Grid>

        <Grid item xs={12}>
           <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
             <Can permission="settings:manage">
                <button 
                  className="btn btn-primary" 
                  onClick={handleSave}
                  disabled={mut.isPending}
                  style={{ minWidth: 160, height: 44 }}
                >
                   {mut.isPending ? '...' : t('system.applyConfig')}
                </button>
             </Can>
           </Box>
        </Grid>

      </Grid>
    </Box>
  );
}
