import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Card, CardContent, Grid, Button, 
  TextField, Skeleton, Divider, Dialog, DialogTitle, 
  DialogContent, DialogActions, Alert 
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { 
  Wallet, DollarSign, ArrowRightLeft, ArrowUpCircle, 
  ArrowDownCircle, Lock, Unlock, Info 
} from 'lucide-react';
import { dayboxService } from '../../services/daybox.service';
import { settingsService } from '../../services/settings.service';
import { formatCurrency, formatDate } from '../../utils/format';
import { toast } from 'react-hot-toast';

export default function DayboxPage() {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState(null);

  // Open Session Form
  const [openingBalance, setOpeningBalance] = useState('');
  const [openNotes, setOpenNotes] = useState('');

  // Close Session Modal
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [actualBalance, setActualBalance] = useState('');
  const [closeNotes, setCloseNotes] = useState('');

  const [systemSettings, setSystemSettings] = useState(null);
  const [loadingSettings, setLoadingSettings] = useState(true);

  useEffect(() => {
    fetchActiveSession();
    fetchSystemSettings();
  }, []);

  const fetchSystemSettings = async () => {
    try {
      setLoadingSettings(true);
      const res = await settingsService.getSystemSettings();
      setSystemSettings(res.data.data);
    } catch (err) {
      console.error('Failed to fetch settings', err);
    } finally {
      setLoadingSettings(false);
    }
  };

  const fetchActiveSession = async () => {
    try {
      setLoading(true);
      const res = await dayboxService.getActive();
      setActiveSession(res.data.data);
    } catch (error) {
      toast.error(isAr ? 'فشل تحميل الجلسة' : 'Failed to fetch session');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenSession = async () => {
    try {
      const res = await dayboxService.open({
        openingBalance: Number(openingBalance) || 0,
        notes: openNotes
      });
      toast.success(isAr ? 'تم فتح الصندوق' : 'Daybox opened successfully');
      setActiveSession(res.data.data);
      setOpeningBalance('');
      setOpenNotes('');
    } catch (error) {
      toast.error(error.response?.data?.message || (isAr ? 'فشل فتح الصندوق' : 'Failed to open daybox'));
    }
  };

  const handleCloseSession = async () => {
    if (!actualBalance && actualBalance !== 0) {
      return toast.error(isAr ? 'الرجاء إدخال الرصيد الفعلي' : 'Please enter actual balance');
    }

    try {
      await dayboxService.close(activeSession.id, {
        actualBalance: Number(actualBalance),
        notes: closeNotes
      });
      toast.success(isAr ? 'تم إغلاق الصندوق' : 'Daybox closed successfully');
      setIsCloseModalOpen(false);
      setActiveSession(null);
      setActualBalance('');
      setCloseNotes('');
    } catch (error) {
      toast.error(error.response?.data?.message || (isAr ? 'فشل إغلاق الصندوق' : 'Failed to close daybox'));
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4 }}>
        <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 3, mb: 3 }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 3 }} />
      </Box>
    );
  }

  // --- View: No Active Session ---
  if (!activeSession) {
    return (
      <Box sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
        <Card sx={{ borderRadius: 3, boxShadow: 'var(--shadow-sm)', textAlign: 'center', py: 4 }}>
          <Unlock size={64} style={{ color: 'var(--text-secondary)', marginBottom: 16 }} />
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>
            {isAr ? 'صندوق اليومية مغلق' : 'Daybox is Closed'}
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 4 }}>
            {isAr ? 'الرجاء فتح الصندوق لبدء دورة المبيعات' : 'Please open the daybox to start accepting sales and payments.'}
          </Typography>

          <Box sx={{ px: 4, textAlign: 'left' }}>
            <TextField
              fullWidth
              label={isAr ? 'الرصيد الافتتاحي' : 'Opening Balance'}
              type="number"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label={isAr ? 'ملاحظات (اختياري)' : 'Notes (Optional)'}
              value={openNotes}
              onChange={(e) => setOpenNotes(e.target.value)}
              multiline
              rows={2}
              sx={{ mb: 3 }}
            />
            <Button 
              fullWidth 
              variant="contained" 
              size="large"
              onClick={handleOpenSession}
              sx={{ py: 1.5, borderRadius: 2, fontWeight: 700 }}
            >
              {isAr ? 'فتح الصندوق' : 'Open Daybox Session'}
            </Button>
          </Box>
        </Card>
      </Box>
    );
  }

  // Helper for dual currency display
  const Money = ({ value, variant = "inherit", color = "inherit", fontWeight = "inherit", align = "flex-start" }) => {
    if (loadingSettings) return <Skeleton width={60} />;
    
    const rate = Number(systemSettings?.exchangeRate || 1);
    const usdVal = Number(value || 0);
    const lbpVal = usdVal * rate;

    return (
      <Box sx={{ display: 'inline-flex', flexDirection: 'column', alignItems: align, color }}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <Typography variant={variant} sx={{ fontWeight, color: 'inherit' }}>
            {formatCurrency(usdVal, 'USD', 1)}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7, fontWeight: 500, fontSize: '0.85rem' }}>
            / {Number(lbpVal).toLocaleString()} LBP
          </Typography>
        </Box>
        <Typography variant="caption" sx={{ 
          mt: 0.5, 
          opacity: 0.6, 
          fontWeight: 700, 
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          borderTop: '1px solid rgba(0,0,0,0.05)',
          pt: 0.2
        }}>
          {isAr ? 'الإجمالي النظري:' : 'Total Converted:'} {formatCurrency(usdVal, 'USD', 1)} (@ {rate.toLocaleString()})
        </Typography>
      </Box>
    );
  };

  // --- View: Active Session Overview ---
  const expectedDiff = Number(actualBalance || 0) - Number(activeSession.expectedBalance);

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            {isAr ? 'جلسة الصندوق الحالية' : 'Active Cash Session'}
          </Typography>
          <Typography color="text.secondary">
            {isAr ? 'مفتوح منذ:' : 'Opened at:'} {formatDate(activeSession.openingDate, 'PPpp')}
          </Typography>
          {activeSession.user?.name && (
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'primary.main', mt: 0.5 }}>
              {isAr ? 'المسؤول:' : 'Operator:'} {activeSession.user.name}
            </Typography>
          )}
        </Box>
        <Button 
          variant="contained" 
          color="error"
          startIcon={<Lock size={18} />}
          onClick={() => setIsCloseModalOpen(true)}
          sx={{ borderRadius: 2, px: 3, py: 1 }}
        >
          {isAr ? 'إغلاق الصندوق' : 'Close Session'}
        </Button>
      </Box>

      {/* Main Expected Balance */}
      <Card sx={{ borderRadius: 3, backgroundColor: '#1e293b', color: '#ffffff', mb: 4, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', position: 'relative', overflow: 'hidden' }}>
        <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 4 }}>
          <Box>
            <Typography variant="subtitle2" sx={{ opacity: 0.8, mb: 2, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1.5 }}>
              {isAr ? 'إجمالي الرصيد المتوقع في الصندوق' : 'TOTAL EXPECTED CASH IN DRAWER'}
            </Typography>
            
            <Grid container spacing={4} alignItems="center">
              <Grid item>
                <Typography variant="h3" sx={{ fontWeight: 900, mb: 0.5 }}>
                  {formatCurrency(activeSession.expectedBalance, 'USD', 1)}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7, fontWeight: 800, textTransform: 'uppercase' }}>US DOLLARS ($)</Typography>
              </Grid>
              
              <Grid item sx={{ display: { xs: 'none', sm: 'block' } }}>
                <Divider orientation="vertical" flexItem sx={{ height: 60, bgcolor: 'rgba(255,255,255,0.2)', width: 2 }} />
              </Grid>

              <Grid item>
                <Typography variant="h3" sx={{ fontWeight: 900, mb: 0.5 }}>
                  {Number(activeSession.expectedBalance * (systemSettings?.exchangeRate || 1)).toLocaleString()}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7, fontWeight: 800, textTransform: 'uppercase' }}>LEBANESE POUNDS (LBP)</Typography>
              </Grid>
            </Grid>

            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid rgba(255,255,255,0.1)', display: 'inline-block' }}>
               <Typography variant="body2" sx={{ fontWeight: 700, opacity: 0.9 }}>
                 {isAr ? 'سعر الصرف المعتمد:' : 'Exchange Rate:'} <span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: '4px' }}>1$ = {(systemSettings?.exchangeRate || 1).toLocaleString()} LBP</span>
               </Typography>
            </Box>
          </Box>
          <Wallet size={120} style={{ opacity: 0.1, position: 'absolute', right: 20 }} />
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Left Stats */}
        <Grid item xs={12} md={8}>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
            {isAr ? 'ملخص الحركات النقدية' : 'Cash Movements Summary'}
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Card sx={{ borderRadius: '12px', boxShadow: 'none', border: '1px solid var(--divider)', display: 'flex', p: 2 }}>
                <Box sx={{ bgcolor: 'success.soft', color: 'success.main', p: 1.5, borderRadius: 2, mr: 2 }}>
                  <ArrowUpCircle size={24} />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">{isAr ? 'مبيعات كاش' : 'Cash Sales'}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}><Money value={activeSession.totalSalesCash} /></Typography>
                </Box>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card sx={{ borderRadius: '12px', boxShadow: 'none', border: '1px solid var(--divider)', display: 'flex', p: 2 }}>
                 <Box sx={{ bgcolor: 'success.soft', color: 'success.main', p: 1.5, borderRadius: 2, mr: 2 }}>
                  <ArrowUpCircle size={24} />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">{isAr ? 'مدفوعات العملاء' : 'Customer Payments'}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}><Money value={activeSession.totalCustomerPayments} /></Typography>
                </Box>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card sx={{ borderRadius: '12px', boxShadow: 'none', border: '1px solid var(--divider)', display: 'flex', p: 2 }}>
                <Box sx={{ bgcolor: 'error.soft', color: 'error.main', p: 1.5, borderRadius: 2, mr: 2 }}>
                  <ArrowDownCircle size={24} />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">{isAr ? 'المصروفات' : 'Expenses'}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}><Money value={activeSession.totalExpenses} /></Typography>
                </Box>
              </Card>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Card sx={{ borderRadius: '12px', boxShadow: 'none', border: '1px solid var(--divider)', display: 'flex', p: 2 }}>
                <Box sx={{ bgcolor: 'error.soft', color: 'error.main', p: 1.5, borderRadius: 2, mr: 2 }}>
                  <ArrowDownCircle size={24} />
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">{isAr ? 'مدفوعات الموردين' : 'Supplier Payments'}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}><Money value={activeSession.totalSupplierPayments} /></Typography>
                </Box>
              </Card>
            </Grid>
          </Grid>
        </Grid>

        {/* Right Info pane */}
        <Grid item xs={12} md={4}>
           <Card sx={{ borderRadius: 3, boxShadow: 'var(--shadow-sm)', height: '100%' }}>
             <CardContent>
               <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 3 }}>
                 {isAr ? 'معلومات الجلسة' : 'Session Info'}
               </Typography>
               
               <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                 <Typography color="text.secondary">{isAr ? 'الرصيد الافتتاحي:' : 'Opening Balance:'}</Typography>
                 <Typography sx={{ fontWeight: 600 }}><Money value={activeSession.openingBalance} /></Typography>
               </Box>
               
               <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                 <Typography color="text.secondary">{isAr ? 'مبيعات الشبكة (بطاقات):' : 'Card Sales:'}</Typography>
                 <Typography sx={{ fontWeight: 600 }}><Money value={activeSession.totalSalesCard} /></Typography>
               </Box>

               <Divider sx={{ my: 2 }} />
               
               <Box sx={{ display: 'flex', alignItems: 'flex-start', bgcolor: 'warning.soft', p: 2, borderRadius: 2 }}>
                 <Info size={20} style={{ color: 'var(--warning-main)', marginRight: 12, marginTop: 2 }} />
                 <Typography variant="body2" color="warning.dark">
                   {isAr 
                    ? 'الرصيد المتوقع هو صافي المبالغ النقدية فقط. مدفوعات الشبكة لا تؤثر على صندوق الكاش.' 
                    : 'Expected balance only reflects physical cash movements. Card payments are excluded.'}
                 </Typography>
               </Box>
             </CardContent>
           </Card>
        </Grid>
      </Grid>

      {/* Close Modal */}
      <Dialog 
        open={isCloseModalOpen} 
        onClose={() => setIsCloseModalOpen(false)}
        PaperProps={{ sx: { borderRadius: 3, width: '100%', maxWidth: 450 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>
          {isAr ? 'تأكيد إغلاق الصندوق' : 'Confirm Session Close'}
        </DialogTitle>
        <DialogContent dividers>
          <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
            <Typography variant="body2">
              {isAr ? 'الرصيد المتوقع في النظام هو:' : 'System Expected Cash Balance:'}
              <Box component="span" sx={{ ml: 1 }}><Money value={activeSession.expectedBalance} fontWeight={700} /></Box>
            </Typography>
          </Alert>

          <TextField
            autoFocus
            fullWidth
            label={isAr ? 'الرصيد النقدي الفعلي في الدرج' : 'Actual Cash in Drawer'}
            type="number"
            value={actualBalance}
            onChange={(e) => setActualBalance(e.target.value)}
            sx={{ mb: 2 }}
          />

          {actualBalance !== '' && expectedDiff !== 0 && (
            <Typography 
              variant="body2" 
              color={expectedDiff > 0 ? 'success.main' : 'error.main'}
              sx={{ fontWeight: 600, mb: 2 }}
            >
              {isAr ? 'الفرق:' : 'Discrepancy:'} {expectedDiff > 0 ? '+' : ''}<Money value={expectedDiff} color={expectedDiff > 0 ? 'success.main' : 'error.main'} fontWeight={600} />
            </Typography>
          )}

          <TextField
            fullWidth
            label={isAr ? 'ملاحظات (سبب العجز / الزيادة)' : 'Notes (Discrepancy Reason)'}
            value={closeNotes}
            onChange={(e) => setCloseNotes(e.target.value)}
            multiline
            rows={2}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, px: 3 }}>
          <Button onClick={() => setIsCloseModalOpen(false)} color="inherit">
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button 
            variant="contained" 
            color="error"
            onClick={handleCloseSession}
          >
            {isAr ? 'تأكيد وإغلاق' : 'Confirm & Close'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
