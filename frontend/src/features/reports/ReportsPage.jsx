// frontend/src/features/reports/ReportsPage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  Grid, Paper, Box, Typography, Stack, 
  CircularProgress, Alert, Tabs, Tab, Button, Divider,
  Checkbox, FormControlLabel, FormGroup, MenuItem, TextField,
  IconButton, Tooltip, Chip, Card, CardContent,
  Avatar, Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as ReTooltip, 
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, Legend
} from 'recharts';
import { useTranslation } from 'react-i18next';
import { reportsService } from '../../services/reports.service';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, TrendingDown, DollarSign, Package, 
  Users, CreditCard, PieChart as PieIcon, BarChart as BarIcon,
  FileText, Download, Filter, List, Activity, Wallet,
  ShoppingBag, ArrowUpRight, ArrowDownRight, RefreshCw,
  Truck, History, Calendar, ShoppingCart, AlertCircle
} from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/format';
import toast from 'react-hot-toast';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ReportsPage() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [tabValue, setTabValue] = useState(0);
  const navigate = useNavigate();

  return (
    <Box sx={{ p: 2 }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-end" mb={4}>
        <Stack spacing={0.5}>
          <Typography variant="h3" fontWeight={900} sx={{ letterSpacing: '-1px', color: '#1e293b' }}>
            {isAr ? 'مركز التحليلات الذكي' : 'Strategic Analytics'}
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ fontWeight: 500, opacity: 0.8 }}>
            {isAr ? 'مراقبة حية لأداء العمليات والمؤشرات المالية' : 'Real-time performance metrics and financial intelligence.'}
          </Typography>
        </Stack>
      </Box>

      <Tabs 
        value={tabValue} 
        onChange={(e, v) => setTabValue(v)} 
        variant="scrollable"
        scrollButtons="auto"
        sx={{ 
          mb: 4, 
          '& .MuiTabs-indicator': { height: 4, borderRadius: '4px 4px 0 0', bgcolor: '#6366f1' },
          '& .MuiTab-root': { fontWeight: 800, fontSize: '0.9rem', px: 3, minHeight: 60, color: '#64748b' },
          '& .Mui-selected': { color: '#6366f1 !important' }
        }}
      >
        <Tab icon={<Activity size={18} />} iconPosition="start" label={isAr ? 'التحليلات' : 'Analytics'} />
        <Tab icon={<TrendingUp size={18} />} iconPosition="start" label={isAr ? 'المبيعات' : 'Sales'} />
        <Tab icon={<Truck size={18} />} iconPosition="start" label={isAr ? 'المشتريات' : 'Purchase Orders'} />
        <Tab icon={<History size={18} />} iconPosition="start" label={isAr ? 'حركة المخزون' : 'Stock Movements'} />
        <Tab icon={<Package size={18} />} iconPosition="start" label={isAr ? 'المخزن' : 'Inventory'} />
        <Tab icon={<Users size={18} />} iconPosition="start" label={isAr ? 'العملاء' : 'Customers'} />
        <Tab icon={<FileText size={18} />} iconPosition="start" label={isAr ? 'منشئ التقارير' : 'Builder'} />
      </Tabs>

      {tabValue === 0 && <AnalyticsTab isAr={isAr} navigate={navigate} />}
      {tabValue === 1 && <SalesReportTab isAr={isAr} />}
      {tabValue === 2 && <PurchaseOrdersTab isAr={isAr} />}
      {tabValue === 3 && <StockMovementsTab isAr={isAr} />}
      {tabValue === 4 && <InventoryReportTab isAr={isAr} />}
      {tabValue === 5 && <CustomerReportTab isAr={isAr} navigate={navigate} />}
      {tabValue === 6 && <ReportBuilderTab isAr={isAr} />}
    </Box>
  );
}

// --- SUB-TABS COMPONENTS ---

function AnalyticsTab({ isAr, navigate }) {
  const { data, isLoading } = useQuery({ 
    queryKey: ['report-charts'], 
    queryFn: () => reportsService.getChartData().then(r => r.data.data) 
  });

  if (isLoading) return <Box p={10} textAlign="center"><CircularProgress /></Box>;

  const kpis = [
    { 
      label: isAr ? 'إجمالي المبيعات' : 'Total Revenue', 
      value: formatCurrency(data?.kpis?.totalRevenue), 
      trend: `${data?.kpis?.revenueGrowth}%`, 
      icon: <DollarSign size={24} />, 
      color: '#3b82f6',
      bg: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
      path: '/sales'
    },
    { 
      label: isAr ? 'صافي الربح' : 'Net Profit', 
      value: formatCurrency(data?.kpis?.totalProfit), 
      trend: isAr ? 'تقديري' : 'Estimated', 
      icon: <TrendingUp size={24} />, 
      color: '#10b981',
      bg: 'linear-gradient(135deg, #ecfdf5 0%, #d1fae5 100%)',
      path: '/reports'
    },
    { 
      label: isAr ? 'نواقص المخزون' : 'Low Stock SKUs', 
      value: data?.kpis?.lowStockCount, 
      trend: isAr ? 'بحاجة لطلب' : 'Needs attention', 
      icon: <AlertCircle size={24} />, 
      color: '#f59e0b',
      bg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
      path: '/reports/low-stock'
    },
    { 
      label: isAr ? 'إجمالي الطلبات' : 'Total Orders', 
      value: data?.kpis?.totalOrders, 
      trend: isAr ? 'الشهر الحالي' : 'This Month', 
      icon: <ShoppingCart size={24} />, 
      color: '#8b5cf6',
      bg: 'linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)',
      path: '/sales'
    },
  ];

  return (
    <Box sx={{ py: 1 }}>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {kpis.map((kpi, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <Card 
              onClick={() => kpi.path && navigate(kpi.path)}
              sx={{ 
                borderRadius: 4, 
                border: '1px solid rgba(255,255,255,0.3)',
                background: kpi.bg,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                }
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ p: 1.5, borderRadius: 3, bgcolor: 'white', color: kpi.color, boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                    {kpi.icon}
                  </Box>
                  <Typography variant="caption" sx={{ fontWeight: 800, color: kpi.color, bgcolor: 'rgba(255,255,255,0.5)', px: 1, py: 0.5, borderRadius: 1.5, height: 'fit-content' }}>
                    {kpi.trend}
                  </Typography>
                </Box>
                <Typography variant="overline" sx={{ color: 'text.secondary', fontWeight: 800, letterSpacing: 1 }}>
                  {kpi.label}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5, color: '#1e293b' }}>
                  {kpi.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 4, borderRadius: 5, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
              <Box>
                <Typography variant="h6" fontWeight={900}>{isAr ? 'أداء المبيعات والأرباح' : 'Revenue vs Profit Performance'}</Typography>
                <Typography variant="body2" color="text.secondary">Daily financial health tracking (30 Days)</Typography>
              </Box>
              <Stack direction="row" spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#3b82f6' }} /><Typography variant="caption" fontWeight={700}>Revenue</Typography></Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#10b981' }} /><Typography variant="caption" fontWeight={700}>Profit</Typography></Box>
              </Stack>
            </Box>
            <Box sx={{ height: 400 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data?.dailyData}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/></linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/></linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }} tickFormatter={(val) => new Date(val).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 600, fill: '#64748b' }} />
                  <ReTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} itemStyle={{ fontWeight: 800 }} />
                  <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorRev)" />
                  <Area type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 4, borderRadius: 5, boxShadow: '0 4px 20px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', height: '100%' }}>
            <Typography variant="h6" fontWeight={900} sx={{ mb: 4 }}>{isAr ? 'توزيع المبيعات' : 'Sales Distribution'}</Typography>
            <Box sx={{ height: 350 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={[{ name: 'Products', value: 400 }, { name: 'Services', value: 300 }, { name: 'Parts', value: 300 }]} innerRadius={80} outerRadius={120} paddingAngle={5} dataKey="value">
                    <Cell fill="#3b82f6" /><Cell fill="#8b5cf6" /><Cell fill="#ec4899" />
                  </Pie>
                  <ReTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Stack spacing={2} sx={{ mt: 2 }}>
               <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Typography variant="body2" color="text.secondary" fontWeight={600}>Top Category</Typography><Typography variant="body2" fontWeight={800} color="primary">Electronics</Typography></Box>
               <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Typography variant="body2" color="text.secondary" fontWeight={600}>Average Order</Typography><Typography variant="body2" fontWeight={800}>$142.50</Typography></Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

function PurchaseOrdersTab({ isAr }) {
  const { data } = useQuery({ queryKey: ['report-purchases'], queryFn: () => reportsService.getPurchases().then(r => r.data.data) });
  return (
    <Stack spacing={3}>
      <SummaryBox title={isAr ? 'إجمالي المشتريات' : 'Total PO Volume'} value={formatCurrency(data?.summary?.totalAmount)} color="#6366f1" />
      <Paper sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={800} mb={3}>{isAr ? 'أوامر الشراء الأخيرة' : 'Recent Purchase Orders'}</Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <table className="modern-table">
            <thead><tr><th>{isAr ? 'التاريخ' : 'Date'}</th><th>{isAr ? 'المورد' : 'Supplier'}</th><th>{isAr ? 'الإجمالي' : 'Total'}</th><th>{isAr ? 'الحالة' : 'Status'}</th></tr></thead>
            <tbody>{data?.recentPOs?.map(po => (
              <tr key={po.id}><td>{formatDate(po.createdAt, 'PP')}</td><td style={{ fontWeight: 700 }}>{po.supplier?.name}</td><td style={{ fontWeight: 900 }}>{formatCurrency(po.totalAmount)}</td><td><Chip label={po.status} size="small" className={`status-badge ${po.status}`} /></td></tr>
            ))}</tbody>
          </table>
        </Box>
      </Paper>
    </Stack>
  );
}

function StockMovementsTab({ isAr }) {
  const { data } = useQuery({ queryKey: ['report-stock-tx'], queryFn: () => reportsService.getStockTransactions().then(r => r.data.data) });
  return (
    <Paper sx={{ p: 4, borderRadius: 3 }}>
      <Typography variant="h6" fontWeight={800} mb={3}>{isAr ? 'سجل حركات المخزون الشامل' : 'Global Stock Transaction Log'}</Typography>
      <Box sx={{ overflowX: 'auto' }}>
        <table className="modern-table">
          <thead><tr><th>{isAr ? 'التاريخ' : 'Date'}</th><th>{isAr ? 'الصنف' : 'Product'}</th><th>{isAr ? 'النوع' : 'Type'}</th><th>{isAr ? 'المخزن' : 'Warehouse'}</th><th>{isAr ? 'الكمية' : 'Qty'}</th><th>{isAr ? 'بواسطة' : 'User'}</th></tr></thead>
          <tbody>{data?.transactions?.map(tx => (
            <tr key={tx.id}><td>{formatDate(tx.createdAt, 'PPp')}</td><td><Typography variant="body2" fontWeight={700}>{tx.product?.name}</Typography><Typography variant="caption" color="text.secondary">{tx.product?.sku}</Typography></td><td><Chip label={tx.transactionType} size="small" variant="outlined" sx={{ fontWeight: 800, fontSize: '10px' }} /></td><td>{tx.warehouse?.name}</td><td style={{ fontWeight: 900, color: tx.quantity > 0 ? '#10b981' : '#ef4444' }}>{tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity}</td><td>{tx.creator?.name}</td></tr>
          ))}</tbody>
        </table>
      </Box>
    </Paper>
  );
}

function SalesReportTab({ isAr }) {
  const { data } = useQuery({ queryKey: ['report-sales'], queryFn: () => reportsService.getSales().then(r => r.data.data) });
  return (
    <Stack spacing={3}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={3}><SummaryBox title={isAr ? 'إجمالي المبيعات' : 'Net Sales'} value={formatCurrency(data?.summary?.netAmount)} color="#6366f1" /></Grid>
        <Grid item xs={12} md={3}><SummaryBox title={isAr ? 'إجمالي المحصل' : 'Collected'} value={formatCurrency(data?.summary?.paidAmount)} color="#10b981" /></Grid>
        <Grid item xs={12} md={3}><SummaryBox title={isAr ? 'الخصومات' : 'Discounts'} value={formatCurrency(data?.summary?.discount)} color="#f59e0b" /></Grid>
        <Grid item xs={12} md={3}><SummaryBox title={isAr ? 'المتبقي' : 'Due Balance'} value={formatCurrency(data?.summary?.balanceDue)} color="#ef4444" /></Grid>
      </Grid>
      <Paper sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={800} mb={3}>{isAr ? 'آخر المبيعات' : 'Recent Sales Activity'}</Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <table className="modern-table">
            <thead><tr><th>{isAr ? 'التاريخ' : 'Date'}</th><th>{isAr ? 'العميل' : 'Customer'}</th><th>{isAr ? 'الإجمالي' : 'Total'}</th><th>{isAr ? 'المحصل' : 'Paid'}</th><th>{isAr ? 'الحالة' : 'Status'}</th></tr></thead>
            <tbody>{data?.recentOrders?.map(o => (
              <tr key={o.id}><td>{formatDate(o.createdAt, 'PP')}</td><td style={{ fontWeight: 700 }}>{o.customer?.name}</td><td style={{ fontWeight: 900 }}>{formatCurrency(o.netAmount)}</td><td>{formatCurrency(o.paidAmount)}</td><td><Chip label={o.status} size="small" className={`status-badge ${o.status}`} /></td></tr>
            ))}</tbody>
          </table>
        </Box>
      </Paper>
    </Stack>
  );
}

function InventoryReportTab({ isAr }) {
  const { data } = useQuery({ queryKey: ['report-inventory'], queryFn: () => reportsService.getInventory().then(r => r.data.data) });
  return (
    <Stack spacing={3}>
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}><SummaryBox title={isAr ? 'إجمالي الأصناف' : 'Total SKU Count'} value={data?.totalProducts} color="#6366f1" /></Grid>
        <Grid item xs={12} md={6}><SummaryBox title={isAr ? 'إجمالي قطع المخزون' : 'Total Units in Stock'} value={data?.totalStockUnits} color="#10b981" /></Grid>
      </Grid>
      <Paper sx={{ p: 4, borderRadius: 3 }}>
        <Typography variant="h6" fontWeight={800} mb={3}>{isAr ? 'توزيع المخزون' : 'Stock Distribution'}</Typography>
        <Box sx={{ overflowX: 'auto' }}>
          <table className="modern-table">
            <thead><tr><th>{isAr ? 'الصنف' : 'Product'}</th><th>{isAr ? 'المخزن' : 'Warehouse'}</th><th>{isAr ? 'الكمية' : 'Quantity'}</th></tr></thead>
            <tbody>{data?.inventoryDist?.map((inv, i) => (
              <tr key={i}><td style={{ fontWeight: 700 }}>{inv.product?.name}</td><td>{inv.warehouse?.name}</td><td style={{ fontWeight: 900 }}>{inv.quantity}</td></tr>
            ))}</tbody>
          </table>
        </Box>
      </Paper>
    </Stack>
  );
}

function CustomerReportTab({ isAr, navigate }) {
  const { data, isLoading } = useQuery({ 
    queryKey: ['report-customers'], 
    queryFn: () => reportsService.getCustomerReports().then(r => r.data.data) 
  });
  if (isLoading) return <Box p={10} textAlign="center"><CircularProgress /></Box>;
  return (
    <Box sx={{ py: 1 }}>
      <Grid container spacing={3} sx={{ mb: 4 }}>
         <Grid item xs={12} md={6}><Card sx={{ borderRadius: 4, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', boxShadow: 'none' }}><CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 3 }}><Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white', borderRadius: 3 }}><Users size={32} /></Box><Box><Typography variant="overline" fontWeight={800} color="text.secondary">Total Customers</Typography><Typography variant="h4" fontWeight={900}>{data?.totalCustomers}</Typography></Box></CardContent></Card></Grid>
         <Grid item xs={12} md={6}><Card sx={{ borderRadius: 4, bgcolor: '#fff1f2', border: '1px solid #fecdd3', boxShadow: 'none' }}><CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 3 }}><Box sx={{ p: 2, bgcolor: 'error.main', color: 'white', borderRadius: 3 }}><TrendingUp size={32} /></Box><Box><Typography variant="overline" fontWeight={800} color="error.dark">Total Outstanding Balance</Typography><Typography variant="h4" fontWeight={900} color="error.dark">{formatCurrency(data?.totalOutstandingBalance)}</Typography></Box></CardContent></Card></Grid>
      </Grid>
      <Paper sx={{ borderRadius: 4, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <Box sx={{ p: 3, borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><Typography variant="h6" fontWeight={900}>{isAr ? 'أكبر المدينين' : 'Top Debtors'}</Typography><Button size="small" onClick={() => navigate('/customers')}>{isAr ? 'عرض الكل' : 'View All'}</Button></Box>
        <TableContainer><Table><TableHead sx={{ bgcolor: '#f8fafc' }}><TableRow><TableCell sx={{ fontWeight: 800 }}>Customer</TableCell><TableCell sx={{ fontWeight: 800 }}>Phone</TableCell><TableCell align="right" sx={{ fontWeight: 800 }}>Balance</TableCell><TableCell align="center" sx={{ fontWeight: 800 }}>Action</TableCell></TableRow></TableHead><TableBody>{data?.topDebtors?.map((c) => (<TableRow key={c.id} hover><TableCell><Box display="flex" alignItems="center" gap={2}><Avatar sx={{ bgcolor: 'primary.50', color: 'primary.main', fontWeight: 800, fontSize: 14 }}>{c.name?.substring(0, 1)}</Avatar><Typography variant="body2" fontWeight={700}>{c.name}</Typography></Box></TableCell><TableCell><Typography variant="body2" color="text.secondary">{c.phone}</Typography></TableCell><TableCell align="right"><Typography variant="body2" fontWeight={900} color="error.main">{formatCurrency(c.balance)}</Typography></TableCell><TableCell align="center"><Button variant="outlined" size="small" onClick={() => navigate(`/customers/${c.id}/account`)} sx={{ borderRadius: 2, fontWeight: 700 }}>Statement</Button></TableCell></TableRow>))}</TableBody></Table></TableContainer>
      </Paper>
    </Box>
  );
}

const MODULE_COLUMNS = {
  products: [{ id: 'name', label: 'Name' }, { id: 'sku', label: 'SKU' }, { id: 'barcode', label: 'Barcode' }, { id: 'category.name', label: 'Category' }, { id: 'brand.name', label: 'Brand' }, { id: 'costPrice', label: 'Cost Price' }, { id: 'mainPrice', label: 'Main Price' }, { id: 'totalQuantity', label: 'Quantity' }, { id: 'lowStockThreshold', label: 'Min Stock' }],
  stock: [{ id: 'product.name', label: 'Product' }, { id: 'product.sku', label: 'SKU' }, { id: 'warehouse.name', label: 'Warehouse' }, { id: 'quantity', label: 'Quantity' }],
  orders: [
    { id: 'orderNumber', label: 'Order #' }, 
    { id: 'customer.name', label: 'Customer' }, 
    { id: 'totalAmount', label: 'Total' }, 
    { id: 'paidAmount', label: 'Paid' }, 
    { id: 'balanceDue', label: 'Balance' }, 
    { id: 'status', label: 'Status' }, 
    { id: 'createdAt', label: 'Date' },
    { id: 'customer.balance', label: 'Customer Balance' },
    { id: 'customer.deposit', label: 'Customer Deposit' },
    { id: 'balanceAfterOrder', label: 'Balance After Order' }
  ]
};

function ReportBuilderTab({ isAr }) {
  const [module, setModule] = useState('products');
  const [selectedCols, setSelectedCols] = useState([]);
  const [dates, setDates] = useState({ start: '', end: '' });
  const mutExport = useMutation({
    mutationFn: (data) => reportsService.exportCustom(data),
    onSuccess: (res) => {
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a'); link.href = url;
      link.setAttribute('download', `report_${module}_${Date.now()}.xlsx`);
      document.body.appendChild(link); link.click(); link.remove();
      toast.success(isAr ? 'Report exported successfully' : 'تم تصدير التقرير');
    }
  });

  return (
    <Paper sx={{ p: 5, borderRadius: 3 }}>
      <Typography variant="h5" fontWeight={900} mb={5}>{isAr ? 'أداة بناء التقارير المخصصة' : 'Excel Report Builder'}</Typography>
      <Grid container spacing={5}>
        <Grid item xs={12} md={4}>
          <Typography variant="subtitle2" fontWeight={800} mb={2}>1. DATA SOURCE</Typography>
          <TextField select fullWidth value={module} onChange={(e) => { setModule(e.target.value); setSelectedCols([]); }} sx={{ mb: 4 }}><MenuItem value="products">Products Master</MenuItem><MenuItem value="stock">Inventory & Stock</MenuItem><MenuItem value="orders">Sales History</MenuItem></TextField>
          <Typography variant="subtitle2" fontWeight={800} mb={2}>2. TIME RANGE</Typography>
          <Stack spacing={2}><TextField type="date" label="From" InputLabelProps={{ shrink: true }} value={dates.start} onChange={(e) => setDates(p => ({ ...p, start: e.target.value }))} /><TextField type="date" label="To" InputLabelProps={{ shrink: true }} value={dates.end} onChange={(e) => setDates(p => ({ ...p, end: e.target.value }))} /></Stack>
        </Grid>
        <Grid item xs={12} md={8}>
          <Typography variant="subtitle2" fontWeight={800} mb={2}>3. DATA COLUMNS</Typography>
          <Paper variant="outlined" sx={{ p: 3, borderRadius: 2, bgcolor: '#f8fafc' }}><FormGroup row>{MODULE_COLUMNS[module].map(col => (<FormControlLabel key={col.id} control={<Checkbox checked={selectedCols.includes(col.id)} onChange={() => setSelectedCols(p => p.includes(col.id) ? p.filter(c => c !== col.id) : [...p, col.id])} />} label={col.label} sx={{ width: '33%' }} />))}</FormGroup></Paper>
          <Box mt={6} textAlign="right"><Button variant="contained" size="large" startIcon={<Download />} disabled={selectedCols.length === 0 || mutExport.isPending} onClick={() => mutExport.mutate({ module, columns: selectedCols, startDate: dates.start, endDate: dates.end })} sx={{ px: 8, py: 2, borderRadius: 2, fontWeight: 900, bgcolor: '#6366f1' }}>{mutExport.isPending ? 'Processing...' : 'Download Report'}</Button></Box>
        </Grid>
      </Grid>
    </Paper>
  );
}

function SummaryBox({ title, value, color }) {
  return (
    <Paper sx={{ p: 3, borderTop: `5px solid ${color}`, borderRadius: 2 }}>
      <Typography variant="overline" color="text.secondary" fontWeight={900}>{title}</Typography>
      <Typography variant="h4" fontWeight={900}>{value}</Typography>
    </Paper>
  );
}
