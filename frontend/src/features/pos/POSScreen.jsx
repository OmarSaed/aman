import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, ShoppingCart, Plus, Minus, Trash2, CreditCard, Banknote, Package, Printer } from 'lucide-react';
import { productsService } from '../../services/products.service';
import { ordersService } from '../../services/orders.service';
import { customersService } from '../../services/customers.service';
import { settingsService } from '../../services/settings.service';
import { formatCurrency, formatDate } from '../../utils/format';
import { toast } from 'react-hot-toast';
import InvoicePrintModal from '../sales/InvoicePrintModal';
import {
  Box, Typography, Button, TextField, Grid, Card, CardContent,
  CardActionArea, IconButton, Dialog, DialogTitle, DialogContent,
  DialogActions, MenuItem, Divider, Chip, Avatar,
  InputAdornment, Alert, ToggleButton, ToggleButtonGroup
} from '@mui/material';

export default function POSScreen() {
  const { t } = useTranslation();
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);

  // Discount & Tax
  const [discount, setDiscount] = useState(0);
  const [taxAmount, setTaxAmount] = useState(0);

  // Checkout Modal
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [amountReceived, setAmountReceived] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [defaultLbpRate, setDefaultLbpRate] = useState(1);
  const [currency, setCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState(1);
  const [companySettings, setCompanySettings] = useState(null);

  // Receipt Print State
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [lastOrder, setLastOrder] = useState(null);
  const [pricingMode, setPricingMode] = useState('AUTO');

  const getProductPrice = (product, mode, customerType) => {
    if (mode === 'RETAIL') return Number(product.mainPrice);
    if (mode === 'WHOLESALE') return Number(product.wholesalePrice) || Number(product.mainPrice);
    return customerType === 'WHOLESALE' 
      ? (Number(product.wholesalePrice) || Number(product.mainPrice)) 
      : Number(product.mainPrice);
  };

  useEffect(() => {
    fetchStaticData();
  }, []);

  // Fetch products when filters change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300); // 300ms debounce
    return () => clearTimeout(timer);
  }, [selectedCategoryId, searchQuery]);

  // Recalculate cart prices when pricingMode or selectedCustomerId changes
  useEffect(() => {
    if (cart.length > 0) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      setCart(prev => prev.map(item => ({
        ...item,
        price: getProductPrice(item.product, pricingMode, customer?.type)
      })));
    }
  }, [pricingMode, selectedCustomerId, customers]);

  const fetchStaticData = async () => {
    try {
      const [custRes, catRes, settingsRes, companyRes] = await Promise.all([
        customersService.list(),
        productsService.listCategories(),
        settingsService.getSystemSettings(),
        settingsService.getCompanySettings()
      ]);
      
      const custArray = custRes.data?.data || custRes.data || [];
      setCustomers(custArray);
      if (custArray.length > 0 && !selectedCustomerId) {
        const defaultCust = custArray.find(c => c.isDefaultPos);
        setSelectedCustomerId(defaultCust ? defaultCust.id : custArray[0].id);
      }

      setCategories(catRes.data?.data || catRes.data || []);

      const sysSettings = settingsRes.data?.data || settingsRes.data;
      const rate = parseFloat(sysSettings?.exchangeRate) || 1;
      setDefaultLbpRate(rate);
      setCurrency(sysSettings?.currency || 'USD');
      setExchangeRate(sysSettings?.currency === 'LBP' ? rate : 1);
      
      setCompanySettings(companyRes.data?.data || companyRes.data);
    } catch (err) {
      toast.error('Failed to load static data');
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = { 
        limit: 200, // Fetch a reasonable chunk for the current view
        categoryId: selectedCategoryId === 'all' ? undefined : selectedCategoryId,
        search: searchQuery || undefined
      };
      const res = await productsService.list(params);
      setProducts(res.data?.data || res.data || []);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products;

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      const customer = customers.find(c => c.id === selectedCustomerId);
      const price = getProductPrice(product, pricingMode, customer?.type);
      return [...prev, { product, quantity: 1, price }];
    });
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev => prev.map(i => {
      if (i.product.id === productId) {
        const newQ = i.quantity + delta;
        return newQ <= 0 ? null : { ...i, quantity: newQ };
      }
      return i;
    }).filter(Boolean));
  };

  const removeFromCart = (productId) => setCart(prev => prev.filter(i => i.product.id !== productId));

  const subtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const total = Math.max(0, subtotal - parseFloat(discount || 0) + parseFloat(taxAmount || 0));
  const received = parseFloat(amountReceived) || 0;
  const changeDue = received - total;

  const handleCheckoutOpen = () => {
    if (cart.length === 0) return toast.error(t('pos.cartEmptyError'));
    if (!selectedCustomerId) return toast.error(t('pos.noCustomerError'));
    setAmountReceived(total.toString());
    setCheckoutOpen(true);
  };

  const handleConfirmCheckout = async () => {
    if (paymentMethod === 'CASH' && received < total) {
      return toast.error(t('pos.insufficientAmount'));
    }
    setCheckoutLoading(true);
    try {
      const res = await ordersService.create({
        customerId: selectedCustomerId,
        items: cart.map(i => ({ productId: i.product.id, quantity: i.quantity, price: i.price })),
        status: 'COMPLETED',
        paymentMethod,
        discount: parseFloat(discount) || 0,
        taxAmount: parseFloat(taxAmount) || 0,
        initialPayment: total,
        currency,
        exchangeRate,
        notes: 'POS Order',
        source: 'POS',
      });
      
      const createdOrder = res.data?.data || res.data;
      setLastOrder(createdOrder);
      
      toast.success(t('pos.saleSuccess'));
      setCart([]);
      setDiscount(0);
      setTaxAmount(0);
      setAmountReceived('');
      setCheckoutOpen(false);
      setReceiptOpen(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Checkout failed');
    } finally {
      setCheckoutLoading(false);
    }
  };



  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden', bgcolor: 'background.default' }}>

      {/* ── Products Panel ── */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Search Bar */}
        <Box sx={{ p: 2, borderBottom: '1px solid var(--divider)', bgcolor: 'background.paper' }}>
          <TextField
            fullWidth
            size="small"
            placeholder={t('pos.searchPlaceholder')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search size={18} style={{ color: 'var(--text-secondary)' }} />
                </InputAdornment>
              )
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />
        </Box>

        {/* Category Filter */}
        <Box sx={{ 
          px: 2, py: 1.5, 
          display: 'flex', gap: 1, 
          overflowX: 'auto', 
          bgcolor: 'background.paper',
          borderBottom: '1px solid var(--divider)',
          '&::-webkit-scrollbar': { height: 4 },
          '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.1)', borderRadius: 2 }
        }}>
          <Chip
            label={isAr ? 'الكل' : 'All'}
            onClick={() => setSelectedCategoryId('all')}
            color={selectedCategoryId === 'all' ? 'primary' : 'default'}
            variant={selectedCategoryId === 'all' ? 'contained' : 'outlined'}
            sx={{ fontWeight: 700, borderRadius: 1.5 }}
          />
          {categories.map(cat => (
            <Chip
              key={cat.id}
              label={cat.name}
              onClick={() => setSelectedCategoryId(cat.id)}
              color={selectedCategoryId === cat.id ? 'primary' : 'default'}
              variant={selectedCategoryId === cat.id ? 'contained' : 'outlined'}
              sx={{ fontWeight: 700, borderRadius: 1.5 }}
            />
          ))}
        </Box>

        {/* Products Grid */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2 }}>
          <Grid container spacing={1.5}>
            {filteredProducts.map(product => (
              <Grid size={{ xs: 6, sm: 4, md: 3, lg: 2 }} key={product.id}>
                <Card
                  onClick={() => addToCart(product)}
                  sx={{
                    cursor: 'pointer',
                    height: '100%',
                    borderRadius: 2,
                    transition: 'all 0.15s ease',
                    border: '2px solid transparent',
                    '&:hover': {
                      borderColor: 'primary.main',
                      transform: 'translateY(-2px)',
                      boxShadow: 'var(--shadow-md)'
                    }
                  }}
                >
                  <CardActionArea sx={{ p: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <Box sx={{
                      width: '100%', height: 70,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      bgcolor: 'background.neutral', borderRadius: 1.5, mb: 0.5
                    }}>
                      {product.imageUrl
                        ? <img src={product.imageUrl} alt={product.name} style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }} />
                        : <Package size={28} style={{ opacity: 0.3 }} />
                      }
                    </Box>
                    <Typography variant="caption" sx={{ fontWeight: 700, textAlign: 'center', lineHeight: 1.2, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {product.name}
                    </Typography>
                    <Typography variant="body2" color="primary" sx={{ fontWeight: 800, mt: 'auto' }}>
                      {formatCurrency(product.mainPrice)}
                    </Typography>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
            {filteredProducts.length === 0 && !loading && (
              <Box sx={{ width: '100%', textAlign: 'center', py: 10 }}>
                <Package size={48} style={{ opacity: 0.2, marginBottom: 8 }} />
                <Typography color="text.secondary">{t('pos.noProducts')}</Typography>
              </Box>
            )}
          </Grid>
        </Box>
      </Box>

      {/* ── Cart Sidebar ── */}
      <Box sx={{ width: 380, bgcolor: 'background.paper', borderLeft: '1px solid var(--divider)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box sx={{ p: 2, borderBottom: '1px solid var(--divider)', bgcolor: 'background.neutral' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
            <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: 1 }}>
              <ShoppingCart size={20} /> {t('pos.currentOrder')}
            </Typography>
            <Box display="flex" gap={1} alignItems="center">
              <ToggleButtonGroup
                size="small"
                value={pricingMode}
                exclusive
                onChange={(_, val) => val && setPricingMode(val)}
                sx={{ height: 28 }}
              >
                <ToggleButton value="AUTO" sx={{ px: 1, fontSize: '0.75rem' }}>{isAr ? 'تلقائي' : 'Auto'}</ToggleButton>
                <ToggleButton value="RETAIL" sx={{ px: 1, fontSize: '0.75rem' }}>{isAr ? 'قطاعي' : 'Retail'}</ToggleButton>
                <ToggleButton value="WHOLESALE" sx={{ px: 1, fontSize: '0.75rem' }}>{isAr ? 'جملة' : 'Whlsale'}</ToggleButton>
              </ToggleButtonGroup>
              {cart.length > 0 && (
                <Chip label={cart.reduce((s, i) => s + i.quantity, 0)} color="primary" size="small" sx={{ fontWeight: 800 }} />
              )}
            </Box>
          </Box>
          <Grid container spacing={1.5}>
            <Grid item xs={8}>
              <TextField
                select
                size="small"
                fullWidth
                value={selectedCustomerId}
                onChange={e => setSelectedCustomerId(e.target.value)}
                label={t('pos.customer')}
              >
                <MenuItem value=""><em>— {t('pos.customer')} —</em></MenuItem>
                {customers.map(c => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={4}>
              <TextField
                select
                size="small"
                fullWidth
                value={currency}
                onChange={e => {
                  const newCurr = e.target.value;
                  setCurrency(newCurr);
                  if (newCurr === 'LBP') setExchangeRate(defaultLbpRate);
                  else if (newCurr === 'USD') setExchangeRate(1);
                }}
                label={isAr ? 'العملة' : 'Currency'}
              >
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="LBP">LBP</MenuItem>
                <MenuItem value="IQD">IQD</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        </Box>

        {/* Cart Items */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 1.5 }}>
          {cart.length === 0 ? (
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, opacity: 0.4 }}>
              <ShoppingCart size={40} />
              <Typography variant="body2">{t('pos.cartEmpty')}</Typography>
            </Box>
          ) : (
            cart.map(item => (
              <Box key={item.product.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, p: 1, borderRadius: 2, border: '1px solid var(--divider)', '&:hover': { bgcolor: 'action.hover' } }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.product.name}
                  </Typography>
                  <Typography variant="caption" color="primary" sx={{ fontWeight: 700 }}>
                    {formatCurrency(item.price * item.quantity)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <IconButton size="small" onClick={() => updateQuantity(item.product.id, -1)} sx={{ width: 26, height: 26, border: '1px solid var(--divider)' }}>
                    <Minus size={13} />
                  </IconButton>
                  <Typography sx={{ fontWeight: 800, minWidth: 24, textAlign: 'center', fontSize: '0.9rem' }}>
                    {item.quantity}
                  </Typography>
                  <IconButton size="small" onClick={() => updateQuantity(item.product.id, 1)} sx={{ width: 26, height: 26, border: '1px solid var(--divider)' }}>
                    <Plus size={13} />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => removeFromCart(item.product.id)} sx={{ width: 26, height: 26 }}>
                    <Trash2 size={13} />
                  </IconButton>
                </Box>
              </Box>
            ))
          )}
        </Box>

        {/* Totals */}
        <Box sx={{ p: 2, borderTop: '1px solid var(--divider)', bgcolor: 'background.neutral' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">{t('pos.subtotal')}</Typography>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>{formatCurrency(subtotal)}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, gap: 2 }}>
            <Typography variant="body2" color="text.secondary">{t('pos.discount')}</Typography>
            <TextField
              size="small" type="number" inputProps={{ min: 0 }}
              sx={{ width: 90, '& input': { p: '4px 8px', textAlign: 'right', fontWeight: 700 } }}
              value={discount} onChange={e => setDiscount(e.target.value)}
            />
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, gap: 2 }}>
            <Typography variant="body2" color="text.secondary">{t('pos.tax')}</Typography>
            <TextField
              size="small" type="number" inputProps={{ min: 0 }}
              sx={{ width: 90, '& input': { p: '4px 8px', textAlign: 'right', fontWeight: 700 } }}
              value={taxAmount} onChange={e => setTaxAmount(e.target.value)}
            />
          </Box>
          <Divider sx={{ mb: 1.5 }} />
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>{t('pos.total')}</Typography>
            <Typography variant="h5" color="primary" sx={{ fontWeight: 900 }}>{formatCurrency(total)}</Typography>
          </Box>
          <Button
            fullWidth variant="contained" size="large"
            disabled={cart.length === 0}
            onClick={handleCheckoutOpen}
            sx={{ py: 1.5, borderRadius: 2, fontWeight: 800, fontSize: '1rem', letterSpacing: 0.5 }}
          >
            {t('pos.checkout')}
          </Button>
        </Box>
      </Box>

      {/* ── Checkout Dialog ── */}
      <Dialog
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        PaperProps={{ sx: { width: '100%', maxWidth: 440, borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>{t('pos.completeSale')}</DialogTitle>
        <DialogContent dividers sx={{ pt: 2 }}>
          {/* Total Amount */}
          <Box sx={{ textAlign: 'center', mb: 3, p: 2, bgcolor: 'primary.main', borderRadius: 2 }}>
            <Typography variant="caption" sx={{ color: 'primary.contrastText', opacity: 0.8 }}>{t('pos.total')}</Typography>
            <Typography variant="h3" sx={{ color: 'primary.contrastText', fontWeight: 900 }}>
              {formatCurrency(total)}
            </Typography>
          </Box>

          {/* Payment Method */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, fontWeight: 600 }}>
            {t('pos.paymentMethod')}
          </Typography>
          <Grid container spacing={1.5} sx={{ mb: 3 }}>
            <Grid size={{ xs: 6 }}>
              <Button
                fullWidth
                variant={paymentMethod === 'CASH' ? 'contained' : 'outlined'}
                onClick={() => setPaymentMethod('CASH')}
                sx={{ py: 1.5, borderRadius: 2, fontWeight: 700 }}
                startIcon={<Banknote size={18} />}
              >
                {t('pos.cash')}
              </Button>
            </Grid>
            <Grid size={{ xs: 6 }}>
              <Button
                fullWidth
                variant={paymentMethod === 'CARD' ? 'contained' : 'outlined'}
                onClick={() => setPaymentMethod('CARD')}
                sx={{ py: 1.5, borderRadius: 2, fontWeight: 700 }}
                startIcon={<CreditCard size={18} />}
              >
                {t('pos.card')}
              </Button>
            </Grid>
          </Grid>

          {/* Cash Change Calculator — only for cash payments */}
          {paymentMethod === 'CASH' && (
            <Box sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 2, border: '1px solid var(--divider)' }}>
              {/* Quick Cash Buttons */}
              <Grid container spacing={1} sx={{ mb: 2 }}>
                {[total, 10, 20, 50, 100].map((val, idx) => (
                  <Grid size={{ xs: idx === 0 ? 12 : 3 }} key={idx}>
                    <Button 
                      fullWidth 
                      variant="outlined" 
                      color="primary"
                      onClick={() => setAmountReceived(idx === 0 ? val.toString() : (parseFloat(amountReceived || 0) + val).toString())}
                      sx={{ fontWeight: 800, py: 1, px: 0, minWidth: 0 }}
                    >
                      {idx === 0 ? (isAr ? 'المبلغ بالضبط' : 'Exact Amount') : `+${val}`}
                    </Button>
                  </Grid>
                ))}
              </Grid>

              <TextField
                fullWidth
                type="number"
                label={t('pos.amountReceived')}
                value={amountReceived}
                onChange={e => setAmountReceived(e.target.value)}
                inputProps={{ min: 0 }}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><Banknote size={16} /></InputAdornment>
                }}
                sx={{ mb: 2 }}
                autoFocus
              />

              {/* Touch Numpad */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, mb: 2 }}>
                {[7, 8, 9, 4, 5, 6, 1, 2, 3, 'C', 0, '⌫'].map((key) => (
                  <Button
                    key={key}
                    variant="contained"
                    color={key === 'C' ? 'error' : (key === '⌫' ? 'secondary' : 'inherit')}
                    sx={{
                      py: 1.5, 
                      fontSize: '1.25rem', 
                      fontWeight: 900, 
                      bgcolor: (key !== 'C' && key !== '⌫') ? 'background.paper' : undefined,
                      color: (key !== 'C' && key !== '⌫') ? 'text.primary' : undefined,
                      border: (key !== 'C' && key !== '⌫') ? '1px solid var(--divider)' : undefined,
                      boxShadow: 'var(--shadow-sm)'
                    }}
                    onClick={() => {
                      if (key === 'C') {
                        setAmountReceived('');
                      } else if (key === '⌫') {
                        setAmountReceived(prev => prev.toString().slice(0, -1));
                      } else {
                        setAmountReceived(prev => prev.toString() + key.toString());
                      }
                    }}
                  >
                    {key}
                  </Button>
                ))}
              </Box>
              {received > 0 && (
                <Box sx={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  p: 1.5, borderRadius: 1.5,
                  bgcolor: changeDue >= 0 ? 'success.main' : 'error.main'
                }}>
                  <Typography variant="body1" sx={{ color: 'white', fontWeight: 700 }}>
                    {t('pos.changeDue')}
                  </Typography>
                  <Typography variant="h5" sx={{ color: 'white', fontWeight: 900 }}>
                    {changeDue >= 0 ? formatCurrency(changeDue) : `- ${formatCurrency(Math.abs(changeDue))}`}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setCheckoutOpen(false)} color="inherit" variant="outlined" sx={{ flex: 1, borderRadius: 2 }}>
            {t('pos.cancel')}
          </Button>
          <Button
            variant="contained" onClick={handleConfirmCheckout}
            disabled={checkoutLoading || (paymentMethod === 'CASH' && received < total && received > 0)}
            sx={{ flex: 2, borderRadius: 2, fontWeight: 800 }}
          >
            {checkoutLoading ? '...' : t('pos.confirm')}
          </Button>
        </DialogActions>
      </Dialog>
      {/* ── Receipt Dialog ── */}
      <InvoicePrintModal
        order={lastOrder}
        open={receiptOpen}
        onClose={() => setReceiptOpen(false)}
      />
    </Box>
  );
}

