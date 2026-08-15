// frontend/src/features/products/ProductFormPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { 
  Container, Grid, Paper, Box, Typography, TextField, 
  Button, MenuItem, InputAdornment, Divider, IconButton,
  CircularProgress, Stack, Breadcrumbs, Link, Switch, FormControlLabel,
  Autocomplete, createFilterOptions, Tooltip, Tabs, Tab,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import { 
  Save, ArrowBack, Inventory, LocalOffer, Settings, 
  Description, Label as LabelIcon, QrCode as BarcodeIcon,
  Category as CategoryIcon, BrandingWatermark, Percent, 
  Inventory2, Delete, Add, AutoFixHigh, History as HistoryIcon, ListAlt,
  Lock, LockOpen
} from '@mui/icons-material';
import { productsService } from '../../services/products.service';
import Can from '../auth/Can';
import MediaPickerModal from '../../components/ui/MediaPickerModal';
import ProductTransactionsTab from './ProductTransactionsTab';
import ProductInventoryTab from './ProductInventoryTab';

export default function ProductFormPage() {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { id } = useParams();
  
  const isAr = i18n.language === 'ar';
  const isEdit = !!id;
  const [tabValue, setTabValue] = useState(0);
  const [showLockWarning, setShowLockWarning] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    categoryId: '',
    brandId: '',
    costPrice: 0,
    mainPrice: 0,
    wholesalePrice: 0,
    mainPriceMarkupPercentage: 0,
    wholesaleMarkupPercentage: 0,
    wholesaleBoxQuantity: 1,
    shortDescription: '',
    longDescription: '',
    imageUrl: '',
    isActive: true,
    isPriceLocked: true,
    lowStockThreshold: 1,
    initialStock: [] // [{ warehouseId, quantity }]
  });

  const [showMediaPicker, setShowMediaPicker] = useState(false);

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => productsService.listWarehouses().then(r => r.data.data),
  });

  const isCalculating = useRef(false);

  const { data: productData, isLoading: isLoadingProduct } = useQuery({
    queryKey: ['product', id],
    queryFn: () => productsService.getById(id).then(r => r.data.data),
    enabled: isEdit,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productsService.listCategories().then(r => r.data.data),
  });

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: () => productsService.listBrands().then(r => r.data.data),
  });

  useEffect(() => {
    if (isEdit && productData) {
      setFormData({
        name: productData.name || '',
        sku: productData.sku || '',
        barcode: productData.barcode || '',
        categoryId: productData.categoryId || '',
        brandId: productData.brandId || '',
        costPrice: parseFloat(productData.costPrice) || 0,
        mainPrice: parseFloat(productData.mainPrice) || 0,
        wholesalePrice: parseFloat(productData.wholesalePrice) || 0,
        mainPriceMarkupPercentage: parseFloat(productData.mainPriceMarkupPercentage) || 0,
        wholesaleMarkupPercentage: parseFloat(productData.wholesaleMarkupPercentage) || 0,
        wholesaleBoxQuantity: parseInt(productData.wholesaleBoxQuantity) || 1,
        shortDescription: productData.shortDescription || '',
        longDescription: productData.longDescription || '',
        imageUrl: productData.imageUrl || '',
        isActive: productData.isActive ?? true,
        isPriceLocked: productData.isPriceLocked ?? true,
        lowStockThreshold: productData.lowStockThreshold || 1,
        initialStock: []
      });
    }
  }, [isEdit, productData]);

  // Pricing Calculation Logic
  const updateMainPrice = (cost, markup) => {
    if (isCalculating.current) return;
    isCalculating.current = true;
    const price = parseFloat(cost) * (1 + (parseFloat(markup) / 100));
    setFormData(p => ({ ...p, mainPrice: parseFloat(price.toFixed(2)) }));
    isCalculating.current = false;
  };

  const updateMainMarkup = (cost, price) => {
    if (isCalculating.current || !cost || cost === 0) return;
    isCalculating.current = true;
    const markup = ((parseFloat(price) / parseFloat(cost)) - 1) * 100;
    setFormData(p => ({ ...p, mainPriceMarkupPercentage: parseFloat(markup.toFixed(2)) }));
    isCalculating.current = false;
  };

  const updateWholesalePrice = (cost, markup) => {
    const price = parseFloat(cost) * (1 + (parseFloat(markup) / 100));
    setFormData(p => ({ ...p, wholesalePrice: parseFloat(price.toFixed(2)) }));
  };

  const updateWholesaleMarkup = (cost, price) => {
    if (!cost || cost === 0) return;
    const markup = ((parseFloat(price) / parseFloat(cost)) - 1) * 100;
    setFormData(p => ({ ...p, wholesaleMarkupPercentage: parseFloat(markup.toFixed(2)) }));
  };

  const handleLockToggle = (e) => {
    const checked = e.target.checked;
    if (checked) {
      setShowLockWarning(true);
    } else {
      setFormData(prev => ({ ...prev, isPriceLocked: false }));
    }
  };

  const confirmLockPrice = () => {
    setFormData(prev => ({ ...prev, isPriceLocked: true }));
    setShowLockWarning(false);
  };

  const mut = useMutation({
    mutationFn: (data) => isEdit ? productsService.update(id, data) : productsService.create(data),
    onSuccess: () => {
      toast.success(isAr ? 'تم حفظ المنتج بنجاح' : 'Product saved successfully');
      qc.invalidateQueries(['products']);
      navigate('/products');
    },
    onError: (e) => toast.error(e.response?.data?.message || (isAr ? 'حدث خطأ' : 'Error saving product'))
  });

  const mutQuickCategory = useMutation({
    mutationFn: (name) => productsService.createCategory({ name }),
    onSuccess: (res) => {
      qc.invalidateQueries(['categories']);
      setFormData(prev => ({ ...prev, categoryId: res.data.data.id }));
      toast.success(isAr ? 'تمت إضافة التصنيف' : 'Category added');
    }
  });

  const mutQuickBrand = useMutation({
    mutationFn: (name) => productsService.createBrand({ name }),
    onSuccess: (res) => {
      qc.invalidateQueries(['brands']);
      setFormData(prev => ({ ...prev, brandId: res.data.data.id }));
      toast.success(isAr ? 'تمت إضافة الماركة' : 'Brand added');
    }
  });

  const filter = createFilterOptions();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    
    setFormData(prev => {
      const next = { ...prev, [name]: val };
      
      const cost = parseFloat(next.costPrice) || 0;
      const mainMarkup = parseFloat(next.mainPriceMarkupPercentage) || 0;
      const wholesaleMarkup = parseFloat(next.wholesaleMarkupPercentage) || 0;
      const mainPrice = parseFloat(next.mainPrice) || 0;
      const wholesalePrice = parseFloat(next.wholesalePrice) || 0;

      // Real-time calculations
      if (name === 'costPrice') {
        next.mainPrice = parseFloat((cost * (1 + (mainMarkup / 100))).toFixed(2)) || 0;
        next.wholesalePrice = parseFloat((cost * (1 + (wholesaleMarkup / 100))).toFixed(2)) || 0;
      } 
      else if (name === 'mainPriceMarkupPercentage') {
        next.mainPrice = parseFloat((cost * (1 + ((parseFloat(val) || 0) / 100))).toFixed(2)) || 0;
      }
      else if (name === 'mainPrice') {
        if (cost > 0) {
          const markup = (((parseFloat(val) || 0) / cost) - 1) * 100;
          next.mainPriceMarkupPercentage = parseFloat(markup.toFixed(2)) || 0;
        }
      }
      else if (name === 'wholesaleMarkupPercentage') {
        next.wholesalePrice = parseFloat((cost * (1 + ((parseFloat(val) || 0) / 100))).toFixed(2)) || 0;
      }
      else if (name === 'wholesalePrice') {
        if (cost > 0) {
          const markup = (((parseFloat(val) || 0) / cost) - 1) * 100;
          next.wholesaleMarkupPercentage = parseFloat(markup.toFixed(2)) || 0;
        }
      }

      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      categoryId: formData.categoryId || null,
      brandId: formData.brandId || null,
      costPrice: parseFloat(formData.costPrice) || 0,
      mainPrice: parseFloat(formData.mainPrice) || 0,
      wholesalePrice: parseFloat(formData.wholesalePrice) || 0,
      mainPriceMarkupPercentage: parseFloat(formData.mainPriceMarkupPercentage) || 0,
      wholesaleMarkupPercentage: parseFloat(formData.wholesaleMarkupPercentage) || 0,
      wholesaleBoxQuantity: parseInt(formData.wholesaleBoxQuantity) || 1,
      lowStockThreshold: parseInt(formData.lowStockThreshold) || null,
      imageUrl: formData.imageUrl || null,
      initialStock: (formData.initialStock || []).filter(s => s.warehouseId && s.quantity > 0)
    };
    mut.mutate(payload);
  };

  const generateRandomBarcode = () => {
    const now = Date.now().toString();
    const rand = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    const newBarcode = `200${now.slice(-6)}${rand}`.slice(0, 12);
    setFormData(prev => ({ ...prev, barcode: newBarcode }));
  };

  const handleAddStockRow = () => {
    setFormData(p => ({
      ...p,
      initialStock: [...p.initialStock, { warehouseId: '', quantity: 0 }]
    }));
  };

  const handleRemoveStockRow = (index) => {
    setFormData(p => ({
      ...p,
      initialStock: p.initialStock.filter((_, i) => i !== index)
    }));
  };

  const handleStockChange = (index, field, value) => {
    setFormData(p => {
      const newStock = [...p.initialStock];
      newStock[index][field] = value;
      return { ...p, initialStock: newStock };
    });
  };

  if (isEdit && isLoadingProduct) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="70vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth={false} sx={{ py: 3, mb: 6, width: '100%', px: 0 }}>
      <Stack spacing={2} mb={4}>
        <Breadcrumbs aria-label="breadcrumb">
          <Link underline="hover" color="inherit" sx={{ cursor: 'pointer' }} onClick={() => navigate('/products')}>
            {isAr ? 'المنتجات' : 'Products'}
          </Link>
          <Typography color="text.primary">
            {isEdit ? (isAr ? 'تعديل صنف' : 'Edit Item') : (isAr ? 'إضافة صنف جديد' : 'Create New Item')}
          </Typography>
        </Breadcrumbs>
        
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center" gap={2}>
            <IconButton onClick={() => navigate('/products')} sx={{ bgcolor: 'white', '&:hover': { bgcolor: '#f1f5f9' } }}>
              <ArrowBack sx={{ transform: isAr ? 'rotate(180deg)' : 'none' }} />
            </IconButton>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
                {isEdit ? (isAr ? 'تعديل مواصفات المنتج' : 'Edit Product Specs') : (isAr ? 'إنشاء منتج جديد' : 'New Product Registration')}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {isEdit && productData ? productData.name : (isAr ? 'قم بتعبئة بيانات الصنف بدقة لضمان دقة التقارير' : 'Configure item attributes and pricing models.')}
              </Typography>
            </Box>
          </Box>
          
          <Box sx={{ gap: 1, display: { xs: 'none', sm: 'flex' } }}>
             <Button variant="outlined" color="inherit" size="small" onClick={() => navigate('/products')} sx={{ fontWeight: 700 }}>
               {isAr ? 'إلغاء' : 'Cancel'}
             </Button>
             <Button 
               variant="contained" 
               size="small"
               disabled={mut.isPending}
               onClick={handleSubmit}
               sx={{ px: 3, fontWeight: 800 }}
             >
               <Stack direction="row" spacing={1} alignItems="center">
                 <Save sx={{ fontSize: 18 }} />
                 <Typography variant="button" sx={{ fontWeight: 800 }}>
                    {isEdit ? (isAr ? 'تحديث البيانات' : 'Update') : (isAr ? 'حفظ البيانات' : 'Save')}
                 </Typography>
               </Stack>
             </Button>
          </Box>
        </Box>
      </Stack>

      {isEdit && (
        <Tabs 
          value={tabValue} 
          onChange={(e, v) => setTabValue(v)} 
          sx={{ mb: 3, borderBottom: '1px solid #e2e8f0' }}
          textColor="primary"
          indicatorColor="primary"
        >
          <Tab icon={<ListAlt sx={{ fontSize: 18, mr: 1 }} />} iconPosition="start" label={isAr ? 'المعلومات الأساسية' : 'General Information'} />
          <Tab icon={<HistoryIcon sx={{ fontSize: 18, mr: 1 }} />} iconPosition="start" label={isAr ? 'سجل الحركات' : 'Stock Transactions'} />
          <Tab icon={<Inventory sx={{ fontSize: 18, mr: 1 }} />} iconPosition="start" label={isAr ? 'إدارة المخزون' : 'Manage Stock'} />
        </Tabs>
      )}

      {tabValue === 0 && (
        <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* LEFT: MAIN FORM */}
          <Grid item xs={12} md={9}>
            <Stack spacing={2.5}>
              {/* SECTION: Identity */}
              <Paper sx={{ p: 3, borderRadius: 1, boxShadow: 'var(--shadow-sm)', border: '1px solid #e2e8f0' }}>
                <Stack direction="row" alignItems="center" gap={1.5} mb={2.5}>
                  <Inventory color="primary" sx={{ opacity: 0.8 }} />
                  <Typography variant="h6" fontWeight={800}>{isAr ? 'هوية المنتج' : 'Product Identity'}</Typography>
                </Stack>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <TextField 
                      label={isAr ? 'اسم المنتج' : 'Product Label'}
                      name="name" 
                      value={formData.name} 
                      onChange={handleChange} 
                      required 
                      size="medium"
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField 
                      label="SKU / #code" 
                      name="sku" 
                      value={formData.sku} 
                      onChange={handleChange} 
                      required 
                      size="medium"
                    />
                  </Grid>
                  <Grid item xs={12} sm={3}>
                    <TextField 
                      label={isAr ? 'باركود (Barcode)' : 'Barcode'} 
                      name="barcode" 
                      value={formData.barcode} 
                      onChange={handleChange} 
                      size="medium"
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><BarcodeIcon sx={{ opacity: 0.5 }} /></InputAdornment>,
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip title={isAr ? 'توليد تلقائي' : 'Auto Generate'}>
                              <IconButton onClick={generateRandomBarcode} size="small" color="primary">
                                <AutoFixHigh sx={{ fontSize: 18 }} />
                              </IconButton>
                            </Tooltip>
                          </InputAdornment>
                        )
                      }}
                    />
                  </Grid>
                </Grid>

                <Box mt={3} p={2} sx={{ border: '1px dashed #cbd5e1', borderRadius: 2, textAlign: 'center', bgcolor: '#f8fafc', position: 'relative' }}>
                  <Typography variant="subtitle2" color="text.secondary" mb={1}>{isAr ? 'صورة المنتج' : 'Product Image'}</Typography>
                  {formData.imageUrl ? (
                    <Box sx={{ position: 'relative', display: 'inline-block' }}>
                      <Box 
                        sx={{ 
                          width: 120, height: 120, borderRadius: 2, border: '1px solid #e2e8f0',
                          backgroundImage: `url(${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${formData.imageUrl})`,
                          backgroundSize: 'cover', backgroundPosition: 'center', mb: 1, boxShadow: 'var(--shadow-sm)'
                        }} 
                      />
                      <IconButton 
                        size="small" 
                        color="error" 
                        sx={{ position: 'absolute', top: -10, right: -10, bgcolor: 'white', border: '1px solid #e2e8f0', '&:hover': { bgcolor: '#fee2e2' } }}
                        onClick={() => setFormData(p => ({ ...p, imageUrl: '' }))}
                      >
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  ) : (
                    <Box onClick={() => setShowMediaPicker(true)} sx={{ cursor: 'pointer', p: 3, '&:hover': { bgcolor: '#f1f5f9' }, borderRadius: 2 }}>
                      <Description sx={{ fontSize: 40, color: '#94a3b8', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">{isAr ? 'انقر لاختيار صورة' : 'Click to select image'}</Typography>
                    </Box>
                  )}
                  {formData.imageUrl && (
                    <Button size="small" variant="text" onClick={() => setShowMediaPicker(true)}>{isAr ? 'تغيير الصورة' : 'Change Image'}</Button>
                  )}
                </Box>
              </Paper>

              {/* SECTION: Financial Strategy */}
              <Paper sx={{ p: 3, borderRadius: 1, boxShadow: 'var(--shadow-sm)', border: '1px solid #e2e8f0' }}>
                <Stack direction="row" alignItems="center" gap={1.5} mb={2.5}>
                  <LocalOffer color="primary" sx={{ opacity: 0.8 }} />
                  <Typography variant="h6" fontWeight={800}>{isAr ? 'استراتيجية التسعير والمضاعفات' : 'Pricing & Markup Engine'}</Typography>
                </Stack>
                
                {/* Cost Row */}
                <Box sx={{ bgcolor: 'var(--bg-app)', p: 2, borderRadius: 1, mb: 3 }}>
                  <Grid container spacing={3} alignItems="center">
                    <Grid item xs={12} sm={4}>
                       <TextField 
                          label={isAr ? 'تكلفة الشراء (Cost)' : 'Internal Cost'} 
                          name="costPrice" 
                          value={formData.costPrice} 
                          onChange={handleChange} 
                          type="number"
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            sx: { bgcolor: 'white', fontWeight: 800 }
                          }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={8}>
                       <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} gap={2}>
                         <FormControlLabel
                           control={
                             <Switch 
                               checked={formData.isPriceLocked} 
                               onChange={handleLockToggle} 
                               color="warning" 
                             />
                           }
                           label={
                             <Stack direction="row" alignItems="center" gap={0.5}>
                               {formData.isPriceLocked ? <Lock color="warning" fontSize="small" /> : <LockOpen color="action" fontSize="small" />}
                               <Typography variant="body2" sx={{ fontWeight: formData.isPriceLocked ? 700 : 400 }}>
                                 {isAr ? 'تثبيت التكلفة' : 'Lock Price'}
                               </Typography>
                             </Stack>
                           }
                         />
                         <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.8 }}>
                           {formData.isPriceLocked 
                             ? (isAr ? 'تم تثبيت السعر يدوياً (لن يتم تحديثه تلقائياً من الفواتير)' : 'Price is locked manually (will not auto-update from POs).')
                             : (isAr ? 'ملاحظة: السعر المحتسب سيتم تحديثه تلقائياً بناءً على نسبة الربح المختارة' : 'Prices will auto-recalculate based on the markup percentages below.')
                           }
                         </Typography>
                       </Stack>
                    </Grid>
                  </Grid>
                </Box>

                <Grid container spacing={3}>
                  {/* Public Price Block */}
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 1, border: '1px solid #f1f5f9' }}>
                      <Typography variant="subtitle2" sx={{ mb: 2, opacity: 0.6, fontWeight: 800 }}>{isAr ? 'سعر البيع للجمهور' : 'RETAIL PRICING'}</Typography>
                      <Stack direction="row" spacing={1}>
                        <TextField 
                          label={isAr ? 'نسبة الربح %' : 'Profit %'} 
                          name="mainPriceMarkupPercentage" 
                          value={formData.mainPriceMarkupPercentage} 
                          onChange={handleChange} 
                          type="number"
                          InputProps={{
                            endAdornment: <InputAdornment position="end"><Percent fontSize="small" /></InputAdornment>,
                            sx: { bgcolor: 'white' }
                          }}
                        />
                        <TextField 
                          label={isAr ? 'السعر النهائي' : 'Final Price'} 
                          name="mainPrice" 
                          value={formData.mainPrice} 
                          onChange={handleChange} 
                          type="number"
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            sx: { bgcolor: 'white', fontWeight: 800, color: 'success.main' }
                          }}
                        />
                      </Stack>
                    </Paper>
                  </Grid>

                  {/* Wholesale Block */}
                  <Grid item xs={12} sm={6}>
                    <Paper sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 1, border: '1px solid #f1f5f9' }}>
                      <Typography variant="subtitle2" sx={{ mb: 2, opacity: 0.6, fontWeight: 800 }}>{isAr ? 'سعر الجملة والصناديق' : 'WHOLESALE PRICING'}</Typography>
                      <Stack direction="row" spacing={1} mb={1}>
                        <TextField 
                          label={isAr ? 'ربح الجملة %' : 'Markup %'} 
                          name="wholesaleMarkupPercentage" 
                          value={formData.wholesaleMarkupPercentage} 
                          onChange={handleChange} 
                          type="number"
                          InputProps={{
                            endAdornment: <InputAdornment position="end"><Percent fontSize="small" /></InputAdornment>,
                            sx: { bgcolor: 'white' }
                          }}
                        />
                        <TextField 
                          label={isAr ? 'سعر الجملة' : 'Trade Price'} 
                          name="wholesalePrice" 
                          value={formData.wholesalePrice} 
                          onChange={handleChange} 
                          type="number"
                          InputProps={{
                            startAdornment: <InputAdornment position="start">$</InputAdornment>,
                            sx: { bgcolor: 'white', fontWeight: 800 }
                          }}
                        />
                      </Stack>
                <Box sx={{ mt: 3 }}>
                    <TextField 
                      label={isAr ? 'كمية الصندوق (الوحدات)' : 'Units per wholesale box'} 
                      name="wholesaleBoxQuantity" 
                      value={formData.wholesaleBoxQuantity} 
                      onChange={handleChange} 
                      type="number"
                      placeholder="1..."
                      fullWidth
                      size="small"
                      InputProps={{
                        startAdornment: <InputAdornment position="start"><Inventory2 fontSize="small" /></InputAdornment>,
                        sx: { bgcolor: 'white' }
                      }}
                    />
                </Box>
                    </Paper>
                  </Grid>
                </Grid>
              </Paper>

              <Paper sx={{ p: 3, borderRadius: 1, boxShadow: 'var(--shadow-sm)', border: '1px solid #e2e8f0' }}>
                <Stack spacing={4}>
                  <Box>
                    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, mb: 1, display: 'block' }}>
                      {isAr ? 'نبذة عن المنتج' : 'PRODUCT TAGLINE'}
                    </Typography>
                    <TextField 
                      placeholder={isAr ? 'اكتب نبذة مختصرة تظهر في الفواتير والقوائم...' : 'Brief summary for invoices and listings...'} 
                      name="shortDescription" 
                      value={formData.shortDescription} 
                      onChange={handleChange} 
                      fullWidth
                    />
                  </Box>
                  
                  <Divider sx={{ borderStyle: 'dashed' }} />

                  <Box>
                    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800, mb: 1, display: 'block' }}>
                      {isAr ? 'المواصفات التقنية الكاملة' : 'DETAILED TECHNICAL SPECIFICATIONS'}
                    </Typography>
                    <TextField 
                      name="longDescription" 
                      value={formData.longDescription} 
                      onChange={handleChange} 
                      multiline 
                      rows={8}
                      fullWidth
                      placeholder={isAr ? 'أدخل الأبعاد، الوزن، المادة، أو أي تفاصيل تقنية أخرى...' : 'Dimensions, weight, material, etc...'}
                    />
                  </Box>
                </Stack>
              </Paper>

              {/* SECTION: Initial Stock (Only for new products) */}
              {!isEdit && (
                <Paper sx={{ p: 3, borderRadius: 1, boxShadow: 'var(--shadow-sm)', border: '1px dashed #cbd5e1', bgcolor: '#f8fafc' }}>
                  <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
                    <Stack direction="row" alignItems="center" gap={1.5}>
                      <Inventory2 color="secondary" />
                      <Typography variant="h6" fontWeight={800}>{isAr ? 'رصيد أول المدة' : 'Stock Intake'}</Typography>
                    </Stack>
                    <Button size="small" onClick={handleAddStockRow} startIcon={<Add />}>
                      {isAr ? 'إضافة مخزن' : 'Add Location'}
                    </Button>
                  </Stack>
                  
                  {formData.initialStock.length === 0 ? (
                    <Typography variant="body2" sx={{ textAlign: 'center', py: 2, opacity: 0.5 }}>
                      {isAr ? 'يمكنك إضافة رصيد افتتاحي للمنتج في مخازن محددة هنا' : 'Optionally record starting inventory levels for various warehouses.'}
                    </Typography>
                  ) : (
                    <Stack spacing={2}>
                      {formData.initialStock.map((row, idx) => (
                        <Grid container spacing={2} key={idx} alignItems="center">
                          <Grid item xs={8}>
                            <TextField
                              select
                              fullWidth
                              label={isAr ? 'الموقع / المخزن' : 'Storage Node'}
                              value={row.warehouseId}
                              onChange={(e) => handleStockChange(idx, 'warehouseId', e.target.value)}
                              size="small"
                            >
                                <MenuItem value="">{isAr ? 'اختر موقع...' : 'Select Location...'}</MenuItem>
                                {warehouses?.length > 0 ? (
                                  warehouses.map(w => <MenuItem key={w.id} value={w.id}>{w.name}</MenuItem>)
                                ) : (
                                  <MenuItem disabled value="">{isAr ? 'لا يوجد مستودعات' : 'No warehouses'}</MenuItem>
                                )}
                              </TextField>
                          </Grid>
                          <Grid item xs={3}>
                            <TextField
                              size="small"
                              type="number"
                              fullWidth
                              label={isAr ? 'الكمية' : 'Qty'}
                              value={row.quantity}
                              onChange={(e) => handleStockChange(idx, 'quantity', e.target.value)}
                            />
                          </Grid>
                          <Grid item xs={1}>
                            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                              <IconButton color="error" size="small" onClick={() => handleRemoveStockRow(idx)}>
                                <Delete fontSize="small" />
                              </IconButton>
                            </Box>
                          </Grid>
                        </Grid>
                      ))}
                    </Stack>
                  )}
                </Paper>
              )}

              {/* SECTION: Current Stock Visibility (Only for edit mode) */}
              {isEdit && (
                <Paper sx={{ p: 3, borderRadius: 1, boxShadow: 'var(--shadow-sm)', border: '1px solid #e2e8f0', bgcolor: '#f8fafc' }}>
                  <Stack direction="row" alignItems="center" gap={1.5} mb={2}>
                    <Inventory2 color="primary" sx={{ opacity: 0.8 }} />
                    <Typography variant="h6" fontWeight={800}>{isAr ? 'توافر الرصيد في المخازن' : 'Current Stock Levels'}</Typography>
                  </Stack>
                  
                  {!productData || !productData.stocks || productData.stocks.length === 0 ? (
                    <Typography variant="body2" sx={{ textAlign: 'center', py: 2, opacity: 0.5 }}>
                      {isAr ? 'لا يوجد رصيد مسجل لهذا المنتج' : 'No stock recorded for this product.'}
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      <Grid container spacing={2} sx={{ mb: 0.5, opacity: 0.6, px: 1 }}>
                        <Grid item xs={8}><Typography variant="caption" fontWeight={800}>{isAr ? 'الموقع / المخزن' : 'LOCATION'}</Typography></Grid>
                        <Grid item xs={4} sx={{ textAlign: 'right' }}><Typography variant="caption" fontWeight={800}>{isAr ? 'الرصيد الفعلي' : 'QTY'}</Typography></Grid>
                      </Grid>
                      {productData.stocks.map((stock, idx) => (
                        <Box key={idx} sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="body2" fontWeight={600}>
                            {stock.warehouse?.name || (isAr ? 'مخزن غير معروف' : 'Unknown Location')}
                          </Typography>
                          <Box sx={{ bgcolor: Math.floor(stock.quantity) <= 0 ? '#fef2f2' : '#f0fdf4', px: 1.5, py: 0.5, borderRadius: 6 }}>
                             <Typography variant="body2" fontWeight={800} color={Math.floor(stock.quantity) <= 0 ? 'error.main' : 'success.main'}>
                               {stock.quantity}
                             </Typography>
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Paper>
              )}
            </Stack>
          </Grid>

          {/* RIGHT SIDEBAR */}
          <Grid item xs={12} md={3}>
            <Stack spacing={2.5} sx={{ minWidth: 260 }}>
              <Paper sx={{ p: 2.5, borderRadius: 1, bgcolor: 'var(--bg-app)', border: '1px dashed #cbd5e1' }}>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 700 }}>{isAr ? 'حالة التوافر' : 'AVAILABILITY'}</Typography>
                <FormControlLabel
                  control={<Switch checked={formData.isActive} onChange={handleChange} name="isActive" color="primary" />}
                  label={isAr ? (formData.isActive ? 'نشط' : 'غير نشط') : 'Is Active'}
                />
                <Box mt={3}>
                  <Typography variant="caption" fontWeight={600} color="text.secondary" display="block" mb={1}>
                    {isAr ? 'تنبيه نقص المخزون' : 'Minimum Stock Alert'}
                  </Typography>
                  <TextField 
                    name="lowStockThreshold" 
                    value={formData.lowStockThreshold || ''} 
                    onChange={handleChange} 
                    type="number"
                    size="small"
                    fullWidth
                    placeholder="1"
                    InputProps={{ sx: { bgcolor: 'white' } }}
                  />
                </Box>
              </Paper>

              <Paper sx={{ p: 2.5, borderRadius: 1 }}>
                <Stack direction="row" alignItems="center" gap={1} mb={2}>
                  <Settings color="primary" fontSize="small" />
                  <Typography variant="subtitle2" fontWeight={700}>{isAr ? 'التصنيف' : 'CLASSIFICATION'}</Typography>
                </Stack>
                <Stack spacing={2.5}>
                  <Autocomplete
                    value={categories?.find(c => c.id === formData.categoryId) || null}
                    onChange={(event, newValue) => {
                      if (typeof newValue === 'string') {
                        mutQuickCategory.mutate(newValue);
                      } else if (newValue && newValue.inputValue) {
                        mutQuickCategory.mutate(newValue.inputValue);
                      } else {
                        setFormData(p => ({ ...p, categoryId: newValue?.id || '' }));
                      }
                    }}
                    filterOptions={(options, params) => {
                      const filtered = filter(options, params);
                      const { inputValue } = params;
                      const isExisting = options.some((option) => inputValue === option.name);
                      if (inputValue !== '' && !isExisting) {
                        filtered.push({
                          inputValue,
                          name: `${isAr ? 'إضافة' : 'Add'} "${inputValue}"`,
                        });
                      }
                      return filtered;
                    }}
                    selectOnFocus
                    clearOnBlur
                    handleHomeEndKeys
                    options={categories || []}
                    getOptionLabel={(option) => {
                      if (typeof option === 'string') return option;
                      if (option.inputValue) return option.inputValue;
                      return option.name;
                    }}
                    renderOption={(props, option) => (
                      <li {...props} key={option.id || 'add'}>
                        {option.name}
                      </li>
                    )}
                    freeSolo
                    renderInput={(params) => (
                      <TextField {...params} label={isAr ? 'التصنيف' : 'Category'} size="small" />
                    )}
                  />

                  <Autocomplete
                    value={brands?.find(b => b.id === formData.brandId) || null}
                    onChange={(event, newValue) => {
                      if (typeof newValue === 'string') {
                        mutQuickBrand.mutate(newValue);
                      } else if (newValue && newValue.inputValue) {
                        mutQuickBrand.mutate(newValue.inputValue);
                      } else {
                        setFormData(p => ({ ...p, brandId: newValue?.id || '' }));
                      }
                    }}
                    filterOptions={(options, params) => {
                      const filtered = filter(options, params);
                      const { inputValue } = params;
                      const isExisting = options.some((option) => inputValue === option.name);
                      if (inputValue !== '' && !isExisting) {
                        filtered.push({
                          inputValue,
                          name: `${isAr ? 'إضافة' : 'Add'} "${inputValue}"`,
                        });
                      }
                      return filtered;
                    }}
                    selectOnFocus
                    clearOnBlur
                    handleHomeEndKeys
                    options={brands || []}
                    getOptionLabel={(option) => {
                      if (typeof option === 'string') return option;
                      if (option.inputValue) return option.inputValue;
                      return option.name;
                    }}
                    renderOption={(props, option) => (
                      <li {...props} key={option.id || 'add'}>
                        {option.name}
                      </li>
                    )}
                    freeSolo
                    renderInput={(params) => (
                      <TextField {...params} label={isAr ? 'الماركة' : 'Brand'} size="small" />
                    )}
                  />
                </Stack>
              </Paper>

            </Stack>
          </Grid>
        </Grid>
      </form>
      )}

      {tabValue === 1 && isEdit && (
        <ProductTransactionsTab productId={id} />
      )}

      {tabValue === 2 && isEdit && (
        <ProductInventoryTab productId={id} />
      )}

      {showMediaPicker && (
        <MediaPickerModal 
          onClose={() => setShowMediaPicker(false)} 
          onSelect={(url) => {
            setFormData(p => ({ ...p, imageUrl: url }));
            setShowMediaPicker(false);
          }}
        />
      )}

      <Dialog open={showLockWarning} onClose={() => setShowLockWarning(false)}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {isAr ? 'تأكيد تثبيت السعر' : 'Confirm Price Lock'}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {isAr 
              ? 'تثبيت السعر سيؤدي إلى إيقاف التحديثات التلقائية لتكلفة المنتج من فواتير المشتريات ومتوسط التكلفة. هل أنت متأكد؟'
              : 'Locking the price will stop automatic recalculations from Purchase Orders and average costs. Are you sure you want to proceed?'}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setShowLockWarning(false)} color="inherit" sx={{ fontWeight: 700 }}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={confirmLockPrice} color="warning" variant="contained" sx={{ fontWeight: 700 }}>
            {isAr ? 'نعم، قم بالتثبيت' : 'Yes, Lock Price'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
