// frontend/src/features/products/ProductsList.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { 
  Box, Typography, Button, TextField, InputAdornment, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, CircularProgress, Chip, Menu, MenuItem,
  Pagination, Stack, Checkbox, Switch
} from '@mui/material';
import { 
  Add, Search, MoreVert, Edit, Delete, CloudUpload, 
  Inventory, QrCode, ErrorOutline, InfoOutlined, AutoFixHigh, Download
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Tooltip } from '@mui/material';
import toast from 'react-hot-toast';
import { productsService } from '../../services/products.service';
import { settingsService } from '../../services/settings.service';
import { ConfirmModal } from '../../components/ui/Modal';
import Can from '../auth/Can';
import BulkImportModal from './BulkImportModal';
import BulkPriceUpdateModal from './BulkPriceUpdateModal';
import QuickEditPricesModal from './QuickEditPricesModal';
import { exportToCSV } from '../../utils/export';

export default function ProductsList() {
  const { t, i18n } = useTranslation('products');
  const isAr = i18n.language === 'ar';
  const qc = useQueryClient();
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [importOpen, setImportOpen] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [quickEditModalOpen, setQuickEditModalOpen] = useState(false);
  const [deleteProduct, setDeleteProduct] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => productsService.listCategories().then(r => r.data.data),
  });

  const { data: brands } = useQuery({
    queryKey: ['brands'],
    queryFn: () => productsService.listBrands().then(r => r.data.data),
  });

  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');

  const { data: systemSettings } = useQuery({
    queryKey: ['system-settings'],
    queryFn: () => settingsService.getSystemSettings().then(r => r.data.data),
  });

  const defaultStrategy = systemSettings?.defaultPricingStrategy || 'Average';

  const params = { 
    page, 
    limit, 
    ...(search && { search }), 
    ...(categoryId && { categoryId }),
    ...(brandId && { brandId }) 
  };

  const { data, isLoading } = useQuery({
    queryKey: ['products', params],
    queryFn: () => productsService.list(params).then(r => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => productsService.delete(id),
    onSuccess: () => { 
      qc.invalidateQueries(['products']); 
      toast.success(t('toast.deleted')); 
      setDeleteProduct(null); 
    },
    onError: (e) => toast.error(e.response?.data?.message || t('toast.deletionFailed')),
  });

  const toggleLockMut = useMutation({
    mutationFn: ({ id, isPriceLocked }) => productsService.togglePriceLock(id, isPriceLocked),
    onSuccess: () => {
      qc.invalidateQueries(['products']);
      toast.success(isAr ? 'تم تحديث التسعير التلقائي' : 'Auto-pricing updated');
    },
    onError: (e) => toast.error(e.response?.data?.message || (isAr ? 'حدث خطأ' : 'Error updating')),
  });

  const handleToggleAutoPrice = (e, product) => {
    e.stopPropagation();
    // UI "Auto Price" checked means DB isPriceLocked = false
    const isPriceLocked = !e.target.checked;
    toggleLockMut.mutate({ id: product.id, isPriceLocked });
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(data?.data?.map(p => p.id) || []);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (e, id) => {
    e.stopPropagation();
    if (e.target.checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(item => item !== id));
    }
  };

  const products = data?.data || [];
  const pagination = data?.pagination;

  const handleExport = () => {
    if (products.length === 0) return toast.error(isAr ? 'لا توجد بيانات للتصدير' : 'No data to export');
    const headers = [
      { key: 'name', label: isAr ? 'اسم المنتج' : 'Product Name' },
      { key: 'sku', label: 'SKU' },
      { key: 'barcode', label: isAr ? 'الباركود' : 'Barcode' },
      { key: 'category', label: isAr ? 'الفئة' : 'Category' },
      { key: 'brand', label: isAr ? 'الماركة' : 'Brand' },
      { key: 'costPrice', label: isAr ? 'التكلفة' : 'Cost' },
      { key: 'mainPrice', label: isAr ? 'سعر البيع' : 'Main Price' },
      { key: 'stock', label: isAr ? 'المخزون' : 'Stock' }
    ];
    const rows = products.map(p => ({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode || '',
      category: p.category?.name || '',
      brand: p.brand?.name || '',
      costPrice: p.costPrice,
      mainPrice: p.mainPrice,
      stock: p.stocks?.reduce((acc, stock) => acc + stock.quantity, 0) || 0
    }));
    exportToCSV('products', rows, headers);
  };

  const handleMenuOpen = (event, product) => {
    setAnchorEl(event.currentTarget);
    setSelectedProduct(product);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedProduct(null);
  };

  const handleEdit = () => {
    navigate(`/products/${selectedProduct.id}/edit`);
    handleMenuClose();
  };

  const handleDeleteClick = () => {
    setDeleteProduct(selectedProduct);
    handleMenuClose();
  };

  return (
    <Box sx={{ width: '100%', animate: 'fade 0.5s ease' }}>
      {/* Header Section */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h4" fontWeight={800} color="text.primary">
            {t('title')}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t('subtitle')}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          {selectedIds.length > 0 && (
            <Can permission="inventory:update-products">
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button 
                  variant="outlined" 
                  startIcon={<AutoFixHigh />}
                  onClick={() => setQuickEditModalOpen(true)}
                  sx={{ borderRadius: 2 }}
                >
                  {isAr ? 'تعديل سريع' : 'Quick Edit'}
                </Button>
                <Button 
                  variant="contained" 
                  startIcon={<CloudUpload />}
                  onClick={() => setBulkModalOpen(true)}
                  sx={{ borderRadius: 2 }}
                >
                  {isAr ? 'تحديث الأسعار' : 'Update Prices'}
                </Button>
              </Box>
            </Can>
          )}
          <Can permission="products:import">
            <Button 
               variant="outlined" 
               onClick={handleExport}
               sx={{ bgcolor: 'white', px: 2 }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Download sx={{ fontSize: 20 }} />
                <Typography variant="button" sx={{ fontWeight: 700 }}>
                   {isAr ? 'تصدير' : 'Export'}
                </Typography>
              </Stack>
            </Button>
            <Button 
               variant="outlined" 
               onClick={() => setImportOpen(true)}
               sx={{ bgcolor: 'white', px: 2 }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <CloudUpload sx={{ fontSize: 20 }} />
                <Typography variant="button" sx={{ fontWeight: 700 }}>
                   {t('massImport')}
                </Typography>
              </Stack>
            </Button>
          </Can>
          <Can permission="inventory:create-products">
            <Button 
              variant="contained" 
              onClick={() => navigate('/products/new')}
              sx={{ px: 3 }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <Add sx={{ fontSize: 22 }} />
                <Typography variant="button" sx={{ fontWeight: 700 }}>
                  {t('newProduct')}
                </Typography>
              </Stack>
            </Button>
          </Can>
        </Box>
      </Box>

      {/* Filter Section */}
      <Paper sx={{ p: 1.5, mb: 3, borderRadius: '10px', boxShadow: 'var(--shadow-sm)', display: 'flex', gap: 2, alignItems: 'center', flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
        <TextField 
          placeholder={t('list.searchPlaceholder')}
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          size="small"
          sx={{ flex: { xs: 1, md: 0.3 }, minWidth: 200 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment>,
            sx: { bgcolor: 'var(--bg-app)', borderRadius: '10px' }
          }}
        />

        <TextField
          select
          size="small"
          label={t('list.category')}
          value={categoryId}
          onChange={(e) => { setCategoryId(e.target.value); setPage(1); }}
          sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
        >
          <MenuItem value="">{t('list.allCategories')}</MenuItem>
          {categories?.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
        </TextField>

        <TextField
          select
          size="small"
          label={t('list.brand')}
          value={brandId}
          onChange={(e) => { setBrandId(e.target.value); setPage(1); }}
          sx={{ minWidth: 150, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
        >
          <MenuItem value="">{t('list.allBrands')}</MenuItem>
          {brands?.map(b => <MenuItem key={b.id} value={b.id}>{b.name}</MenuItem>)}
        </TextField>
      </Paper>

      {/* Table Section */}
      <Paper sx={{ borderRadius: '10px', overflow: 'hidden', boxShadow: 'var(--shadow-md)' }}>
        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox 
                    indeterminate={selectedIds.length > 0 && selectedIds.length < products.length}
                    checked={products.length > 0 && selectedIds.length === products.length}
                    onChange={handleSelectAll}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('list.productIdentity')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>SKU</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('list.category')}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{t('list.pricing')}</TableCell>
                <Can permission="products:manage-cost">
                  <TableCell sx={{ fontWeight: 700 }}>{t('list.cost')}</TableCell>
                </Can>
                <TableCell align="center" sx={{ fontWeight: 700 }}>{isAr ? 'التسعير التلقائي' : 'Auto Pricing'}</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700 }}>{t('list.availableStock')}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{t('list.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={9} align="center" sx={{ py: 10 }}><CircularProgress size={32} /></TableCell></TableRow>
              ) : products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 10 }}>
                    <Stack alignItems="center" spacing={1} sx={{ opacity: 0.5 }}>
                      <ErrorOutline sx={{ fontSize: 48 }} />
                      <Typography variant="h6">{t('list.noRecords')}</Typography>
                    </Stack>
                  </TableCell>
                </TableRow>
              ) : products.map(p => {
                const totalStock = p.stocks?.reduce((acc, stock) => acc + stock.quantity, 0) || 0;
                return (
                  <TableRow key={p.id} hover selected={selectedIds.includes(p.id)}>
                    <TableCell padding="checkbox">
                      <Checkbox 
                        checked={selectedIds.includes(p.id)}
                        onChange={(e) => handleSelectOne(e, p.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        {p.imageUrl ? (
                          <Box sx={{ width: 40, height: 40, borderRadius: 1.5, backgroundImage: `url(${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${p.imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center', border: '1px solid #e2e8f0' }} />
                        ) : (
                          <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #e2e8f0' }}>
                            <Inventory sx={{ color: '#94a3b8', fontSize: 20 }} />
                          </Box>
                        )}
                        <Box>
                          <Typography variant="body1" fontWeight={700}>{p.name}</Typography>
                          {p.barcode && (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, opacity: 0.6 }}>
                              <QrCode sx={{ fontSize: 14 }} />
                              <Typography variant="caption">{p.barcode}</Typography>
                            </Box>
                          )}
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', letterSpacing: 0.5 }}>{p.sku}</Typography>
                    </TableCell>
                    <TableCell>
                      {p.category?.name ? (
                         <Chip label={p.category.name} size="small" variant="outlined" sx={{ borderRadius: 1 }} />
                      ) : <Typography variant="caption" sx={{ opacity: 0.3 }}>—</Typography>}
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={800} color="success.main">
                        ${parseFloat(p.mainPrice).toFixed(2)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t('list.trade')}: ${parseFloat(p.wholesalePrice).toFixed(2)}
                      </Typography>
                    </TableCell>
                    <Can permission="products:manage-cost">
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <Typography variant="body2" fontWeight={700} color="error.main">
                            ${parseFloat(p.costPrice).toFixed(2)}
                          </Typography>
                          <Tooltip 
                            title={
                              <Box sx={{ p: 0.5 }}>
                                <Typography variant="caption" display="block" fontWeight={700}>
                                  {t('list.pricingStrategy', 'Pricing Strategy')}: {p.overridePricingStrategy || defaultStrategy}
                                </Typography>
                                <Typography variant="caption" display="block">
                                  {t('list.basedOn', 'Based on')} {p._count?.supplierPrices || 0} {t('list.records', 'records')}
                                </Typography>
                              </Box>
                            }
                            arrow
                          >
                            <InfoOutlined sx={{ fontSize: 14, color: 'text.secondary', cursor: 'help' }} />
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </Can>
                    <TableCell align="center">
                      <Tooltip title={isAr ? 'إيقاف / تشغيل الحساب التلقائي من المشتريات' : 'Toggle auto-calculate from PO'}>
                        <Switch 
                          size="small"
                          checked={!p.isPriceLocked}
                          onChange={(e) => handleToggleAutoPrice(e, p)}
                          color="primary"
                        />
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                       <Chip 
                          label={totalStock} 
                          size="small" 
                          color={totalStock > 0 ? 'success' : 'error'} 
                          sx={{ fontWeight: 800, minWidth: 40 }} 
                        />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={(e) => handleMenuOpen(e, p)}>
                        <MoreVert fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        {pagination && (
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid', borderColor: 'divider', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">{isAr ? 'صفوف:' : 'Rows:'}</Typography>
              <TextField
                select
                size="small"
                value={limit}
                onChange={(e) => { setLimit(parseInt(e.target.value)); setPage(1); }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', height: 32, fontSize: 12 } }}
              >
                {[5, 10, 20, 50].map(v => <MenuItem key={v} value={v}>{v}</MenuItem>)}
              </TextField>
              <Typography variant="caption" color="text.secondary" sx={{ ml: 1, minWidth: 200 }}>
                {isAr ? `إجمالي ${pagination.total} عنصر` : `Total ${pagination.total} items`}
              </Typography>
            </Box>
            <Pagination 
              count={pagination.totalPages} 
              page={page} 
              onChange={(e, v) => setPage(v)} 
              color="primary" 
              shape="rounded"
              size="small"
            />
          </Box>
        )}
      </Paper>

      {/* Action Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <Can permission="inventory:update-products">
          <MenuItem onClick={handleEdit}>
            <Edit sx={{ fontSize: 18, mr: 1.5 }} /> {t('actions.edit')}
          </MenuItem>
        </Can>
        <Can permission="inventory:delete-products">
          <MenuItem onClick={handleDeleteClick} sx={{ color: 'error.main' }}>
            <Delete sx={{ fontSize: 18, mr: 1.5 }} /> {t('actions.delete')}
          </MenuItem>
        </Can>
      </Menu>

      {/* Modals */}
      <BulkPriceUpdateModal
        open={bulkModalOpen}
        onClose={() => setBulkModalOpen(false)}
        selectedIds={selectedIds}
        onSuccess={() => {
          setSelectedIds([]);
          qc.invalidateQueries(['products']);
        }}
      />

      <QuickEditPricesModal
        open={quickEditModalOpen}
        onClose={() => setQuickEditModalOpen(false)}
        products={products.filter(p => selectedIds.includes(p.id))}
        onSuccess={() => {
          setSelectedIds([]);
          qc.invalidateQueries(['products']);
        }}
      />

      <BulkImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => { qc.invalidateQueries(['products']); setImportOpen(false); }}
      />

      <ConfirmModal
        isOpen={!!deleteProduct}
        onClose={() => setDeleteProduct(null)}
        onConfirm={() => deleteMut.mutate(deleteProduct?.id)}
        loading={deleteMut.isPending}
        title={t('confirm.deleteTitle')}
        message={t('confirm.deleteMessage', { name: deleteProduct?.name })}
        confirmLabel={t('confirm.confirmDelete')}
      />
    </Box>
  );
}
