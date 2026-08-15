// frontend/src/features/sales/SalesOrdersPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Box, Typography, Button, Card, CardContent, Grid, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, IconButton, Chip, TextField, InputAdornment, MenuItem, TablePagination,
  Menu, Checkbox, FormControlLabel, FormGroup
} from '@mui/material';
import { Search, Plus, Eye, Edit, CheckCircle, DollarSign, Printer, Trash2, Download, User, Columns } from 'lucide-react';
import AddPaymentModal from './AddPaymentModal';
import InvoicePrintModal from './InvoicePrintModal';
import { ordersService } from '../../services/orders.service';
import { formatCurrency, formatDate } from '../../utils/format';
import { exportToCSV } from '../../utils/export';
import { toast } from 'react-hot-toast';

export default function SalesOrdersPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isAr = i18n.language === 'ar';
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  
  // Pagination
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalRows, setTotalRows] = useState(0);

  // Payment
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Print
  const [printOrder, setPrintOrder] = useState(null);

  // Column Visibility State
  const DEFAULT_COLUMNS = {
    orderNumber: true,
    date: true,
    customer: true,
    notes: true,
    total: true,
    cost: false,
    profit: false,
    paid: true,
    left: true,
    status: true,
    payment: true,
    actions: true
  };

  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('salesOrdersColumns');
    return saved ? JSON.parse(saved) : DEFAULT_COLUMNS;
  });

  useEffect(() => {
    localStorage.setItem('salesOrdersColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  const [columnsMenuAnchor, setColumnsMenuAnchor] = useState(null);
  const handleColumnsMenuOpen = (event) => setColumnsMenuAnchor(event.currentTarget);
  const handleColumnsMenuClose = () => setColumnsMenuAnchor(null);

  const handleColumnToggle = (columnKey) => {
    setVisibleColumns(prev => ({ ...prev, [columnKey]: !prev[columnKey] }));
  };

  const handlePrintClick = async (order) => {
    try {
      const res = await ordersService.get(order.id);
      setPrintOrder(res.data.data || res.data);
    } catch (error) {
      toast.error(isAr ? 'فشل تحميل تفاصيل الطلب للطباعة' : 'Failed to load order details for printing');
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [statusFilter, page, rowsPerPage]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await ordersService.list({ 
        page: page + 1,
        limit: rowsPerPage,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        search 
      });
      if (res.data.pagination) {
        setOrders(res.data.data);
        setTotalRows(res.data.pagination.total || 0);
      } else if (res.data.data && Array.isArray(res.data.data.data)) {
        setOrders(res.data.data.data);
        setTotalRows(res.data.data.pagination?.total || 0);
      } else if (res.data.data) {
        setOrders(res.data.data);
        setTotalRows(res.data.data.length || 0);
      } else {
        setOrders(res.data);
        setTotalRows(res.data.length || 0);
      }
    } catch (error) {
      toast.error(t('errors.fetch_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddPaymentClick = (order) => {
    setSelectedOrder(order);
    setPaymentModalOpen(true);
  };

  const handleSavePayment = async (data) => {
    try {
      await ordersService.addPayment(selectedOrder.id, data);
      toast.success(isAr ? 'تم حفظ الدفعة بنجاح' : 'Payment added successfully');
      setPaymentModalOpen(false);
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add payment');
    }
  };

  const handleConfirm = async (id) => {
    try {
      await ordersService.updateStatus(id, 'CONFIRMED');
      toast.success(t('orders.confirmed_success'));
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || t('errors.action_failed'));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(isAr ? 'هل أنت متأكد من حذف هذا الطلب؟ سيتم استرجاع المخزون وتعديل حساب العميل.' : 'Are you sure you want to delete this order? Stock will be reverted and customer balance adjusted.')) {
      return;
    }
    try {
      await ordersService.delete(id);
      toast.success(isAr ? 'تم حذف الطلب بنجاح' : 'Order deleted successfully');
      fetchOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Delete failed');
    }
  };

  const handleExport = () => {
    if (orders.length === 0) return toast.error(isAr ? 'لا توجد بيانات للتصدير' : 'No data to export');
    const headers = [
      { key: 'orderNumber', label: isAr ? 'رقم الطلب' : 'Order Number' },
      { key: 'date', label: isAr ? 'التاريخ' : 'Date' },
      { key: 'customer', label: isAr ? 'العميل' : 'Customer' },
      { key: 'total', label: isAr ? 'الإجمالي' : 'Total Amount' },
      { key: 'cost', label: isAr ? 'التكلفة' : 'Cost' },
      { key: 'profit', label: isAr ? 'الربح' : 'Profit' },
      { key: 'status', label: isAr ? 'حالة الطلب' : 'Status' },
      { key: 'paymentStatus', label: isAr ? 'حالة الدفع' : 'Payment Status' }
    ];
    const rows = orders.map(o => {
      const totalCost = (o.items || []).reduce((sum, item) => sum + (Number(item.product?.costPrice || 0) * item.quantity), 0);
      const profit = Number(o.netAmount) - totalCost;
      return {
      orderNumber: o.orderNumber,
      date: new Date(o.createdAt).toLocaleDateString(),
      customer: o.customer?.name || '-',
      total: o.netAmount,
      cost: totalCost,
      profit: profit,
      status: o.status,
      paymentStatus: o.paymentStatus
    }});
    exportToCSV('sales_orders', rows, headers);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'DRAFT': return 'warning';
      case 'CONFIRMED': return 'success';
      case 'CANCELLED': return 'error';
      case 'COMPLETED': return 'info';
      default: return 'default';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'PAID': return 'success';
      case 'PARTIAL': return 'warning';
      case 'UNPAID': return 'error';
      case 'ON_ACCOUNT': return 'secondary';
      default: return 'default';
    }
  };

  const handleExportOrderExcel = async (order) => {
    try {
      const response = await ordersService.exportExcel(order.id);
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

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          {isAr ? 'أوامر البيع' : 'Sales Orders'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="outlined" 
            startIcon={<Columns size={18} />}
            onClick={handleColumnsMenuOpen}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {isAr ? 'الأعمدة' : 'Columns'}
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<Download size={18} />}
            onClick={handleExport}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {isAr ? 'تصدير' : 'Export'}
          </Button>
          <Button 
            variant="contained" 
            startIcon={<Plus size={18} />}
            onClick={() => navigate('/sales/new')}
            sx={{ borderRadius: 2, px: 3 }}
          >
            {isAr ? 'طلب جديد' : 'New Order'}
          </Button>
        </Box>
      </Box>

      <Card sx={{ mb: 4, borderRadius: 3, boxShadow: 'var(--shadow-sm)' }}>
        <CardContent sx={{ p: 3 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                placeholder={isAr ? 'بحث برقم الطلب، العميل، أو الملاحظات...' : 'Search by order #, customer, or notes...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && fetchOrders()}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={18} />
                    </InputAdornment>
                  ),
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                select
                fullWidth
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                label={isAr ? 'الحالة' : 'Status'}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              >
                <MenuItem value="ALL">{isAr ? 'الكل' : 'All'}</MenuItem>
                <MenuItem value="DRAFT">{isAr ? 'مسودة' : 'Draft'}</MenuItem>
                <MenuItem value="CONFIRMED">{isAr ? 'مؤكد' : 'Confirmed'}</MenuItem>
                <MenuItem value="CANCELLED">{isAr ? 'ملغي' : 'Cancelled'}</MenuItem>
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, md: 3 }}>
               <Button 
                fullWidth 
                variant="outlined" 
                onClick={fetchOrders}
                sx={{ height: 56, borderRadius: 2 }}
              >
                {isAr ? 'تطبيق الفلتر' : 'Filter'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: 'var(--shadow-sm)' }}>
        <Table>
          <TableHead sx={{ bgcolor: 'background.neutral' }}>
            <TableRow>
              {visibleColumns.orderNumber && <TableCell>{isAr ? 'رقم الطلب' : 'Order #'}</TableCell>}
              {visibleColumns.date && <TableCell>{isAr ? 'التاريخ' : 'Date'}</TableCell>}
              {visibleColumns.customer && <TableCell>{isAr ? 'العميل' : 'Customer'}</TableCell>}
              {visibleColumns.notes && <TableCell>{isAr ? 'ملاحظات' : 'Notes'}</TableCell>}
              {visibleColumns.total && <TableCell align="right">{isAr ? 'الإجمالي' : 'Total'}</TableCell>}
              {visibleColumns.cost && <TableCell align="right">{isAr ? 'التكلفة' : 'Cost'}</TableCell>}
              {visibleColumns.profit && <TableCell align="right">{isAr ? 'الربح' : 'Profit'}</TableCell>}
              {visibleColumns.paid && <TableCell align="right">{isAr ? 'المدفوع' : 'Paid'}</TableCell>}
              {visibleColumns.left && <TableCell align="right">{isAr ? 'المتبقي' : 'Left'}</TableCell>}
              {visibleColumns.status && <TableCell align="center">{isAr ? 'حالة الطلب' : 'Order Status'}</TableCell>}
              {visibleColumns.payment && <TableCell align="center">{isAr ? 'حالة الدفع' : 'Payment'}</TableCell>}
              {visibleColumns.actions && <TableCell align="center">{isAr ? 'إجراءات' : 'Actions'}</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id} hover>
                {visibleColumns.orderNumber && <TableCell sx={{ fontWeight: 600 }}>{order.orderNumber}</TableCell>}
                {visibleColumns.date && <TableCell>{formatDate(order.createdAt, 'PP')}</TableCell>}
                {visibleColumns.customer && <TableCell>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{order.customer?.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{order.customer?.type}</Typography>
                </TableCell>}
                {visibleColumns.notes && <TableCell>
                  <Typography variant="caption" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', maxWidth: 150 }}>
                    {order.notes || '-'}
                  </Typography>
                </TableCell>}
                {visibleColumns.total && <TableCell align="right">
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {formatCurrency(order.netAmount, order.currency)}
                  </Typography>
                </TableCell>}
                {visibleColumns.cost && <TableCell align="right">
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {formatCurrency((order.items || []).reduce((sum, item) => sum + (Number(item.product?.costPrice || 0) * item.quantity), 0), order.currency)}
                  </Typography>
                </TableCell>}
                {visibleColumns.profit && <TableCell align="right">
                  <Typography variant="body2" sx={{ fontWeight: 700, color: (Number(order.netAmount) - (order.items || []).reduce((sum, item) => sum + (Number(item.product?.costPrice || 0) * item.quantity), 0)) >= 0 ? 'success.main' : 'error.main' }}>
                    {formatCurrency(Number(order.netAmount) - (order.items || []).reduce((sum, item) => sum + (Number(item.product?.costPrice || 0) * item.quantity), 0), order.currency)}
                  </Typography>
                </TableCell>}
                {visibleColumns.paid && <TableCell align="right">
                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'success.main' }}>
                    {formatCurrency(Number(order.netAmount) - Number(order.balanceDue || 0), order.currency)}
                  </Typography>
                </TableCell>}
                {visibleColumns.left && <TableCell align="right">
                  <Typography variant="body2" sx={{ fontWeight: 700, color: Number(order.balanceDue || 0) > 0 ? 'warning.main' : 'text.primary' }}>
                    {formatCurrency(Number(order.balanceDue || 0), order.currency)}
                  </Typography>
                </TableCell>}
                {visibleColumns.status && <TableCell align="center">
                  <Chip 
                    label={order.status} 
                    color={getStatusColor(order.status)} 
                    size="small" 
                    variant="soft"
                  />
                </TableCell>}
                {visibleColumns.payment && <TableCell align="center">
                   <Chip 
                    label={order.paymentStatus} 
                    color={getPaymentStatusColor(order.paymentStatus)} 
                    size="small"
                  />
                </TableCell>}
                {visibleColumns.actions && <TableCell align="center">
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                    <IconButton size="small" onClick={() => navigate(`/sales/${order.id}/view`)}>
                      <Eye size={16} />
                    </IconButton>
                    <IconButton size="small" title="Export Excel" onClick={() => handleExportOrderExcel(order)}>
                      <Download size={16} />
                    </IconButton>
                    {order.status !== 'CANCELLED' && (
                      <>
                        <IconButton size="small" color="primary" onClick={() => navigate(`/sales/${order.id}/edit`)}>
                          <Edit size={16} />
                        </IconButton>
                        {order.status === 'DRAFT' && (
                          <IconButton size="small" color="success" title="Confirm" onClick={() => handleConfirm(order.id)}>
                            <CheckCircle size={16} />
                          </IconButton>
                        )}
                      </>
                    )}
                    {['CONFIRMED', 'COMPLETED'].includes(order.status) && Number(order.balanceDue) > 0 && order.paymentStatus !== 'ON_ACCOUNT' && (
                      <IconButton size="small" color="success" title="Add Payment" onClick={() => handleAddPaymentClick(order)}>
                        <DollarSign size={16} />
                      </IconButton>
                    )}
                    {order.paymentStatus === 'ON_ACCOUNT' && order.customer?.id && (
                      <IconButton size="small" color="secondary" title={isAr ? 'حساب العميل' : 'Customer Account'} onClick={() => navigate(`/customers/${order.customer.id}/account`)}>
                        <User size={16} />
                      </IconButton>
                    )}
                    <IconButton size="small" title="Print Invoice" onClick={() => handlePrintClick(order)}>
                      <Printer size={16} />
                    </IconButton>
                    <IconButton size="small" color="error" title="Delete Order" onClick={() => handleDelete(order.id)}>
                      <Trash2 size={16} />
                    </IconButton>
                  </Box>
                </TableCell>}
              </TableRow>
            ))}
            {orders.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={10} align="center" sx={{ py: 8 }}>
                  <Typography color="text.secondary">
                    {isAr ? 'لا توجد طلبات بيع تطابق البحث' : 'No sales orders found.'}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      
      <TablePagination
        component="div"
        count={totalRows}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        labelRowsPerPage={isAr ? 'عدد الصفوف:' : 'Rows per page:'}
      />
      
      <Menu
        anchorEl={columnsMenuAnchor}
        open={Boolean(columnsMenuAnchor)}
        onClose={handleColumnsMenuClose}
        PaperProps={{ sx: { width: 250, p: 1 } }}
      >
        <Typography variant="subtitle2" sx={{ px: 2, py: 1, color: 'text.secondary' }}>
          {isAr ? 'اختر الأعمدة' : 'Choose Columns'}
        </Typography>
        <FormGroup sx={{ px: 1 }}>
          <FormControlLabel
            control={<Checkbox checked={visibleColumns.orderNumber} onChange={() => handleColumnToggle('orderNumber')} />}
            label={isAr ? 'رقم الطلب' : 'Order #'}
          />
          <FormControlLabel
            control={<Checkbox checked={visibleColumns.date} onChange={() => handleColumnToggle('date')} />}
            label={isAr ? 'التاريخ' : 'Date'}
          />
          <FormControlLabel
            control={<Checkbox checked={visibleColumns.customer} onChange={() => handleColumnToggle('customer')} />}
            label={isAr ? 'العميل' : 'Customer'}
          />
          <FormControlLabel
            control={<Checkbox checked={visibleColumns.notes} onChange={() => handleColumnToggle('notes')} />}
            label={isAr ? 'ملاحظات' : 'Notes'}
          />
          <FormControlLabel
            control={<Checkbox checked={visibleColumns.total} onChange={() => handleColumnToggle('total')} />}
            label={isAr ? 'الإجمالي' : 'Total'}
          />
          <FormControlLabel
            control={<Checkbox checked={visibleColumns.cost} onChange={() => handleColumnToggle('cost')} />}
            label={isAr ? 'التكلفة' : 'Cost'}
          />
          <FormControlLabel
            control={<Checkbox checked={visibleColumns.profit} onChange={() => handleColumnToggle('profit')} />}
            label={isAr ? 'الربح' : 'Profit'}
          />
          <FormControlLabel
            control={<Checkbox checked={visibleColumns.paid} onChange={() => handleColumnToggle('paid')} />}
            label={isAr ? 'المدفوع' : 'Paid'}
          />
          <FormControlLabel
            control={<Checkbox checked={visibleColumns.left} onChange={() => handleColumnToggle('left')} />}
            label={isAr ? 'المتبقي' : 'Left'}
          />
          <FormControlLabel
            control={<Checkbox checked={visibleColumns.status} onChange={() => handleColumnToggle('status')} />}
            label={isAr ? 'حالة الطلب' : 'Order Status'}
          />
          <FormControlLabel
            control={<Checkbox checked={visibleColumns.payment} onChange={() => handleColumnToggle('payment')} />}
            label={isAr ? 'حالة الدفع' : 'Payment'}
          />
          <FormControlLabel
            control={<Checkbox checked={visibleColumns.actions} onChange={() => handleColumnToggle('actions')} />}
            label={isAr ? 'إجراءات' : 'Actions'}
          />
        </FormGroup>
      </Menu>

      <AddPaymentModal
        open={paymentModalOpen}
        onClose={() => setPaymentModalOpen(false)}
        onSave={handleSavePayment}
        order={selectedOrder}
      />

      <InvoicePrintModal
        open={!!printOrder}
        order={printOrder}
        onClose={() => setPrintOrder(null)}
      />
    </Box>
  );
}

