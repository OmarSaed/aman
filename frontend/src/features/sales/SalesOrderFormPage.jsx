// frontend/src/features/sales/SalesOrderFormPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  Box, Typography, Button, Card, CardContent, Grid, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, IconButton, TextField, MenuItem, Autocomplete, InputAdornment,
  Divider, ToggleButton, ToggleButtonGroup, Skeleton, Alert, CircularProgress,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions
} from '@mui/material';
import { Save, ChevronLeft, Plus, Trash2, Search, DollarSign, CreditCard, User, Wallet } from 'lucide-react';
import { ordersService } from '../../services/orders.service';
import { customersService } from '../../services/customers.service';
import { productsService } from '../../services/products.service';
import { settingsService } from '../../services/settings.service';
import { formatCurrency } from '../../utils/format';
import { toast } from 'react-hot-toast';

export default function SalesOrderFormPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const isAr = i18n.language === 'ar';
  const isEdit = !!id;

  // Data States
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [productsLoading, setProductsLoading] = useState(false);

  // Form State
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [items, setItems] = useState([]);
  const [currency, setCurrency] = useState('USD'); // Default
  const [exchangeRate, setExchangeRate] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [paymentStatus, setPaymentStatus] = useState('UNPAID');
  const [amountPaid, setAmountPaid] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);
  const [notes, setNotes] = useState('');
  const [defaultLbpRate, setDefaultLbpRate] = useState(1);
  const [taxPercentage, setTaxPercentage] = useState(0);
  const [activeOrder, setActiveOrder] = useState(null);
  const [pricingMode, setPricingMode] = useState('AUTO');
  const [stockConfirmOpen, setStockConfirmOpen] = useState(false);
  const [customItemOpen, setCustomItemOpen] = useState(false);
  const [customItemName, setCustomItemName] = useState('');
  const [customItemPrice, setCustomItemPrice] = useState('');
  const [customItemQty, setCustomItemQty] = useState('1');

  const handleAddCustomItem = () => {
    if (!customItemName || customItemName.trim() === '') {
      return toast.error(isAr ? 'الرجاء إدخال اسم الصنف' : 'Please enter item name');
    }
    const qty = parseFloat(customItemQty) || 0;
    const price = parseFloat(customItemPrice) || 0;
    if (qty <= 0) {
      return toast.error(isAr ? 'الكمية يجب أن تكون أكبر من صفر' : 'Quantity must be greater than 0');
    }

    setItems([...items, {
      productId: null,
      product: { name: customItemName, sku: 'CUSTOM', costPrice: 0 },
      customName: customItemName,
      quantity: qty,
      price: price,
      total: qty * price
    }]);

    setCustomItemName('');
    setCustomItemPrice('');
    setCustomItemQty('1');
    setCustomItemOpen(false);
    toast.success(isAr ? 'تم إضافة الصنف المخصص' : 'Custom item added successfully');
  };

  const getProductPrice = (product, mode, customerType) => {
    if (mode === 'RETAIL') return Number(product.mainPrice);
    if (mode === 'WHOLESALE') return Number(product.wholesalePrice) || Number(product.mainPrice);
    if (mode === 'BEST') return Number(product.mainPrice);
    return customerType === 'WHOLESALE' 
      ? (Number(product.wholesalePrice) || Number(product.mainPrice)) 
      : Number(product.mainPrice);
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [custRes, prodRes, settingsRes] = await Promise.all([
        customersService.list(),
        productsService.list({ limit: 100 }), // Fetch more initially
        settingsService.getSystemSettings()
      ]);
      const sysSettings = settingsRes.data?.data || settingsRes.data;
      setDefaultLbpRate(parseFloat(sysSettings?.exchangeRate) || 1);
      setTaxPercentage(parseFloat(sysSettings?.taxPercentage) || 0);
      
      setCustomers(custRes.data?.data || custRes.data || []);
      setProducts(prodRes.data?.data || prodRes.data || []);

      if (isEdit) {
        const orderRes = await ordersService.get(id);
        const fetchedOrder = orderRes.data.data || orderRes.data;
        setActiveOrder(fetchedOrder);
        setSelectedCustomer(fetchedOrder.customer);
        setCurrency(fetchedOrder.currency);
        setExchangeRate(fetchedOrder.exchangeRate);
        setPaymentStatus(fetchedOrder.paymentStatus);
        setNotes(fetchedOrder.notes);
        setDiscount(fetchedOrder.discount || 0);
        setTaxAmount(fetchedOrder.taxAmount || 0);
        // Map items
        setItems(fetchedOrder.items.map(item => ({
          productId: item.productId,
          product: item.product || { name: item.customName, sku: 'CUSTOM', costPrice: 0 },
          customName: item.customName,
          quantity: item.quantity,
          price: Number(item.unitPrice || item.price || 0),
          total: item.quantity * Number(item.unitPrice || item.price || 0),
          isExisting: true,
          originalQty: item.quantity
        })));
      }
    } catch (error) {
      toast.error(t('errors.fetch_failed'));
    } finally {
      setLoading(false);
    }
  };
  
  // Debounced product search
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (productSearch.length >= 2) {
        fetchProducts(productSearch);
      } else if (productSearch.length === 0) {
        fetchProducts('');
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [productSearch]);

  // Update prices when customer type or pricing mode changes
  useEffect(() => {
    if (items.length > 0) {
      const updatedItems = items.map(item => {
        if (item.isExisting) return item; // Preserve saved prices for existing items!
        const price = getProductPrice(item.product, pricingMode, selectedCustomer?.type);
        return {
          ...item,
          price,
          total: item.quantity * price
        };
      });
      setItems(updatedItems);
    }
  }, [selectedCustomer?.type, pricingMode]);
  
  const calculateSubtotal = () => items.reduce((sum, item) => sum + item.total, 0);
  const subtotal = calculateSubtotal();
  const netAmount = Math.max(0, subtotal - parseFloat(discount || 0) + parseFloat(taxAmount || 0));

  // Automatic Tax Calculation
  useEffect(() => {
    if (!isEdit) {
      const calculatedTax = (subtotal * taxPercentage) / 100;
      setTaxAmount(calculatedTax);
    }
  }, [subtotal, taxPercentage, isEdit]);

  // Auto-fill amount paid if not on account
  useEffect(() => {
    if (paymentMethod !== 'ON_ACCOUNT' && !isEdit) {
      setAmountPaid(netAmount);
    } else if (paymentMethod === 'ON_ACCOUNT') {
      setAmountPaid(0);
    }
  }, [netAmount, paymentMethod, isEdit]);

  const fetchProducts = async (search) => {
    setProductsLoading(true);
    try {
      const res = await productsService.list({ search, limit: 100 });
      setProducts(res.data?.data || res.data || []);
    } catch (error) {
      console.error('Failed to fetch products:', error);
    } finally {
      setProductsLoading(false);
    }
  };

  const handleAddProduct = (product) => {
    if (!product) return;
    
    // Determine price based on pricing mode and customer type
    const price = getProductPrice(product, pricingMode, selectedCustomer?.type);

    // Find existing item only if the price matches exactly
    const existingIndex = items.findIndex(item => item.productId === product.id && Number(item.price) === price);

    if (existingIndex > -1) {
      const newItems = [...items];
      newItems[existingIndex].quantity += 1;
      newItems[existingIndex].total = newItems[existingIndex].quantity * newItems[existingIndex].price;
      setItems(newItems);
    } else {
      setItems([...items, {
        productId: product.id,
        product,
        quantity: 1,
        price,
        total: price
      }]);
    }
  };

  const handleUpdateQuantity = (index, qty) => {
    const newItems = [...items];
    const item = newItems[index];
    const numericQty = parseFloat(qty) || 0;

    if (item.isExisting && item.productId) {
      const catalogPrice = getProductPrice(item.product, pricingMode, selectedCustomer?.type);
      if (Number(item.price) !== catalogPrice) {
        const originalQty = Number(item.originalQty || 0);
        if (numericQty > originalQty) {
          // Lock existing item qty to originalQty
          item.quantity = originalQty;
          item.total = originalQty * Number(item.price);

          const excessQty = numericQty - originalQty;
          // Find if there is another row for this product at catalogPrice
          const matchingIndex = newItems.findIndex(
            (it, idx) => idx !== index && it.productId === item.productId && Number(it.price) === catalogPrice
          );

          if (matchingIndex > -1) {
            newItems[matchingIndex].quantity += excessQty;
            newItems[matchingIndex].total = newItems[matchingIndex].quantity * newItems[matchingIndex].price;
          } else {
            newItems.push({
              productId: item.productId,
              product: item.product,
              quantity: excessQty,
              price: catalogPrice,
              total: excessQty * catalogPrice
            });
          }

          setItems(newItems);
          toast.success(
            isAr 
              ? `تم قفل الكمية الأصيلة (${originalQty}) بالسعر القديم (${formatCurrency(item.price)}). تم إضافة الزيادة (${excessQty}) بالسعر الجديد (${formatCurrency(catalogPrice)}).`
              : `Original qty (${originalQty}) locked at old price (${formatCurrency(item.price)}). Excess qty (${excessQty}) added at new price (${formatCurrency(catalogPrice)}).`
          );
          return;
        }
      }
    }

    newItems[index].quantity = numericQty; // Allow 0 while typing, but handle in total
    newItems[index].total = (numericQty || 0) * (Number(newItems[index].price) || 0);
    setItems(newItems);
  };

  const handleUpdatePrice = (index, newPrice) => {
    const newItems = [...items];
    const numericPrice = parseFloat(newPrice) || 0;
    newItems[index].price = numericPrice;
    newItems[index].total = newItems[index].quantity * numericPrice;
    setItems(newItems);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  
  const executeSave = async (status, stockDeductedFlag) => {
    const data = {
      customerId: selectedCustomer.id,
      items: items.map(item => ({
        productId: item.productId,
        customName: item.customName || null,
        quantity: item.quantity,
        price: item.price
      })),
      currency,
      exchangeRate,
      status,
      stockDeducted: status === 'CONFIRMED' || stockDeductedFlag,
      paymentMethod,
      discount: parseFloat(discount) || 0,
      taxAmount: parseFloat(taxAmount) || 0,
      paymentStatus: paymentMethod === 'ON_ACCOUNT' ? 'ON_ACCOUNT' : (amountPaid >= netAmount ? 'PAID' : (amountPaid > 0 ? 'PARTIAL' : 'UNPAID')),
      initialPayment: parseFloat(amountPaid) || 0,
      amountPaid: parseFloat(amountPaid) || 0,
      notes
    };

    try {
      if (isEdit) {
        await ordersService.update(id, data);
        toast.success(isAr ? 'تم تحديث الطلب بنجاح' : 'Order updated successfully');
        if (status === 'CONFIRMED') {
           await ordersService.updateStatus(id, 'CONFIRMED');
        }
        navigate('/sales');
      } else {
        await ordersService.create(data);
        toast.success(status === 'CONFIRMED' ? t('orders.created_confirmed') : t('orders.draft_saved'));
        navigate('/sales');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || t('errors.action_failed'));
    }
  };

  const handleSave = async (status = 'DRAFT') => {
    if (!selectedCustomer) return toast.error(isAr ? 'الرجاء اختيار عميل' : 'Please select a customer');
    if (items.length === 0) return toast.error(isAr ? 'الرجاء إضافة منتجات' : 'Please add products');

    for (const item of items) {
      if (item.quantity <= 0) {
        return toast.error(isAr ? `الكمية للمنتج ${item.product.name} يجب أن تكون أكبر من صفر` : `Quantity for ${item.product.name} must be greater than 0`);
      }
      if (pricingMode === 'BEST' && item.price < item.product.costPrice) {
        return toast.error(isAr ? `السعر للمنتج ${item.product.name} لا يمكن أن يكون أقل من التكلفة (${item.product.costPrice})` : `Price for ${item.product.name} cannot be below cost (${item.product.costPrice})`);
      }
    }

    if (status === 'DRAFT') {
      if (isEdit && activeOrder?.stockDeducted) {
        await executeSave('DRAFT', true);
      } else {
        setStockConfirmOpen(true);
      }
    } else {
      await executeSave('CONFIRMED', true);
    }
  };

  if (loading) return <Skeleton variant="rectangular" height={600} />;

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 4 }}>
        <IconButton onClick={() => navigate('/sales')}>
          <ChevronLeft size={24} />
        </IconButton>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          {isEdit ? (isAr ? 'تعديل طلب' : 'Edit Order') : (isAr ? 'طلب بيع جديد' : 'New Sales Order')}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Left Column: Form & Items */}
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ borderRadius: 3, boxShadow: 'var(--shadow-sm)', mb: 3 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>{isAr ? 'بيانات العميل' : 'Customer Details'}</Typography>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Autocomplete
                    options={customers}
                    getOptionLabel={(option) => option.name}
                    value={selectedCustomer}
                    onChange={(_, val) => setSelectedCustomer(val)}
                    renderInput={(params) => (
                      <TextField {...params} label={isAr ? 'العميل' : 'Customer'} required />
                    )}
                  />
                  {selectedCustomer && (
                    <Typography variant="caption" color="primary" sx={{ mt: 1, display: 'block' }}>
                       {isAr ? `نوع العميل: ${selectedCustomer.type}` : `Type: ${selectedCustomer.type}`}
                    </Typography>
                  )}
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    select
                    fullWidth
                    label={isAr ? 'العملة' : 'Currency'}
                    value={currency}
                    onChange={(e) => {
                      const newCurrency = e.target.value;
                      setCurrency(newCurrency);
                      if (newCurrency === 'LBP') {
                        setExchangeRate(defaultLbpRate);
                      } else if (newCurrency === 'USD') {
                        setExchangeRate(1);
                      }
                    }}
                  >
                    <MenuItem value="USD">USD</MenuItem>
                    <MenuItem value="IQD">IQD</MenuItem>
                    <MenuItem value="LBP">LBP</MenuItem>
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, md: 3 }}>
                  <TextField
                    type="number"
                    fullWidth
                    label={isAr ? 'سعر الصرف' : 'Exchange Rate'}
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(e.target.value)}
                    disabled={currency === 'USD'}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 3, boxShadow: 'var(--shadow-sm)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>{isAr ? 'المنتجات' : 'Products'}</Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <ToggleButtonGroup
                    size="small"
                    value={pricingMode}
                    exclusive
                    onChange={(_, val) => val && setPricingMode(val)}
                  >
                    <ToggleButton value="AUTO">{isAr ? 'تلقائي' : 'Auto'}</ToggleButton>
                    <ToggleButton value="RETAIL">{isAr ? 'قطاعي' : 'Retail'}</ToggleButton>
                    <ToggleButton value="WHOLESALE">{isAr ? 'جملة' : 'Wholesale'}</ToggleButton>
                    <ToggleButton value="BEST">{isAr ? 'أفضل سعر' : 'Best Price'}</ToggleButton>
                  </ToggleButtonGroup>
                  <Autocomplete
                  sx={{ width: 400 }}
                  options={products}
                  loading={productsLoading}
                  onInputChange={(_, val) => setProductSearch(val)}
                  getOptionLabel={(option) => {
                    const categoryName = option.category?.name || (isAr ? 'بدون فئة' : 'No Category');
                    return `${option.name} (${option.code || option.sku}) - ${categoryName}`;
                  }}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  filterOptions={(x) => x} // Disable built-in filtering since we do it server-side
                  onChange={(_, val) => handleAddProduct(val)}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      size="small" 
                      placeholder={isAr ? 'ابحث بالاسم أو الفئة أو الباركود...' : 'Search by name, category, barcode...'}
                      InputProps={{
                        ...params.InputProps,
                        startAdornment: (
                          <InputAdornment position="start">
                            <Search size={16} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <React.Fragment>
                            {productsLoading ? <CircularProgress color="inherit" size={20} /> : null}
                            {params.InputProps.endAdornment}
                          </React.Fragment>
                        ),
                      }}
                    />
                  )}
                />
                <Button
                  variant="outlined"
                  startIcon={<Plus size={16} />}
                  onClick={() => setCustomItemOpen(true)}
                  sx={{ borderRadius: 2, height: 40, whiteSpace: 'nowrap' }}
                >
                  {isAr ? 'إضافة صنف مخصص' : 'Add Custom Item'}
                </Button>
                </Box>
              </Box>

              <TableContainer component={Box} sx={{ border: '1px solid var(--divider)', borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: 'background.neutral' }}>
                    <TableRow>
                      <TableCell>{isAr ? 'المنتج' : 'Product'}</TableCell>
                      <TableCell align="center" width={120}>{isAr ? 'الكمية' : 'Qty'}</TableCell>
                      <TableCell align="right">{isAr ? 'السعر' : 'Price'}</TableCell>
                      <TableCell align="right">{isAr ? 'المجموع' : 'Total'}</TableCell>
                      <TableCell align="center" width={50}></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.product.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{item.product.code}</Typography>
                        </TableCell>
                        <TableCell align="center">
                          <TextField
                            size="small"
                            type="number"
                            value={item.quantity}
                            inputProps={{ min: 1 }}
                            onChange={(e) => handleUpdateQuantity(index, e.target.value)}
                            sx={{ '& .MuiOutlinedInput-input': { textAlign: 'center' } }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {pricingMode === 'BEST' ? (
                            <TextField
                              size="small"
                              type="number"
                              value={item.price}
                              onChange={(e) => handleUpdatePrice(index, e.target.value)}
                              error={Number(item.price) < Number(item.product.costPrice)}
                              helperText={Number(item.price) < Number(item.product.costPrice) ? (isAr ? `أدنى: ${item.product.costPrice}` : `Min: ${item.product.costPrice}`) : ''}
                              sx={{ width: 100, '& .MuiOutlinedInput-input': { textAlign: 'right' } }}
                              FormHelperTextProps={{ sx: { fontSize: '0.6rem', textAlign: 'right', mx: 0 } }}
                            />
                          ) : (
                            formatCurrency(item.price)
                          )}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>{formatCurrency(item.total)}</TableCell>
                        <TableCell align="center">
                          <IconButton size="small" color="error" onClick={() => handleRemoveItem(index)}>
                            <Trash2 size={16} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    ))}
                    {items.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                          <Typography variant="body2" color="text.secondary">{isAr ? 'لا توجد أصناف مضافة' : 'No items added yet'}</Typography>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Column: Totals & Payments */}
        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ borderRadius: 3, boxShadow: 'var(--shadow-sm)', mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>{isAr ? 'ملخص الفاتورة' : 'Order Summary'}</Typography>
              <Box sx={{ py: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">{isAr ? 'الإجمالي الفرعي:' : 'Subtotal:'}</Typography>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>{formatCurrency(subtotal)}</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                  <Typography variant="body2">{isAr ? 'الخصم:' : 'Discount:'}</Typography>
                  <TextField size="small" type="number" sx={{ width: 100, '& input': { p: 0.5, textAlign: 'right' } }} value={discount} onChange={e => setDiscount(e.target.value)} />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'center' }}>
                  <Typography variant="body2">{isAr ? `الضريبة (${taxPercentage}%):` : `Tax (${taxPercentage}%):`}</Typography>
                  <TextField 
                    size="small" 
                    type="number" 
                    sx={{ width: 100, '& input': { p: 0.5, textAlign: 'right' } }} 
                    value={taxAmount} 
                    onChange={e => setTaxAmount(e.target.value)} 
                    helperText={isAr ? 'يمكنك التعديل يدوياً' : 'Manual override possible'}
                    FormHelperTextProps={{ sx: { fontSize: '0.6rem', textAlign: 'right' } }}
                  />
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">{isAr ? 'الصافي:' : 'Net Total:'}</Typography>
                  <Typography variant="h6" color="primary" sx={{ fontWeight: 800 }}>
                    {formatCurrency(netAmount)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 3, boxShadow: 'var(--shadow-sm)', mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>{isAr ? 'طريقة الدفع' : 'Payment Information'}</Typography>
              <ToggleButtonGroup
                fullWidth
                value={paymentMethod}
                exclusive
                onChange={(_, val) => val && setPaymentMethod(val)}
                sx={{ mb: 2 }}
              >
                <ToggleButton value="CASH"><Wallet size={16} sx={{ mr: 1 }} /> {isAr ? 'نقدي' : 'Cash'}</ToggleButton>
                <ToggleButton value="CARD"><CreditCard size={16} sx={{ mr: 1 }} /> {isAr ? 'بطاقة' : 'Card'}</ToggleButton>
                <ToggleButton value="ON_ACCOUNT"><User size={16} sx={{ mr: 1 }} /> {isAr ? 'على الحساب' : 'Account'}</ToggleButton>
              </ToggleButtonGroup>

              {paymentMethod !== 'ON_ACCOUNT' && (
                <TextField
                  label={isAr ? 'المبلغ المدفوع حلاً' : 'Amount Paid'}
                  type="number"
                  fullWidth
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  InputProps={{
                    startAdornment: <InputAdornment position="start"><DollarSign size={16} /></InputAdornment>
                  }}
                  sx={{ mb: 2 }}
                />
              )}

              <TextField
                label={isAr ? 'ملاحظات إضافية' : 'Internal Notes'}
                fullWidth
                multiline
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </CardContent>
          </Card>

          {( !isEdit || activeOrder?.status !== 'CANCELLED') && (
            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid size={{ xs: 6 }}>
                <Button 
                  fullWidth 
                  variant="outlined" 
                  size="large" 
                  onClick={() => handleSave('DRAFT')}
                  sx={{ borderRadius: 2 }}
                >
                  {isAr ? 'حفظ كمسودة' : 'Save Draft'}
                </Button>
              </Grid>
              <Grid size={{ xs: 6 }}>
                <Button 
                  fullWidth 
                  variant="contained" 
                  size="large" 
                  onClick={() => handleSave('CONFIRMED')}
                  sx={{ borderRadius: 2 }}
                >
                  {isAr ? 'تأكيد الطلب' : 'Confirm Order'}
                </Button>
              </Grid>
            </Grid>
          )}
          {activeOrder?.status === 'CANCELLED' ? (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {isAr 
                ? 'لا يمكن تعديل الطلبات الملغاة.' 
                : 'Cancelled orders cannot be edited.'}
            </Alert>
          ) : null}
        </Grid>
      </Grid>

      <Dialog
        open={stockConfirmOpen}
        onClose={() => setStockConfirmOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1.5,
            boxShadow: 'var(--shadow-lg)',
            maxWidth: 420
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1, textAlign: 'center' }}>
          {isAr ? 'خصم الكميات من المخزون' : 'Deduct Stock Quantities'}
        </DialogTitle>
        <DialogContent sx={{ py: 2, textAlign: 'center' }}>
          <DialogContentText sx={{ color: 'text.primary', fontSize: '0.95rem' }}>
            {isAr 
              ? 'هل تريد خصم الأصناف المضافة في هذا الطلب المسودة من المخزون الحالي؟' 
              : 'Do you want to deduct the items added in this draft order from the current stock?'}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 2, pb: 2, gap: 1.5, justifyContent: 'center' }}>
          <Button 
            variant="outlined" 
            color="inherit"
            onClick={async () => {
              setStockConfirmOpen(false);
              await executeSave('DRAFT', false);
            }}
            sx={{ flex: 1, borderRadius: 2, py: 1, fontWeight: 700 }}
          >
            {isAr ? 'لا، حفظ كمسودة فقط' : 'No, Save Draft Only'}
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={async () => {
              setStockConfirmOpen(false);
              await executeSave('DRAFT', true);
            }}
            sx={{ flex: 1, borderRadius: 2, py: 1, fontWeight: 800 }}
          >
            {isAr ? 'نعم، خصم المخزون' : 'Yes, Deduct Stock'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={customItemOpen}
        onClose={() => setCustomItemOpen(false)}
        PaperProps={{
          sx: {
            borderRadius: 3,
            p: 1.5,
            boxShadow: 'var(--shadow-lg)',
            maxWidth: 420,
            width: '100%'
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          {isAr ? 'إضافة صنف مخصص' : 'Add Custom Item'}
        </DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label={isAr ? 'اسم الصنف' : 'Item Name'}
            fullWidth
            variant="outlined"
            value={customItemName}
            onChange={(e) => setCustomItemName(e.target.value)}
            sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                label={isAr ? 'الكمية' : 'Quantity'}
                type="number"
                fullWidth
                variant="outlined"
                value={customItemQty}
                onChange={(e) => setCustomItemQty(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label={isAr ? 'سعر الوحدة' : 'Unit Price'}
                type="number"
                fullWidth
                variant="outlined"
                value={customItemPrice}
                onChange={(e) => setCustomItemPrice(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setCustomItemOpen(false)} color="inherit" variant="outlined" sx={{ borderRadius: 2 }}>
            {isAr ? 'إلغاء' : 'Cancel'}
          </Button>
          <Button onClick={handleAddCustomItem} variant="contained" color="primary" sx={{ borderRadius: 2, fontWeight: 700 }}>
            {isAr ? 'إضافة' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

