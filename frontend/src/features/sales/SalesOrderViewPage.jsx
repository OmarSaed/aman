// frontend/src/features/sales/SalesOrderViewPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Box, Typography, Button, Card, CardContent, Grid, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, IconButton, Chip, Divider, Stack, Skeleton, Alert
} from '@mui/material';
import { ChevronLeft, Printer, Edit, CheckCircle, Package, User, Calendar, CreditCard, DollarSign, Download } from 'lucide-react';
import { ordersService } from '../../services/orders.service';
import { settingsService } from '../../services/settings.service';
import { formatCurrency, formatDate } from '../../utils/format';
import { toast } from 'react-hot-toast';

export default function SalesOrderViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [order, setOrder] = useState(null);
  const [companySettings, setCompanySettings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
    fetchCompanySettings();
  }, [id]);

  const fetchCompanySettings = async () => {
    try {
      const res = await settingsService.getCompanySettings();
      setCompanySettings(res.data.data || res.data);
    } catch (err) { console.error(err); }
  };

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const res = await ordersService.get(id);
      setOrder(res.data.data || res.data);
    } catch (error) {
      toast.error(t('errors.fetch_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleThermalPrint = () => {
    const printContent = document.getElementById('thermal-receipt')?.outerHTML;
    if (!printContent) return;
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(node => node.outerHTML)
      .join('');
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Thermal Receipt - ${order?.orderNumber}</title>
          ${styles}
          <style>
            body { margin: 0; font-family: monospace; color: #000; }
            * { box-sizing: border-box; }
            @media print { 
              @page { margin: 0; width: 80mm; }
              body { width: 100%; padding: 0; margin: 0; font-size: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              #thermal-receipt { padding: 5mm !important; width: 100% !important; max-width: 80mm; margin: 0 !important; display: block !important; border: none !important; box-shadow: none !important; position: static !important; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>${printContent}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  const handleConfirm = async () => {
    try {
      await ordersService.updateStatus(id, 'CONFIRMED');
      toast.success(isAr ? 'تم تأكيد الطلب بنجاح' : 'Order confirmed successfully');
      fetchOrder();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to confirm order');
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await ordersService.exportExcel(id);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Order_${order.orderNumber}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      toast.error(isAr ? 'فشل تصدير الإكسل' : 'Failed to export Excel');
    }
  };

  if (loading) return <Skeleton variant="rectangular" height={600} />;
  if (!order) return <Alert severity="error">Order not found</Alert>;

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT': return 'warning';
      case 'CONFIRMED': return 'success';
      case 'CANCELLED': return 'error';
      case 'COMPLETED': return 'info';
      default: return 'default';
    }
  };

  const showAccountSummary = order.paymentMethod === 'ON_ACCOUNT' || (order.customer && Number(order.customer.balance) !== 0);
  const currentTotalBalance = Number(order.customer?.balance) || 0;
  const balanceDue = Number(order.balanceDue) || 0;
  const previousBalance = currentTotalBalance - balanceDue;

  return (
    <Box sx={{ p: 4, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      {/* ── Thermal Receipt (Print Only) ── */}
      <Box id="thermal-receipt" sx={{ display: 'none', width: '80mm', p: 1, fontFamily: 'monospace' }}>
        <Box sx={{ textAlign: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight={900}>{companySettings?.companyName || 'Aman ERP'}</Typography>
          <Typography variant="caption" display="block">{companySettings?.address}</Typography>
          <Typography variant="caption" display="block">{companySettings?.phoneNumber}</Typography>
          <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
          <Typography variant="subtitle2" fontWeight={800}>{isAr ? 'فاتورة بيع' : 'Sales Receipt'}</Typography>
          <Typography variant="caption">#{order.orderNumber}</Typography>
        </Box>
        <Box sx={{ my: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
             <Typography variant="caption">Date: {formatDate(order.createdAt, 'PP p')}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
             <Typography variant="caption">Cust: {order.customer?.name}</Typography>
          </Box>
        </Box>
        <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
        <Box sx={{ my: 1 }}>
          {order.items.map((item) => (
            <Box key={item.id} sx={{ mb: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" fontWeight={700}>{item.customName || item.product?.name}</Typography>
                <Typography variant="caption">{formatCurrency(item.totalPrice)}</Typography>
              </Box>
              <Typography variant="caption" display="block" sx={{ opacity: 0.8 }}>
                {item.quantity} x {formatCurrency(item.unitPrice)}
              </Typography>
            </Box>
          ))}
        </Box>
        <Divider sx={{ my: 1, borderStyle: 'dashed' }} />
        <Box sx={{ mt: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption">Total:</Typography>
            <Typography variant="caption">{formatCurrency(order.totalAmount)}</Typography>
          </Box>
          {Number(order.discount) > 0 && (
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption">Discount:</Typography>
              <Typography variant="caption">-{formatCurrency(order.discount)}</Typography>
            </Box>
          )}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
            <Typography variant="body2" fontWeight={900}>NET TOTAL:</Typography>
            <Typography variant="body2" fontWeight={900}>{formatCurrency(order.netAmount)}</Typography>
          </Box>
        </Box>
        
        {showAccountSummary && (
          <Box sx={{ mt: 1, pt: 1, borderTop: '1px dashed #000' }}>
            <Typography variant="caption" sx={{ textAlign: 'center', display: 'block', fontWeight: 700, mb: 0.5 }}>
              {isAr ? 'كشف حساب العميل' : 'Account Summary'}
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption">{isAr ? 'الرصيد السابق' : 'Prev Balance'}</Typography>
              <Typography variant="caption">{formatCurrency(previousBalance)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Typography variant="caption">{isAr ? 'فاتورة اليوم' : 'This Bill'}</Typography>
              <Typography variant="caption">{formatCurrency(balanceDue)}</Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5, pt: 0.5, borderTop: '1px solid #000' }}>
              <Typography variant="caption" fontWeight={700}>{isAr ? 'إجمالي الرصيد' : 'Total Balance'}</Typography>
              <Typography variant="caption" fontWeight={700}>{formatCurrency(currentTotalBalance)}</Typography>
            </Box>
          </Box>
        )}

        <Typography variant="caption" display="block" sx={{ mt: 3, textAlign: 'center', opacity: 0.7 }}>
          {companySettings?.posFooterMessage || 'Thank you for your business!'}
        </Typography>
      </Box>

      {/* Company Branding (Normal Print Only) */}
      <Box className="print-only" sx={{ display: 'none', mb: 4, borderBottom: '2px solid #334155', pb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={8}>
            {companySettings?.logoUrl && (
              <Box component="img" src={companySettings.logoUrl} sx={{ height: 60, mb: 1 }} />
            )}
            <Typography variant="h4" fontWeight={900} color="primary.main">
              {companySettings?.companyName || 'Aman ERP'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {companySettings?.address} | {companySettings?.phoneNumber}
            </Typography>
            {companySettings?.taxNumber && (
              <Typography variant="caption" fontWeight={600}>
                {isAr ? 'الرقم الضريبي:' : 'Tax No:'} {companySettings.taxNumber}
              </Typography>
            )}
          </Grid>
          <Grid item xs={4} sx={{ textAlign: isAr ? 'left' : 'right' }}>
             <Typography variant="h5" fontWeight={800}>{isAr ? 'فاتورة ضريبية' : 'Tax Invoice'}</Typography>
             <Typography variant="body2" color="text.secondary">{isAr ? 'رقم الطلب:' : 'Order No:'} {order.orderNumber}</Typography>
             <Typography variant="body2" color="text.secondary">{isAr ? 'التاريخ:' : 'Date:'} {formatDate(order.createdAt, 'PP')}</Typography>
          </Grid>
        </Grid>
      </Box>

      {/* Header Actions */}
      <Box className="no-print" sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => navigate('/sales')}>
            <ChevronLeft size={24} />
          </IconButton>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              {isAr ? `طلب #${order.orderNumber}` : `Order #${order.orderNumber}`}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {formatDate(order.createdAt, 'PPpp')}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<Printer size={18} />}
            onClick={handlePrint}
          >
            {isAr ? 'طباعة A4' : 'A4 Print'}
          </Button>
          <Button 
            variant="outlined" 
            color="primary"
            startIcon={<Download size={18} />}
            onClick={handleExportExcel}
          >
            {isAr ? 'تصدير إكسل' : 'Excel'}
          </Button>
          <Button 
            variant="outlined" 
            color="secondary"
            startIcon={<Printer size={18} />}
            onClick={handleThermalPrint}
          >
            {isAr ? 'حراري' : 'Thermal'}
          </Button>
          {order.status === 'DRAFT' && (
            <Button 
              variant="contained" 
              color="success"
              startIcon={<CheckCircle size={18} />}
              onClick={handleConfirm}
            >
              {isAr ? 'تأكيد الطلب' : 'Confirm Order'}
            </Button>
          )}
          <Button 
            variant="contained" 
            startIcon={<Edit size={18} />}
            onClick={() => navigate(`/sales/${id}/edit`)}
          >
            {isAr ? 'تعديل' : 'Edit'}
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Main Info */}
        <Grid item xs={12} md={8}>
          <Card sx={{ borderRadius: 3, mb: 3 }} className="print-section">
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>{isAr ? 'الأصناف المطلوبة' : 'Order Items'}</Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{isAr ? 'المنتج' : 'Product'}</TableCell>
                      <TableCell align="center">{isAr ? 'الكمية' : 'Qty'}</TableCell>
                      <TableCell align="right">{isAr ? 'سعر الوحدة' : 'Unit Price'}</TableCell>
                      <TableCell align="right">{isAr ? 'المجموع' : 'Total'}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {order.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>{item.customName || item.product?.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{item.product?.sku || '-'}</Typography>
                        </TableCell>
                        <TableCell align="center">{item.quantity}</TableCell>
                        <TableCell align="right">{formatCurrency(item.unitPrice, order.currency)}</TableCell>
                        <TableCell align="right" fontWeight={700}>{formatCurrency(item.totalPrice, order.currency)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>

          {order.notes && (
            <Card sx={{ borderRadius: 3 }} className="no-print">
              <CardContent>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>{isAr ? 'ملاحظات' : 'Notes'}</Typography>
                <Typography variant="body1">{order.notes}</Typography>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Sidebar Info */}
        <Grid item xs={12} md={4}>
          <Card sx={{ borderRadius: 3, mb: 3 }} className="print-section">
            <CardContent>
              <Stack spacing={3}>
                <Box>
                  <Typography variant="overline" color="text.secondary" fontWeight={800}>{isAr ? 'العميل' : 'CUSTOMER'}</Typography>
                  <Stack direction="row" spacing={2} mt={1} alignItems="center">
                    <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: 'primary.50', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'primary.main' }}>
                      <User size={20} />
                    </Box>
                    <Box>
                      <Typography variant="body1" fontWeight={700}>{order.customer?.name}</Typography>
                      <Typography variant="body2" color="text.secondary">{order.customer?.phone}</Typography>
                      {order.customer && (
                        <Typography variant="body2" color={currentTotalBalance > 0 ? 'error.main' : 'success.main'} fontWeight={600} mt={0.5}>
                          {isAr ? 'رصيد العميل الحالي:' : 'Current Balance:'} {formatCurrency(currentTotalBalance, order.currency)}
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </Box>

                <Divider />

                <Box className="no-print">
                  <Typography variant="overline" color="text.secondary" fontWeight={800}>{isAr ? 'حالة الطلب والدفع' : 'STATUS'}</Typography>
                  <Stack direction="row" spacing={1} mt={1}>
                    <Chip label={order.status} color={getStatusColor(order.status)} variant="soft" />
                    <Chip label={order.paymentStatus} color={order.paymentStatus === 'PAID' ? 'success' : 'warning'} />
                  </Stack>
                </Box>

                <Divider className="no-print" />

                <Box>
                  <Typography variant="overline" color="text.secondary" fontWeight={800}>{isAr ? 'ملخص مالي' : 'FINANCIAL SUMMARY'}</Typography>
                  <Stack spacing={1} mt={1}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">{isAr ? 'الإجمالي الفرعي:' : 'Subtotal:'}</Typography>
                      <Typography variant="body2" fontWeight={600}>{formatCurrency(order.totalAmount, order.currency)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">{isAr ? 'الخصم:' : 'Discount:'}</Typography>
                      <Typography variant="body2" color="error.main">-{formatCurrency(order.discount, order.currency)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">{isAr ? 'الضريبة:' : 'Tax:'}</Typography>
                      <Typography variant="body2">{formatCurrency(order.taxAmount, order.currency)}</Typography>
                    </Box>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="h6">{isAr ? 'الصافي:' : 'Net Total:'}</Typography>
                      <Typography variant="h6" color="primary" fontWeight={800}>{formatCurrency(order.netAmount, order.currency)}</Typography>
                    </Box>
                  </Stack>
                </Box>

                <Divider />

                <Box>
                  <Typography variant="overline" color="text.secondary" fontWeight={800}>{isAr ? 'تفاصيل الدفع' : 'PAYMENT DETAILS'}</Typography>
                  <Stack spacing={1} mt={1}>
                     <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">{isAr ? 'المدفوع:' : 'Paid:'}</Typography>
                      <Typography variant="body2" color="success.main" fontWeight={700}>{formatCurrency(order.paidAmount, order.currency)}</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">{isAr ? 'المتبقي:' : 'Balance Due:'}</Typography>
                      <Typography variant="body2" color={Number(order.balanceDue) > 0 ? 'error.main' : 'text.secondary'} fontWeight={700}>
                        {formatCurrency(order.balanceDue, order.currency)}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Footer (Print Only) */}
      {companySettings?.invoiceFooterMessage && (
        <Box className="print-only" sx={{ display: 'none', mt: 6, pt: 2, borderTop: '1px dashed #cbd5e1', textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {companySettings.invoiceFooterMessage}
          </Typography>
        </Box>
      )}

      {/* Print Styles */}
      <style>
        {`
          @media print {
            .no-print { display: none !important; }
            .print-only { display: block !important; }
            .print-section { display: block !important; visibility: visible !important; }
            body { padding: 0.5cm !important; background: white !important; -webkit-print-color-adjust: exact; }
            .MuiCard-root { border: none !important; box-shadow: none !important; border-bottom: 1px solid #e2e8f0 !important; border-radius: 0 !important; }
            .MuiPaper-root { box-shadow: none !important; }
            .MuiTableCell-root { padding: 8px 4px !important; border-bottom: 1px solid #f1f5f9 !important; }
            .MuiTableHead-root .MuiTableCell-root { background-color: #f8fafc !important; font-weight: 800 !important; }
            @page { margin: 1cm; }
          }
        `}
      </style>
    </Box>

  );
}
