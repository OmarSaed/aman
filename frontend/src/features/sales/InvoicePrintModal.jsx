// frontend/src/features/sales/InvoicePrintModal.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Box, Typography, Divider, Grid, Tab, Tabs
} from '@mui/material';
import { Printer, X } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { settingsService } from '../../services/settings.service';

function OfficialInvoice({ order, t, isAr, companySettings }) {
  const subtotal = order.items?.reduce((s, i) => s + Number(i.totalPrice), 0) || 0;
  
  const showAccountSummary = order.paymentMethod === 'ON_ACCOUNT' || (order.customer && Number(order.customer.balance) !== 0);
  const currentTotalBalance = Number(order.customer?.balance) || 0;
  const balanceDue = Number(order.balanceDue) || 0;
  const previousBalance = currentTotalBalance - balanceDue;

  return (
    <Box sx={{ fontFamily: '"Segoe UI", sans-serif', p: 4, minHeight: '100%', color: '#000' }} id="official-invoice">
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 4 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#1a1a2e', mb: 0.5 }}>{companySettings?.companyName || 'Aman ERP'}</Typography>
          <Typography variant="body2" color="text.secondary">{companySettings?.address || 'Enterprise System'}</Typography>
          {companySettings?.phoneNumber && <Typography variant="body2" color="text.secondary">{companySettings.phoneNumber}</Typography>}
          {companySettings?.taxNumber && <Typography variant="caption" color="text.secondary">Tax: {companySettings.taxNumber}</Typography>}
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="h5" sx={{ fontWeight: 900, color: '#6366f1', mb: 0.5 }}>
            {isAr ? 'بيان أسعار' : 'PRICE NOTE'}
          </Typography>
          <Typography variant="body2"><strong>{t('sales.invoiceNumber')}:</strong> {order.orderNumber}</Typography>
          <Typography variant="body2"><strong>{t('sales.date')}:</strong> {new Date(order.date || order.createdAt).toLocaleDateString()}</Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: '#6366f1', borderWidth: 2, mb: 3 }} />

      {/* Customer Info */}
      <Box sx={{ mb: 4, p: 2, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
        <Typography variant="subtitle2" sx={{ color: '#6366f1', fontWeight: 700, mb: 1 }}>{t('sales.customer')}</Typography>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>{order.customer?.name}</Typography>
        {order.customer?.phone && <Typography variant="body2" color="text.secondary">{order.customer.phone}</Typography>}
        {order.customer?.email && <Typography variant="body2" color="text.secondary">{order.customer.email}</Typography>}
      </Box>

      {/* Items Table */}
      <Box sx={{ border: '1px solid #e2e8f0', borderRadius: 2, overflow: 'hidden', mb: 3 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 100px', bgcolor: '#1a1a2e', px: 2, py: 1.5 }}>
          {[t('sales.item'), t('sales.qty'), t('sales.price'), t('sales.lineTotal')].map((h, i) => (
            <Typography key={i} variant="caption" sx={{ color: 'white', fontWeight: 700, textTransform: 'uppercase', textAlign: i > 0 ? 'right' : 'left' }}>{h}</Typography>
          ))}
        </Box>
        {order.items?.map((item, idx) => (
          <Box key={idx} sx={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px 100px', px: 2, py: 1.5, bgcolor: idx % 2 === 0 ? 'white' : '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.customName || item.product?.name || 'Unknown'}</Typography>
            </Box>
            <Typography variant="body2" sx={{ textAlign: 'right' }}>{item.quantity}</Typography>
            <Typography variant="body2" sx={{ textAlign: 'right' }}>{formatCurrency(item.unitPrice)}</Typography>
            <Typography variant="body2" sx={{ textAlign: 'right', fontWeight: 700 }}>{formatCurrency(item.totalPrice)}</Typography>
          </Box>
        ))}
      </Box>

      {/* Totals */}
      <Box sx={{ maxWidth: 300, ml: 'auto' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2">{t('sales.subtotal')}</Typography>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(subtotal)}</Typography>
        </Box>
        {Number(order.discount) > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="error.main">{t('sales.discount')}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700, color: 'error.main' }}>-{formatCurrency(order.discount)}</Typography>
          </Box>
        )}
        {Number(order.taxAmount) > 0 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">{t('sales.tax')}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(order.taxAmount)}</Typography>
          </Box>
        )}
        <Divider sx={{ my: 1.5 }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', p: 1.5, bgcolor: '#1a1a2e', borderRadius: 1.5 }}>
          <Typography variant="h6" sx={{ color: 'white', fontWeight: 800 }}>{t('sales.netTotal')}</Typography>
          <Typography variant="h6" sx={{ color: '#a5b4fc', fontWeight: 900 }}>{formatCurrency(order.netAmount || order.totalAmount)}</Typography>
        </Box>
        
        {showAccountSummary && (
          <Box sx={{ mt: 2, p: 1.5, border: '1px solid #e2e8f0', borderRadius: 1.5, bgcolor: '#f8fafc' }}>
            <Typography variant="subtitle2" sx={{ color: '#6366f1', fontWeight: 700, mb: 1, textAlign: 'center' }}>
              {isAr ? 'كشف حساب العميل' : 'Account Summary'}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2">{isAr ? 'الرصيد السابق' : 'Previous Balance'}</Typography>
              <Typography variant="body2">{formatCurrency(previousBalance)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2">{isAr ? 'قيمة الفاتورة المضافة' : 'This Bill (Added)'}</Typography>
              <Typography variant="body2">{formatCurrency(balanceDue)}</Typography>
            </Box>
            <Divider sx={{ my: 0.5 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{isAr ? 'إجمالي الرصيد' : 'Total Balance'}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: currentTotalBalance > 0 ? 'error.main' : 'success.main' }}>
                {formatCurrency(currentTotalBalance)}
              </Typography>
            </Box>
          </Box>
        )}
      </Box>

      <Divider sx={{ my: 4 }} />
      {companySettings?.invoiceFooterMessage && (
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 1 }}>{companySettings.invoiceFooterMessage}</Typography>
      )}
      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>{t('sales.thankYou')}</Typography>
    </Box>
  );
}

function ThermalReceipt({ order, t, companySettings }) {
  const subtotal = order.items?.reduce((s, i) => s + Number(i.totalPrice), 0) || 0;
  const isAr = true; // For thermal translations fallback
  
  const showAccountSummary = order.paymentMethod === 'ON_ACCOUNT' || (order.customer && Number(order.customer.balance) !== 0);
  const currentTotalBalance = Number(order.customer?.balance) || 0;
  const balanceDue = Number(order.balanceDue) || 0;
  const previousBalance = currentTotalBalance - balanceDue;

  return (
    <Box
      id="thermal-invoice"
      sx={{
        width: 300, mx: 'auto', fontFamily: '"Courier New", monospace',
        fontSize: '12px', color: '#000', p: 2, bgcolor: 'white',
        border: '1px solid #ccc'
      }}
    >
      <Typography sx={{ textAlign: 'center', fontWeight: 900, fontSize: 16, mb: 0.5 }}>{companySettings?.companyName || 'Aman ERP'}</Typography>
      <Typography sx={{ textAlign: 'center', fontSize: 10 }}>{companySettings?.address || 'Point of Sale System'}</Typography>
      {companySettings?.phoneNumber && <Typography sx={{ textAlign: 'center', fontSize: 10 }}>{companySettings.phoneNumber}</Typography>}
      {companySettings?.taxNumber && <Typography sx={{ textAlign: 'center', fontSize: 10, mb: 1 }}>Tax: {companySettings.taxNumber}</Typography>}
      <Typography sx={{ textAlign: 'center', fontSize: 10, borderTop: '1px dashed #000', borderBottom: '1px dashed #000', py: 0.5, mb: 1, mt: 1 }}>
        {t('sales.thermalInvoice').toUpperCase()}
      </Typography>
      <Typography sx={{ fontSize: 10, mb: 0.5 }}>{t('sales.invoiceNumber')}: {order.orderNumber}</Typography>
      <Typography sx={{ fontSize: 10, mb: 1 }}>{t('sales.date')}: {new Date(order.date || order.createdAt).toLocaleString()}</Typography>
      <Typography sx={{ fontSize: 10, mb: 1, borderBottom: '1px dashed #000', pb: 1 }}>
        {t('sales.customer')}: {order.customer?.name}
      </Typography>

      {/* Items */}
      {order.items?.map((item, idx) => (
        <Box key={idx} sx={{ mb: 0.5 }}>
          <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{item.customName || item.product?.name || 'Unknown'}</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 10 }}>{item.quantity} x {formatCurrency(item.unitPrice)}</Typography>
            <Typography sx={{ fontSize: 10, fontWeight: 700 }}>{formatCurrency(item.totalPrice)}</Typography>
          </Box>
        </Box>
      ))}

      <Typography sx={{ borderTop: '1px dashed #000', mt: 1, mb: 0.5 }}></Typography>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography sx={{ fontSize: 10 }}>{t('sales.subtotal')}</Typography>
        <Typography sx={{ fontSize: 10 }}>{formatCurrency(subtotal)}</Typography>
      </Box>
      {Number(order.discount) > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography sx={{ fontSize: 10 }}>{t('sales.discount')}</Typography>
          <Typography sx={{ fontSize: 10 }}>-{formatCurrency(order.discount)}</Typography>
        </Box>
      )}
      {Number(order.taxAmount) > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
          <Typography sx={{ fontSize: 10 }}>{t('sales.tax')}</Typography>
          <Typography sx={{ fontSize: 10 }}>{formatCurrency(order.taxAmount)}</Typography>
        </Box>
      )}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #000', mt: 0.5, pt: 0.5 }}>
        <Typography sx={{ fontSize: 13, fontWeight: 900 }}>{t('sales.netTotal')}</Typography>
        <Typography sx={{ fontSize: 13, fontWeight: 900 }}>{formatCurrency(order.netAmount || order.totalAmount)}</Typography>
      </Box>

      {showAccountSummary && (
        <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed #000' }}>
          <Typography sx={{ textAlign: 'center', fontSize: 11, fontWeight: 700, mb: 0.5 }}>
            {t('sales.accountSummary') || 'Account Summary'}
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography sx={{ fontSize: 10 }}>{t('sales.previousBalance') || 'Prev Balance'}</Typography>
            <Typography sx={{ fontSize: 10 }}>{formatCurrency(previousBalance)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography sx={{ fontSize: 10 }}>{t('sales.thisBill') || 'This Bill'}</Typography>
            <Typography sx={{ fontSize: 10 }}>{formatCurrency(balanceDue)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ccc', pt: 0.5 }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{t('sales.totalBalance') || 'Total Balance'}</Typography>
            <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{formatCurrency(currentTotalBalance)}</Typography>
          </Box>
        </Box>
      )}
      <Typography sx={{ textAlign: 'center', fontSize: 10, borderTop: '1px dashed #000', mt: 1, pt: 1 }}>
        {companySettings?.invoiceFooterMessage || t('sales.thankYou')}
      </Typography>
    </Box>
  );
}

export default function InvoicePrintModal({ order, open, onClose }) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [tab, setTab] = useState(0);
  const [companySettings, setCompanySettings] = useState(null);

  useEffect(() => {
    if (open) {
      settingsService.getCompanySettings().then(res => {
        setCompanySettings(res.data?.data || res.data);
      }).catch(() => {});
    }
  }, [open]);

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  if (!order) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 3, height: '90vh' } }}>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {tab === 0 ? t('sales.officialInvoice') : t('sales.thermalInvoice')} — {order.orderNumber}
        </Typography>
        <Button size="small" onClick={onClose} color="inherit" sx={{ minWidth: 0, p: 0.5 }}><X size={20} /></Button>
      </DialogTitle>
      <Box sx={{ px: 3, borderBottom: '1px solid var(--divider)' }} className="no-print">
        <Tabs value={tab} onChange={(_, v) => setTab(v)}>
          <Tab label={t('sales.officialInvoice')} />
          <Tab label={t('sales.thermalInvoice')} />
        </Tabs>
      </Box>
      <DialogContent sx={{ p: 0, overflow: 'auto', bgcolor: '#f0f0f0' }}>
        <style>
          {`
            @media print {
              body {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                background: white !important;
              }
              #root {
                display: none !important;
              }
              .MuiDialog-root {
                position: static !important;
              }
              .MuiDialog-container {
                position: static !important;
                height: auto !important;
                display: block !important;
              }
              .MuiPaper-root {
                box-shadow: none !important;
                margin: 0 !important;
                max-width: 100% !important;
                height: auto !important;
                background: white !important;
                overflow: visible !important;
              }
              .MuiDialogTitle-root, .MuiDialogActions-root, .no-print {
                display: none !important;
              }
              .MuiDialogContent-root {
                overflow: visible !important;
                padding: 0 !important;
                background: white !important;
              }
              /* For Thermal specifically */
              ${tab === 1 ? `
                @page { margin: 0; size: 80mm auto; }
                body { margin: 0 !important; padding: 0 !important; }
                .print-container { padding: 0 !important; margin: 0 !important; }
                #thermal-invoice { 
                  width: 100% !important; 
                  max-width: 80mm !important; 
                  margin: 0 !important; 
                  padding: 2mm !important;
                  border: none !important;
                }
              ` : `
                @page { size: A4; margin: 10mm; }
              `}
            }
          `}
        </style>
        <Box sx={{ p: tab === 1 ? 1 : 3, bgcolor: 'white', minHeight: '100%' }} className="print-container">
          {tab === 0 ? <OfficialInvoice order={order} t={t} isAr={isAr} companySettings={companySettings} /> : <ThermalReceipt order={order} t={t} companySettings={companySettings} />}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} color="inherit" variant="outlined" sx={{ borderRadius: 2 }}>
          {t('common.close')}
        </Button>
        <Button
          variant="contained" onClick={handlePrint}
          startIcon={<Printer size={18} />}
          sx={{ borderRadius: 2, fontWeight: 700 }}
        >
          {tab === 0 ? t('sales.printInvoice') : t('sales.printThermal')}
        </Button>
      </DialogActions>
    </Dialog>
  );
}


