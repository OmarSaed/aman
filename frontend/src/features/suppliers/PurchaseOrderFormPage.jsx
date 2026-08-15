// frontend/src/features/suppliers/PurchaseOrderFormPage.jsx
import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import {
  Container, Grid, Paper, Box, Typography, TextField,
  Button, MenuItem, InputAdornment, IconButton,
  Stack, Breadcrumbs, Link, Autocomplete, createFilterOptions,
  Dialog, DialogTitle, DialogContent, DialogActions, Tooltip,
  Divider
} from '@mui/material';
import {
  ArrowBack, ReceiptLong, LocalShipping,
  Delete, QrCodeScanner, AccountBalanceWallet, Widgets,
  WarningAmber, AddBox, Lock,
  AutoFixHigh, Percent, Inventory2,
  QrCode as BarcodeIcon
} from '@mui/icons-material';
import { suppliersService } from '../../services/suppliers.service';
import { productsService } from '../../services/products.service';
import { inventoryService } from '../../services/inventory.service';
import Can from '../auth/Can';

const filter = createFilterOptions();

export default function PurchaseOrderFormPage() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const qc = useQueryClient();
  const isAr = i18n.language === 'ar';

  const isEdit = !!id;

  // ── Form State ────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState({
    supplierId: '',
    poNumber: '',
    expectedDate: '',
    notes: '',
    warehouseId: ''
  });

  const [lineItems, setLineItems] = useState([]);

  // ── UI State ──────────────────────────────────────────────────────────────
  const [searchVal, setSearchVal] = useState('');
  const [quickAddModal, setQuickAddModal] = useState({ open: false, initialName: '', initialBarcode: '' });
  const [priceAdjustModal, setPriceAdjustModal] = useState({ open: false, lineIndex: null, product: null, oldPrice: 0, newPrice: 0 });
  const [isInitialized, setIsInitialized] = useState(false);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => suppliersService.list().then(r => r.data.data) });
  const { data: warehouses } = useQuery({ queryKey: ['warehouses'], queryFn: () => inventoryService.listWarehouses().then(r => r.data.data) });
  const { data: products, isLoading: isProductsLoading } = useQuery({
    queryKey: ['products_search', searchVal],
    queryFn: () => productsService.list({ search: searchVal, limit: 100 }).then(r => {
       const resData = r.data?.data || r.data;
       return Array.isArray(resData) ? resData : (resData?.data || []);
    }),
    enabled: true,
  });

  const { data: poDetails, isLoading: isPoLoading } = useQuery({
    queryKey: ['purchaseOrder', id],
    queryFn: () => suppliersService.getOrder(id).then(r => r.data.data),
    enabled: isEdit
  });

  const { state } = useLocation();

  useEffect(() => {
    if (isInitialized) return;

    if (isEdit && poDetails) {
      setFormData({
        supplierId: poDetails.supplierId || '',
        poNumber: poDetails.poNumber || '',
        expectedDate: poDetails.expectedDate ? poDetails.expectedDate.split('T')[0] : '',
        notes: poDetails.notes || '',
        warehouseId: ''
      });
      if (poDetails.items?.length > 0) {
        setLineItems(poDetails.items.map(i => ({
          product: i.product,
          quantityOrdered: i.quantityOrdered,
          unitPrice: i.unitPrice
        })));
      }
      setIsInitialized(true);
    }
  }, [isEdit, poDetails, isInitialized]);

  useEffect(() => {
    if (isInitialized) return;

    if (!isEdit && state?.initialProductIds && products?.length > 0) {
      // Pre-populate items from state
      const initialItems = products.filter(p => state.initialProductIds.includes(p.id));
      setLineItems(initialItems.map(p => ({
        product: p,
        quantityOrdered: 1,
        unitPrice: parseFloat(p.costPrice) || 0
      })));
      setIsInitialized(true);
    }
  }, [isEdit, state, products, isInitialized]);

  const isReadOnly = isEdit && (poDetails?.status === 'Received' || poDetails?.status === 'Cancelled' || poDetails?.status === 'Returned');

  // ── Mutations ─────────────────────────────────────────────────────────────
  const mutSavePO = useMutation({
    mutationFn: (payload) => isEdit ? suppliersService.updateOrder(id, payload) : suppliersService.createOrder(payload),
    onSuccess: async (res, variables) => {
      const poId = res.data.data.id;
      if (variables.autoReceive && formData.warehouseId && !isReadOnly) {
        try {
          await suppliersService.receiveOrder(poId, {
            warehouseId: formData.warehouseId,
            receiveItems: res.data.data.items.map(item => ({ itemId: item.id, quantityReceived: item.quantityOrdered }))
          });
          toast.success(isAr ? 'تم حفظ واستلام أمر الشراء' : 'PO Saved & Received');
        } catch (err) {
          toast.error(isAr ? 'حُفظ الأمر لكن فشل الاستلام' : 'PO Saved, receive failed');
        }
      } else {
        toast.success(isAr ? 'تم حفظ أمر الشراء' : 'PO Saved');
      }
      qc.invalidateQueries(['purchaseOrders']);
      qc.invalidateQueries(['stock']);
      navigate('/orders');
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error saving PO')
  });

  const mutQuickProduct = useMutation({
    mutationFn: (data) => productsService.create(data),
    onSuccess: (res) => {
      toast.success(isAr ? 'تم الإضافة' : 'Product created');
      qc.invalidateQueries(['products_all']);
      addLineItem(res.data.data);
      setQuickAddModal({ open: false, initialName: '', initialBarcode: '' });
    }
  });

  const mutUpdateProductPrice = useMutation({
    mutationFn: ({ productId, data }) => productsService.update(productId, data),
    onSuccess: () => {
      toast.success(isAr ? 'تم تحديث الأسعار' : 'Prices updated');
      qc.invalidateQueries(['products_all']);
      setPriceAdjustModal({ open: false });
    }
  });

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleChange = (e) => { if (!isReadOnly) setFormData(p => ({ ...p, [e.target.name]: e.target.value })); };

  const addLineItem = (product) => {
    if (isReadOnly) return;
    const existingIdx = lineItems.findIndex(i => i.product.id === product.id);
    if (existingIdx >= 0) {
      setLineItems(prev => {
        const next = [...prev];
        next[existingIdx].quantityOrdered += 1;
        return next;
      });
    } else {
      setLineItems(prev => [...prev, { product, quantityOrdered: 1, unitPrice: parseFloat(product.costPrice) || 0 }]);
    }
    setSearchVal('');
  };

  const updateLineItem = (index, field, value) => {
    if (isReadOnly) return;
    setLineItems(prev => {
      const next = [...prev];
      next[index][field] = value;
      return next;
    });
  };

  const removeLineItem = (index) => {
    if (isReadOnly) return;
    setLineItems(prev => prev.filter((_, i) => i !== index));
  };

  const detectAndAdd = (inputString) => {
    if (!inputString.trim() || isReadOnly) return;
    const existing = products?.find(p => p.barcode === inputString || p.sku === inputString || p.name.toLowerCase() === inputString.toLowerCase());
    if (existing) addLineItem(existing);
    else {
      const isNumberLike = /^\d{6,}$/.test(inputString);
      setQuickAddModal({ open: true, initialName: isNumberLike ? '' : inputString, initialBarcode: isNumberLike ? inputString : '' });
    }
    setSearchVal('');
  };

  const handleSave = (autoReceive = false) => {
    if (isReadOnly) return toast.error(isAr ? 'طلب مقفل' : 'Locked PO');
    if (!formData.supplierId) return toast.error(isAr ? 'اختر المورد' : 'Select a supplier');
    if (lineItems.length === 0) return toast.error(isAr ? 'أضف منتجات' : 'Add products');
    if (autoReceive && !formData.warehouseId) return toast.error(isAr ? 'اختر المستودع' : 'Select warehouse');

    mutSavePO.mutate({
      supplierId: formData.supplierId,
      poNumber: formData.poNumber,
      expectedDate: formData.expectedDate || null,
      notes: formData.notes,
      autoReceive,
      items: lineItems.map(i => ({ productId: i.product.id, quantityOrdered: parseInt(i.quantityOrdered) || 1, unitPrice: parseFloat(i.unitPrice) || 0 }))
    });
  };

  const totalAmount = lineItems.reduce((acc, curr) => acc + ((parseInt(curr.quantityOrdered) || 0) * parseFloat(curr.unitPrice || 0)), 0);

  if (isEdit && isPoLoading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;

  return (
    <Container maxWidth={false} sx={{ height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column', p: 3, overflow: 'hidden' }}>

      {/* ── HEADER (Ultra-Compact) ── */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <IconButton onClick={() => navigate('/orders')} size="small" sx={{ bgcolor: 'white', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <ArrowBack sx={{ transform: isAr ? 'rotate(180deg)' : 'none', fontSize: 18 }} />
          </IconButton>
          <Breadcrumbs aria-label="breadcrumb" sx={{ '& .MuiBreadcrumbs-separator': { mx: 0.5 } }}>
            <Link underline="hover" color="inherit" onClick={() => navigate('/orders')} sx={{ cursor: 'pointer', fontSize: 14 }}>
              {isAr ? 'أوامر الشراء' : 'Orders'}
            </Link>
            <Typography color="text.primary" fontWeight={700} fontSize={14}>
              {isEdit ? `${poDetails?.poNumber || ''}` : (isAr ? 'أمر جديد' : 'New Order')}
            </Typography>
          </Breadcrumbs>
          {isReadOnly && (
            <Box sx={{ bgcolor: '#fee2e2', color: '#991b1b', px: 1, py: 0.2, borderRadius: 1, display: 'flex', alignItems: 'center', ml: 2, fontSize: 12 }}>
              <Lock sx={{ fontSize: 14, mr: 0.5 }} /> {isAr ? 'مقفل - مستلم' : 'Read-Only (Received)'}
            </Box>
          )}
        </Stack>

        <Stack direction="row" spacing={1}>
          <Button variant="outlined" size="small" color="inherit" onClick={() => navigate('/orders')}>{isReadOnly ? (isAr ? 'عودة' : 'Back') : (isAr ? 'إلغاء' : 'Cancel')}</Button>
          {!isReadOnly && (
            <>
              <Button variant="contained" size="small" color="secondary" onClick={() => handleSave(false)} disabled={mutSavePO.isPending}>
                {mutSavePO.isPending ? '...' : (isAr ? 'مسودة' : 'Draft')}
              </Button>
              {(!isEdit || poDetails?.status !== 'Received') && (
                <Can permission="orders:receive-po">
                  <Button variant="contained" size="small" onClick={() => handleSave(true)} disabled={mutSavePO.isPending} sx={{ background: '#059669', '&:hover': { background: '#047857' } }} startIcon={<LocalShipping sx={{ fontSize: 16 }} />}>
                    {mutSavePO.isPending ? '...' : (isAr ? 'تأكيد واستلام' : 'Receive')}
                  </Button>
                </Can>
              )}
            </>
          )}
        </Stack>
      </Box>

      {/* ── TOP CONFIG ROW (Refined Premium Cards) ── */}
      <Box sx={{ display: 'flex', gap: 3, mb: 3, overflowX: 'auto', py: 1, px: 0.5, '&::-webkit-scrollbar': { height: 6 }, '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: '10px' } }}>
        <Paper sx={{ p: 3, borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.04)', minWidth: 370, flexShrink: 0, bgcolor: 'white', position: 'relative', overflow: 'hidden' }}>
          <Box display="flex" alignItems="center" gap={2} mb={2.5}>
            <Box sx={{ p: 1.25, borderRadius: '8px', bgcolor: '#f0f7ff', display: 'flex', border: '1px solid #dbeafe' }}><ReceiptLong sx={{ fontSize: 22, color: '#3b82f6' }} /></Box>
            <Typography variant="h6" fontWeight={800} color="#1e293b" sx={{ letterSpacing: -0.5 }}>{isAr ? 'بيانات التوريد' : 'Supply Logistics'}</Typography>
          </Box>
          <Stack direction="row" spacing={2.5}>
            <TextField select label={isAr ? 'المورد *' : 'Vendor *'} name="supplierId" value={formData.supplierId} onChange={handleChange} disabled={isReadOnly} size="small" sx={{ bgcolor: '#f8fafc', flex: 2, '& .MuiOutlinedInput-root': { borderRadius: '10px', '& fieldset': { borderColor: '#e2e8f0' }, '&:hover fieldset': { borderColor: '#3b82f6' } } }}>
              {suppliers?.length > 0 ? (
                suppliers.map(s => <MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>)
              ) : (
                <MenuItem disabled value="">{isAr ? 'لا يوجد موردين' : 'No Suppliers available'}</MenuItem>
              )}
            </TextField>
            <TextField label={isAr ? 'رقم الطلب' : 'PO Number'} name="poNumber" value={formData.poNumber} onChange={handleChange} disabled={isReadOnly} size="small" placeholder={isAr ? 'تلقائي' : 'Auto-generated'} sx={{ bgcolor: '#f8fafc', flex: 1.2, '& .MuiOutlinedInput-root': { borderRadius: '10px', '& fieldset': { borderColor: '#e2e8f0' } } }} />
            <TextField type="date" label={isAr ? 'التاريخ' : 'Order Date'} name="expectedDate" value={formData.expectedDate} onChange={handleChange} disabled={isReadOnly} size="small" InputLabelProps={{ shrink: true }} sx={{ bgcolor: '#f8fafc', flex: 1.2, '& .MuiOutlinedInput-root': { borderRadius: '10px', '& fieldset': { borderColor: '#e2e8f0' } } }} />
            <TextField label={isAr ? 'ملاحظة' : 'Ref #'} name="notes" value={formData.notes} onChange={handleChange} disabled={isReadOnly} size="small" sx={{ bgcolor: '#f8fafc', flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px', '& fieldset': { borderColor: '#e2e8f0' } } }} />
          </Stack>
        </Paper>

        <Paper sx={{ p: 3, borderRadius: '10px', border: '1px dashed #94a3b8', bgcolor: '#fdfdfd', boxShadow: 'none', minWidth: 370, flexShrink: 0, position: 'relative' }}>
          <Box display="flex" alignItems="center" gap={2} mb={2.5}>
            <Box sx={{ p: 1.25, borderRadius: '8px', bgcolor: '#f1f5f9', display: 'flex', border: '1px solid #e2e8f0' }}><Widgets sx={{ fontSize: 22, color: '#64748b' }} /></Box>
            <Typography variant="h6" fontWeight={800} color="#334155" sx={{ letterSpacing: -0.5 }}>{isAr ? 'مستودع الاستلام' : 'Inventory Target'}</Typography>
          </Box>
          <TextField select name="warehouseId" value={formData.warehouseId} onChange={handleChange} disabled={isReadOnly || (isEdit && poDetails?.status === 'Received')} size="small" fullWidth sx={{ bgcolor: 'white', '& .MuiOutlinedInput-root': { borderRadius: '10px', '& fieldset': { borderColor: '#cbd5e1' } } }}>
            <MenuItem value="">{isAr ? 'لا يوجد استلام فوري' : 'No Direct Receipt'}</MenuItem>
            {warehouses?.map(w => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)}
          </TextField>
        </Paper>

        <Paper sx={{ p: 3, px: 5, borderRadius: '10px', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minWidth: 370, flexShrink: 0, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)', position: 'relative', overflow: 'hidden' }}>
          <Box sx={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, background: 'radial-gradient(circle, rgba(56, 189, 248, 0.1) 0%, transparent 70%)', borderRadius: '50%' }} />
          <Box display="flex" alignItems="center" gap={3}>
            <Box sx={{ width: 52, height: 52, borderRadius: '10px', bgcolor: 'rgba(56, 189, 248, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
              <AccountBalanceWallet sx={{ fontSize: 28, color: '#38bdf8' }} />
            </Box>
            <Box>
              <Typography variant="overline" fontWeight={700} color="#64748b" sx={{ letterSpacing: 1.5, display: 'block', mb: 0.5 }}>{isAr ? 'إجمالي قيمة الطلب' : 'Purchase Total Value'}</Typography>
              <Typography variant="h5" fontWeight={900} color="white" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {isAr ? 'الإجمالي' : 'Grand Total'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ textAlign: isAr ? 'left' : 'right' }}>
            <Typography variant="h3" sx={{ fontWeight: 950, color: '#38bdf8', letterSpacing: '-0.05em', textShadow: '0 0 30px rgba(56, 189, 248, 0.4)' }}>
              ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Typography>
          </Box>
        </Paper>
      </Box>

      {/* ── LINE ITEMS TABLE AREA (Flex Grow) ── */}
      <Paper sx={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', display: 'flex', flexDirection: 'column', flexGrow: 1, overflow: 'hidden', bgcolor: 'white' }}>

        {/* Table Header & Scanner */}
        <Box sx={{ bgcolor: '#ffffff', p: 2.5, display: 'flex', borderBottom: '1px solid #f1f5f9', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box>
            <Typography variant="h6" fontWeight={900} color="#1e293b" sx={{ letterSpacing: -0.5 }}>{isAr ? 'قائمة المنتجات' : 'Purchase Line Items'}</Typography>
            <Typography variant="caption" color="text.secondary">{isAr ? `${lineItems.length} منتج مضاف` : `${lineItems.length} items added to this order`}</Typography>
          </Box>
          {!isReadOnly && (
            <Box sx={{ width: { xs: '100%', sm: '400px', md: '550px' } }}>
              <Autocomplete
                value={searchVal}
                onChange={(e, nv) => {
                  if (typeof nv === 'string') detectAndAdd(nv);
                  else if (nv?.inputValue) detectAndAdd(nv.inputValue);
                  else if (nv) addLineItem(nv);
                }}
                onInputChange={(e, nv) => setSearchVal(nv)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); detectAndAdd(searchVal); } }}
                options={products || []}
                loading={isProductsLoading}
                getOptionLabel={(o) => {
                  if (typeof o === 'string') return o;
                  if (o.inputValue) return o.inputValue;
                  const categoryName = o.category?.name || (isAr ? 'بدون فئة' : 'No Category');
                  return `${o.name} (${o.sku}) - ${categoryName}`;
                }}
                filterOptions={(opts, params) => {
                  // Since we search server-side, we only need to add the "Quick Add" option
                  const filtered = [...opts];
                  const isEx = opts.some(o => params.inputValue === o.name || params.inputValue === o.sku || params.inputValue === o.barcode);
                  if (params.inputValue && !isEx) {
                    filtered.push({ 
                      inputValue: params.inputValue, 
                      name: `➕ ${isAr ? 'إنشاء سريع:' : 'Quick Add:'} "${params.inputValue}"` 
                    });
                  }
                  return filtered;
                }}
                renderOption={(props, o) => {
                  const { key, ...otherProps } = props;
                  const categoryName = o.category?.name || (isAr ? 'بدون فئة' : 'No Category');
                  return (
                    <li {...otherProps} key={o.id || 'add'} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <Box display="flex" justifyContent="space-between" width="100%" alignItems="center">
                        <Box>
                          <Typography fontWeight={700} fontSize={14}>{o.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{categoryName}</Typography>
                        </Box>
                        {o.sku && (
                          <Typography variant="caption" fontWeight={600} color="primary" sx={{ bgcolor: '#f0f9ff', px: 1, borderRadius: '4px' }}>
                            {o.sku}
                          </Typography>
                        )}
                      </Box>
                    </li>
                  );
                }}
                freeSolo
                size="small"
                renderInput={(params) => (
                  <TextField
                    {...params}
                    placeholder={isAr ? 'امسح باركود أو ابحث عن منتج...' : 'Scan / Search Product...'}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: <InputAdornment position="start" sx={{ pl: 1 }}><QrCodeScanner color="primary" fontSize="small" /></InputAdornment>,
                      sx: { bgcolor: '#f8fafc', borderRadius: '10px', pt: '8px', pb: '8px', pl: '12px', fontSize: 13, '& fieldset': { borderColor: '#e2e8f0' }, '&:hover fieldset': { borderColor: '#3b82f6' }, '& input': { p: '0px 8px !important' } }
                    }}
                  />
                )}
              />
            </Box>
          )}
        </Box>

        {/* Table Body */}
        {lineItems.length === 0 ? (
          <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: '#f8fafc', gap: 2 }}>
            <Box sx={{ width: 80, height: 80, borderRadius: '50%', bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #cbd5e1' }}>
              <AddBox sx={{ fontSize: 40, color: '#94a3b8' }} />
            </Box>
            <Box textAlign="center">
              <Typography variant="h6" fontWeight={800} color="#64748b">{isAr ? 'لا توجد منتجات بعد' : 'No Products Added'}</Typography>
              <Typography variant="body2" color="#94a3b8">{isAr ? 'امسح الباركود أو ابحث لإضافة منتجات للأمر' : 'Scan a code or use the search bar to populate this order'}</Typography>
            </Box>
          </Box>
        ) : (
          <Box sx={{ overflowY: 'auto', flexGrow: 1, bgcolor: '#ffffff' }}>
            <table style={{ width: '100%', minWidth: 800, borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', padding: '14px 20px', textAlign: isAr ? 'right' : 'left', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e2e8f0' }}>#</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', padding: '14px 20px', textAlign: isAr ? 'right' : 'left', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e2e8f0' }}>{isAr ? 'المنتج' : 'Product Details'}</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', padding: '14px 20px', textAlign: isAr ? 'right' : 'left', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e2e8f0', width: 140 }}>{isAr ? 'الكمية' : 'Order Qty'}</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', padding: '14px 20px', textAlign: isAr ? 'right' : 'left', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e2e8f0', width: 180 }}>{isAr ? 'تكلفة الوحدة' : 'Unit Cost ($)'}</th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', padding: '14px 20px', textAlign: isAr ? 'right' : 'left', fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid #e2e8f0', width: 150 }}>{isAr ? 'المجموع' : 'Subtotal'}</th>
                  {!isReadOnly && <th style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc', width: 80, borderBottom: '1px solid #e2e8f0' }}></th>}
                </tr>
              </thead>
              <tbody>
                {lineItems.map((item, idx) => {
                  const sysCost = parseFloat(item.product.costPrice) || 0;
                  const currentVal = parseFloat(item.unitPrice) || 0;
                  const isCostChanged = currentVal > 0 && Math.abs(currentVal - sysCost) > 0.01;
                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0', background: isCostChanged ? '#fffbeb' : 'white' }}>
                      <td style={{ padding: '8px 14px', color: '#94a3b8', fontSize: 13 }}>{idx + 1}</td>
                      <td style={{ padding: '8px 14px' }}>
                        <Typography variant="body2" fontWeight={700} color="#0f172a" fontSize={13}>{item.product.name}</Typography>
                        <Typography variant="caption" color="text.secondary" fontSize={11}>{item.product.sku}</Typography>
                      </td>
                      <td style={{ padding: '8px 14px' }}>
                        <TextField type="number" size="small" value={item.quantityOrdered} onChange={(e) => updateLineItem(idx, 'quantityOrdered', e.target.value)} inputProps={{ min: 1 }} sx={{ width: '100%', bgcolor: 'white', '& input': { p: '6px' } }} disabled={isReadOnly} />
                      </td>
                      <td style={{ padding: '8px 14px' }}>
                        <Box display="flex" alignItems="center" gap={0.5}>
                          <TextField type="number" size="small" value={item.unitPrice} onChange={(e) => updateLineItem(idx, 'unitPrice', e.target.value)} inputProps={{ min: 0, step: 0.01 }} sx={{ width: '100%', bgcolor: 'white', '& input': { p: '6px' } }} disabled={isReadOnly} />
                          {isCostChanged && !isReadOnly && (
                            <Tooltip title={isAr ? 'تغيرت التكلفة!' : 'Cost shifted!'}>
                              <IconButton color="warning" size="small" onClick={() => setPriceAdjustModal({ open: true, lineIndex: idx, product: item.product, oldPrice: sysCost, newPrice: currentVal })} sx={{ p: 0.5 }}>
                                <WarningAmber fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                        </Box>
                      </td>
                      <td style={{ padding: '8px 14px', fontWeight: 800, color: 'var(--primary)', fontSize: 13 }}>
                        ${((parseInt(item.quantityOrdered) || 0) * currentVal).toFixed(2)}
                      </td>
                      {!isReadOnly && (
                        <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                          <IconButton color="error" size="small" onClick={() => removeLineItem(idx)} sx={{ p: 0.5 }}>
                            <Delete fontSize="small" />
                          </IconButton>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        )}
      </Paper>

      {/* ── Modals ── */}
      <QuickAddProductModal open={quickAddModal.open} onClose={() => setQuickAddModal({ open: false, initialName: '', initialBarcode: '' })} initialName={quickAddModal.initialName} initialBarcode={quickAddModal.initialBarcode} mutSubmit={mutQuickProduct} />
      {priceAdjustModal.open && <PriceAdjustmentModal info={priceAdjustModal} onClose={() => setPriceAdjustModal({ open: false })} mutSubmit={mutUpdateProductPrice} />}
    </Container>
  );
}

// ── Shared Sub-Components ───────────────────────────────────────────────────

function QuickAddProductModal({ open, onClose, initialName, initialBarcode, mutSubmit }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => productsService.listCategories().then(r => r.data.data), enabled: open });
  const { data: brands } = useQuery({ queryKey: ['brands'], queryFn: () => productsService.listBrands().then(r => r.data.data), enabled: open });

  const emptyLocal = () => ({
    name: '',
    sku: `SKU-${Date.now().toString().slice(-6)}`,
    barcode: '',
    categoryId: '',
    brandId: '',
    costPrice: '',
    mainPriceMarkupPercentage: '',
    mainPrice: '',
    wholesaleMarkupPercentage: '',
    wholesalePrice: '',
    wholesaleBoxQuantity: 1,
  });

  const [local, setLocal] = useState(emptyLocal());

  useEffect(() => {
    if (open) setLocal({ ...emptyLocal(), name: initialName || '', barcode: initialBarcode || '' });
  }, [open, initialName, initialBarcode]);

  // Live pricing auto-calculation
  const handleChange = (e) => {
    const { name, value } = e.target;
    setLocal(prev => {
      const next = { ...prev, [name]: value };
      const cost = parseFloat(name === 'costPrice' ? value : next.costPrice) || 0;

      if (name === 'costPrice') {
        const mainMarkup = parseFloat(next.mainPriceMarkupPercentage) || 0;
        const wsMarkup = parseFloat(next.wholesaleMarkupPercentage) || 0;
        next.mainPrice = cost > 0 ? parseFloat((cost * (1 + mainMarkup / 100)).toFixed(2)) : '';
        next.wholesalePrice = cost > 0 ? parseFloat((cost * (1 + wsMarkup / 100)).toFixed(2)) : '';
      } else if (name === 'mainPriceMarkupPercentage') {
        next.mainPrice = cost > 0 ? parseFloat((cost * (1 + parseFloat(value || 0) / 100)).toFixed(2)) : '';
      } else if (name === 'mainPrice') {
        if (cost > 0) next.mainPriceMarkupPercentage = parseFloat((((parseFloat(value) || 0) / cost - 1) * 100).toFixed(2));
      } else if (name === 'wholesaleMarkupPercentage') {
        next.wholesalePrice = cost > 0 ? parseFloat((cost * (1 + parseFloat(value || 0) / 100)).toFixed(2)) : '';
      } else if (name === 'wholesalePrice') {
        if (cost > 0) next.wholesaleMarkupPercentage = parseFloat((((parseFloat(value) || 0) / cost - 1) * 100).toFixed(2));
      }
      return next;
    });
  };

  const generateBarcode = () => {
    const now = Date.now().toString();
    const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const newBarcode = `200${now.slice(-6)}${rand}`.slice(0, 12);
    setLocal(prev => ({ ...prev, barcode: newBarcode }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!local.name.trim()) return;
    mutSubmit.mutate({
      name: local.name.trim(),
      sku: local.sku.trim(),
      barcode: local.barcode.trim(),
      categoryId: local.categoryId || null,
      brandId: local.brandId || null,
      costPrice: parseFloat(local.costPrice) || 0,
      mainPrice: parseFloat(local.mainPrice) || 0,
      mainPriceMarkupPercentage: parseFloat(local.mainPriceMarkupPercentage) || 0,
      wholesalePrice: parseFloat(local.wholesalePrice) || 0,
      wholesaleMarkupPercentage: parseFloat(local.wholesaleMarkupPercentage) || 0,
      wholesaleBoxQuantity: parseInt(local.wholesaleBoxQuantity) || 1,
      isActive: true,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth disableRestoreFocus
      PaperProps={{ sx: { borderRadius: '12px' } }}>
      <DialogTitle sx={{ fontWeight: 800, fontSize: 18, pb: 1 }}>
        {isAr ? '➕ إنشاء منتج جديد' : '➕ Quick Create Product'}
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent dividers sx={{ pt: 2 }}>
          <Stack spacing={2.5}>

            {/* Identity */}
            <Box>
              <Typography variant="overline" color="text.secondary" fontWeight={800} sx={{ display: 'block', mb: 1 }}>
                {isAr ? 'هوية المنتج' : 'PRODUCT IDENTITY'}
              </Typography>
              <Stack spacing={1.5}>
                <TextField
                  label={isAr ? 'اسم المنتج *' : 'Product Name *'}
                  name="name"
                  value={local.name}
                  onChange={handleChange}
                  required
                  fullWidth
                  size="small"
                  autoFocus
                />
                <Grid container spacing={1.5}>
                  <Grid item xs={6}>
                    <TextField
                      label="SKU *"
                      name="sku"
                      value={local.sku}
                      onChange={handleChange}
                      required
                      fullWidth
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      label={isAr ? 'الباركود' : 'Barcode'}
                      name="barcode"
                      value={local.barcode}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <BarcodeIcon sx={{ fontSize: 16, opacity: 0.5 }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip title={isAr ? 'توليد تلقائي' : 'Auto-Generate'}>
                              <IconButton onClick={generateBarcode} size="small" color="primary">
                                <AutoFixHigh sx={{ fontSize: 16 }} />
                              </IconButton>
                            </Tooltip>
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                </Grid>
                <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
                  <Grid item xs={6}>
                    <TextField
                      select
                      label={isAr ? 'الفئة' : 'Category'}
                      name="categoryId"
                      value={local.categoryId}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                    >
                      <MenuItem value=""><em>{isAr ? 'بدون فئة' : 'No Category'}</em></MenuItem>
                      {categories?.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid item xs={6}>
                    <TextField
                      select
                      label={isAr ? 'الماركة' : 'Brand'}
                      name="brandId"
                      value={local.brandId}
                      onChange={handleChange}
                      fullWidth
                      size="small"
                    >
                      <MenuItem value=""><em>{isAr ? 'بدون ماركة' : 'No Brand'}</em></MenuItem>
                      {brands?.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
                    </TextField>
                  </Grid>
                </Grid>
              </Stack>
            </Box>

            <Divider sx={{ borderStyle: 'dashed' }} />

            {/* Cost */}
            <Box>
              <Typography variant="overline" color="text.secondary" fontWeight={800} sx={{ display: 'block', mb: 1 }}>
                {isAr ? 'تكلفة الشراء' : 'PURCHASE COST'}
              </Typography>
              <TextField
                label={isAr ? 'تكلفة الوحدة' : 'Unit Cost'}
                name="costPrice"
                value={local.costPrice}
                onChange={handleChange}
                type="number"
                fullWidth
                size="small"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>,
                }}
                helperText={isAr ? 'ستُحسب الأسعار تلقائياً' : 'Prices below auto-calculate from this cost'}
              />
            </Box>

            <Divider sx={{ borderStyle: 'dashed' }} />

            {/* Retail Pricing */}
            <Box>
              <Typography variant="overline" color="text.secondary" fontWeight={800} sx={{ display: 'block', mb: 1 }}>
                {isAr ? 'سعر التجزئة' : 'RETAIL PRICING'}
              </Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <TextField
                    label={isAr ? 'هامش الربح %' : 'Markup %'}
                    name="mainPriceMarkupPercentage"
                    value={local.mainPriceMarkupPercentage}
                    onChange={handleChange}
                    type="number"
                    fullWidth
                    size="small"
                    InputProps={{
                      endAdornment: <InputAdornment position="end"><Percent sx={{ fontSize: 16 }} /></InputAdornment>
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label={isAr ? 'سعر البيع' : 'Retail Price'}
                    name="mainPrice"
                    value={local.mainPrice}
                    onChange={handleChange}
                    type="number"
                    fullWidth
                    size="small"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider sx={{ borderStyle: 'dashed' }} />

            {/* Wholesale Pricing */}
            <Box>
              <Typography variant="overline" color="text.secondary" fontWeight={800} sx={{ display: 'block', mb: 1 }}>
                {isAr ? 'سعر الجملة والصناديق' : 'WHOLESALE PRICING'}
              </Typography>
              <Grid container spacing={1.5}>
                <Grid item xs={6}>
                  <TextField
                    label={isAr ? 'ربح الجملة %' : 'Wholesale Markup %'}
                    name="wholesaleMarkupPercentage"
                    value={local.wholesaleMarkupPercentage}
                    onChange={handleChange}
                    type="number"
                    fullWidth
                    size="small"
                    InputProps={{
                      endAdornment: <InputAdornment position="end"><Percent sx={{ fontSize: 16 }} /></InputAdornment>
                    }}
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label={isAr ? 'سعر الجملة' : 'Wholesale Price'}
                    name="wholesalePrice"
                    value={local.wholesalePrice}
                    onChange={handleChange}
                    type="number"
                    fullWidth
                    size="small"
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    label={isAr ? 'كمية الصندوق (وحدات لكل صندوق)' : 'Units per Wholesale Box'}
                    name="wholesaleBoxQuantity"
                    value={local.wholesaleBoxQuantity}
                    onChange={handleChange}
                    type="number"
                    fullWidth
                    size="small"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Inventory2 sx={{ fontSize: 16 }} />
                        </InputAdornment>
                      )
                    }}
                  />
                </Grid>
              </Grid>
            </Box>

          </Stack>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button onClick={onClose} color="inherit" size="small">
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button type="submit" variant="contained" size="small" disabled={mutSubmit.isPending}
            sx={{ px: 3, fontWeight: 800 }}>
            {mutSubmit.isPending ? '...' : (isAr ? 'حفظ وإضافة للأمر' : 'Save & Add to Order')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

function PriceAdjustmentModal({ info, onClose, mutSubmit }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const [params, setParams] = useState({ updateMaster: true, newMarkup: 20, newMainPrice: 0 });
  useEffect(() => {
    const oldMarkup = info.oldPrice > 0 ? ((parseFloat(info.product.mainPrice) / info.oldPrice) - 1) * 100 : 20;
    setParams({ updateMaster: true, newMarkup: info.oldPrice > 0 ? oldMarkup.toFixed(2) : 20, newMainPrice: info.oldPrice > 0 ? (info.newPrice * (1 + (oldMarkup / 100))).toFixed(2) : (info.newPrice * 1.2).toFixed(2) });
  }, [info]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (params.updateMaster) mutSubmit.mutate({ productId: info.product.id, data: { costPrice: info.newPrice, mainPriceMarkupPercentage: parseFloat(params.newMarkup) || 0, mainPrice: parseFloat(params.newMainPrice) || 0 } });
    else onClose();
  };

  return (
    <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800, color: 'warning.dark', display: 'flex', alignItems: 'center', gap: 1 }}><WarningAmber /> {isAr ? 'تحديث استراتيجية التسعير' : 'Pricing Alert'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent dividers>
          <Typography variant="body2" mb={2}>{isAr ? `تغيرت التكلفة إلى $${info.newPrice}. هل تريد تحديث أسعار البيع ضمن المنتج؟` : `Cost changed to $${info.newPrice}. Do you want to adjust master catalog prices?`}</Typography>
          <Stack direction="row" spacing={2}><TextField label={isAr ? "نسبة الربح %" : "Markup %"} value={params.newMarkup} onChange={e => setParams({ ...params, newMarkup: e.target.value })} size="small" fullWidth /><TextField label={isAr ? "سعر البيع الجديد" : "New Sell Price"} value={params.newMainPrice} onChange={e => setParams({ ...params, newMainPrice: e.target.value })} size="small" fullWidth /></Stack>
        </DialogContent>
        <DialogActions><Button onClick={onClose} color="inherit">{isAr ? 'تجاهل' : 'Skip'}</Button><Button type="submit" color="warning" variant="contained">{isAr ? 'مزامنة الكتالوج' : 'Sync Catalog'}</Button></DialogActions>
      </form>
    </Dialog>
  );
}
