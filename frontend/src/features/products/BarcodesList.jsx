// frontend/src/features/products/BarcodesList.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { 
  Box, Typography, TextField, Button, Paper, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  IconButton, Tooltip, Stack, Alert, Chip, FormControl, Select, MenuItem, InputLabel
} from '@mui/material';
import { 
  QrCode, AutoFixHigh, Download, Search, 
  WarningAmber, CheckCircle, PictureAsPdf, Category, FilterList
} from '@mui/icons-material';
import { productsService } from '../../services/products.service';
import toast from 'react-hot-toast';
import { jsPDF } from 'jspdf';
import JsBarcode from 'jsbarcode';

export default function BarcodesList() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data: products, isLoading } = useQuery({
    queryKey: ['products_all_barcodes'],
    queryFn: () => productsService.list({ all: 'true' }).then(r => Array.isArray(r.data?.data) ? r.data.data : (r.data?.data?.data || []))
  });

  const { data: categories } = useQuery({
    queryKey: ['categories_all'],
    queryFn: () => productsService.listCategories().then(r => Array.isArray(r.data?.data) ? r.data.data : [])
  });

  const mutGenerate = useMutation({
    mutationFn: () => productsService.generateMissingBarcodes(),
    onSuccess: (res) => {
      toast.success(isAr ? `تم توليد ${res.data.data.updatedCount} باركود` : `Generated ${res.data.data.updatedCount} barcodes`);
      qc.invalidateQueries(['products_all_barcodes']);
      qc.invalidateQueries(['products']);
    },
    onError: () => toast.error('Error generating barcodes')
  });

  const filtered = products?.filter(p => {
    const matchesSearch = 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.barcode && p.barcode.includes(search));
      
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const missingCount = filtered?.filter(p => !p.barcode).length || 0;

  const handleExportCSV = () => {
    const dataToExport = filtered;
    if (!dataToExport || dataToExport.length === 0) return;
    
    // Check if Arabic language to use BOM for Excel
    const BOM = "\uFEFF";
    const headers = isAr ? ['اسم المنتج', 'التصنيف', 'SKU', 'الباركود'] : ['Product Name', 'Category', 'SKU', 'Barcode'];
    const rows = dataToExport.map(p => [
      `"${p.name.replace(/"/g, '""')}"`,
      `"${p.category?.name || (isAr ? 'بدون تصنيف' : 'Uncategorized')}"`,
      `"${p.sku}"`,
      `"${p.barcode || ''}"`
    ]);
    
    const csvContent = BOM + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `barcodes_export_cat_${selectedCategory}_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadPDF = () => {
    const dataToExport = filtered;
    if (!dataToExport || dataToExport.length === 0) return;
    
    // Filter products that have barcodes
    const productsWithBarcode = dataToExport.filter(p => !!p.barcode);
    if (productsWithBarcode.length === 0) {
      toast.error(isAr ? 'لا يوجد منتجات بباركود في هذا الفلتر لتحميلها' : 'No products with barcodes in this filter to generate PDF');
      return;
    }

    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Grid settings (A4-ish)
    const margin = 10;
    const cols = 3;
    const rows = 10; // Labels per page
    const labelWidth = (pageWidth - (margin * 2)) / cols;
    const labelHeight = (pageHeight - (margin * 2)) / rows;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    productsWithBarcode.forEach((p, index) => {
      const pageIndex = Math.floor(index / (cols * rows));
      const itemIndexOnPage = index % (cols * rows);
      
      if (pageIndex > 0 && itemIndexOnPage === 0) {
        doc.addPage();
      }

      const col = itemIndexOnPage % cols;
      const row = Math.floor(itemIndexOnPage / cols);
      
      const x = margin + (col * labelWidth);
      const y = margin + (row * labelHeight);

      // ── Render Entire Label to Canvas for Arabic Support ──
      const scale = 4; // High resolution
      canvas.width = labelWidth * scale;
      canvas.height = labelHeight * scale;
      
      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Product Name - Sized down and positioned perfectly to prevent overlapping
      ctx.fillStyle = '#0f172a'; // Deep slate
      ctx.font = `bold ${3.0 * scale}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const nameText = p.name.length > 35 ? p.name.substring(0, 32) + '...' : p.name;
      ctx.fillText(nameText, canvas.width / 2, 3 * scale);

      // Barcode - Vertical position and height adjusted to completely avoid overlapping
      const barcodeCanvas = document.createElement('canvas');
      try {
        JsBarcode(barcodeCanvas, p.barcode, {
          format: "CODE128",
          width: 1.8,
          height: 35, // High-quality barcodes
          displayValue: false,
          margin: 0
        });
        // Render starting at y = 7.5 * scale, height 11.5 * scale
        ctx.drawImage(barcodeCanvas, 5 * scale, 7.5 * scale, canvas.width - 10 * scale, 11.5 * scale);
      } catch (e) {
        console.error("Barcode error", e);
      }

      // Footer Info - Separated and shifted down, font slightly scaled down for perfect legibility
      ctx.fillStyle = '#334155'; // Medium slate
      ctx.font = `bold ${2.8 * scale}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(`${p.sku} | ${p.barcode}`, canvas.width / 2, canvas.height - 5 * scale);

      // Add to PDF
      const imgData = canvas.toDataURL("image/jpeg", 0.9);
      doc.addImage(imgData, 'JPEG', x, y, labelWidth, labelHeight);
      
      // Border
      doc.setDrawColor(226, 232, 240); // Sleek border color
      doc.rect(x, y, labelWidth, labelHeight);
    });

    doc.save(`product_labels_cat_${selectedCategory}_${Date.now()}.pdf`);
    toast.success(isAr ? 'تم تحميل ملصقات PDF' : 'PDF Labels downloaded');
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} flexDirection={{ xs: 'column', md: 'row' }} gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={800} gutterBottom sx={{ letterSpacing: -0.5, color: '#0f172a' }}>
            {isAr ? 'إدارة الباركود' : 'Barcode Management'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isAr ? 'توليد وتصدير الباركود للمنتجات والملصقات مع خيارات تصفية متقدمة.' : 'Generate and export barcodes for products and labels with advanced filtering.'}
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} alignSelf={{ xs: 'stretch', md: 'auto' }} justifyContent="flex-end">
          <Button 
            variant="outlined" 
            color="inherit"
            startIcon={<Download />} 
            onClick={handleExportCSV}
            disabled={!filtered?.length}
            sx={{ fontWeight: 700, borderRadius: '8px', border: '1px solid #cbd5e1', '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' } }}
          >
            {isAr ? 'تصدير CSV' : 'Export CSV'}
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<PictureAsPdf />} 
            onClick={handleDownloadPDF}
            disabled={!filtered?.length}
            sx={{ fontWeight: 700, borderRadius: '8px', bgcolor: '#6366f1', '&:hover': { bgcolor: '#4f46e5' } }}
          >
            {isAr ? 'تحميل ملصقات PDF' : 'Download Labels PDF'}
          </Button>
          <Button 
            variant="contained" 
            color="secondary"
            startIcon={<AutoFixHigh />} 
            onClick={() => {
               if(window.confirm(isAr ? 'هل أنت متأكد من توليد باركود لكل المنتجات المفقودة؟' : 'Are you sure you want to generate barcodes for all missing products?')) {
                 mutGenerate.mutate();
               }
            }}
            disabled={mutGenerate.isPending || missingCount === 0}
            sx={{ fontWeight: 800, borderRadius: '8px' }}
          >
            {isAr ? 'توليد المفقود' : 'Generate Missing'}
          </Button>
        </Stack>
      </Box>

      {missingCount > 0 && (
        <Alert 
          severity="warning" 
          icon={<WarningAmber />} 
          sx={{ mb: 3, borderRadius: '10px', border: '1px solid #fef3c7', bgcolor: '#fffbeb', color: '#92400e', '& .MuiAlert-icon': { color: '#d97706' } }}
        >
          {isAr 
            ? `هناك ${missingCount} منتج بدون باركود في الفلتر الحالي. اضغط على "توليد المفقود" لإنشائها تلقائياً.` 
            : `There are ${missingCount} products without barcodes in the current filter. Click "Generate Missing" to create them automatically.`}
        </Alert>
      )}

      {/* Modern Filter Section */}
      <Paper sx={{ p: 2.5, mb: 3, borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.05)', bgcolor: 'white' }}>
        <Stack spacing={2}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
            {/* Search Input */}
            <TextField
              size="small"
              placeholder={isAr ? 'ابحث بالاسم أو SKU أو الباركود...' : 'Search by name, SKU or barcode...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ flexGrow: 1, width: '100%', '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#f8fafc', '& fieldset': { borderColor: '#e2e8f0' } } }}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: '#94a3b8', fontSize: 20 }} />
              }}
            />
            
            {/* Category Dropdown Filter */}
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 220 }, '& .MuiOutlinedInput-root': { borderRadius: '8px', bgcolor: '#f8fafc', '& fieldset': { borderColor: '#e2e8f0' } } }}>
              <InputLabel id="category-filter-label" sx={{ fontWeight: 500 }}>{isAr ? 'تصفية بالتصنيف' : 'Filter by Category'}</InputLabel>
              <Select
                labelId="category-filter-label"
                value={selectedCategory}
                label={isAr ? 'تصفية بالتصنيف' : 'Filter by Category'}
                onChange={(e) => setSelectedCategory(e.target.value)}
                sx={{ fontWeight: 600 }}
              >
                <MenuItem value="all" sx={{ fontWeight: 600 }}>{isAr ? 'كل التصنيفات' : 'All Categories'}</MenuItem>
                {categories?.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>

          {/* Sleek Category Chip Row */}
          <Box sx={{ borderTop: '1px dashed #e2e8f0', pt: 1.5 }}>
            <Typography variant="caption" fontWeight={700} color="#64748b" display="block" mb={1} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {isAr ? 'التصنيفات السريعة:' : 'Quick Categories:'}
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              gap: 1.5, 
              overflowX: 'auto', 
              pb: 0.5, 
              '&::-webkit-scrollbar': { height: '5px' },
              '&::-webkit-scrollbar-thumb': { bgcolor: '#cbd5e1', borderRadius: '4px' },
              '&::-webkit-scrollbar-track': { bgcolor: '#f8fafc' }
            }}>
              <Chip
                label={isAr ? 'الكل' : 'All Products'}
                clickable
                onClick={() => setSelectedCategory('all')}
                icon={<Category sx={{ fontSize: '15px !important' }} />}
                sx={{ 
                  fontWeight: 700, 
                  px: 0.5, 
                  borderRadius: '6px', 
                  bgcolor: selectedCategory === 'all' ? '#6366f1' : '#f1f5f9',
                  color: selectedCategory === 'all' ? 'white' : '#475569',
                  '& .MuiChip-icon': { color: selectedCategory === 'all' ? 'white !important' : 'inherit' },
                  '&:hover': { bgcolor: selectedCategory === 'all' ? '#4f46e5' : '#e2e8f0' },
                  transition: 'all 0.15s ease'
                }}
              />
              {categories?.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                return (
                  <Chip
                    key={cat.id}
                    label={cat.name}
                    clickable
                    onClick={() => setSelectedCategory(cat.id)}
                    sx={{ 
                      fontWeight: 700, 
                      px: 0.5, 
                      borderRadius: '6px', 
                      bgcolor: isSelected ? '#6366f1' : '#f1f5f9',
                      color: isSelected ? 'white' : '#475569',
                      '&:hover': { bgcolor: isSelected ? '#4f46e5' : '#e2e8f0' },
                      transition: 'all 0.15s ease'
                    }}
                  />
                );
              })}
            </Box>
          </Box>
        </Stack>
      </Paper>

      {/* Main Table */}
      <Paper sx={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', overflow: 'hidden', bgcolor: 'white' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 420px)' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc', color: '#64748b', textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>{isAr ? 'المنتج' : 'Product'}</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc', color: '#64748b', textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>{isAr ? 'التصنيف' : 'Category'}</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc', color: '#64748b', textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>SKU</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc', color: '#64748b', textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>{isAr ? 'الباركود' : 'Barcode'}</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc', color: '#64748b', textTransform: 'uppercase', fontSize: 11, letterSpacing: 1, textAlign: 'center' }}>{isAr ? 'الحالة' : 'Status'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 10 }}><span className="loader loader-dark" /></TableCell></TableRow>
              ) : filtered?.length === 0 ? (
                <TableRow><TableCell colSpan={5} align="center" sx={{ py: 10 }}><Typography color="text.secondary">{isAr ? 'لا توجد نتائج مطابقة' : 'No matching results found'}</Typography></TableCell></TableRow>
              ) : (
                filtered?.map((p) => (
                  <TableRow key={p.id} hover sx={{ '&:last-child td': { border: 0 } }}>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2" fontWeight={700} color="#1e293b">{p.name}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                        {p.category?.name || <span style={{ color: '#cbd5e1', fontSize: '13px' }}>{isAr ? 'بدون تصنيف' : 'Uncategorized'}</span>}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="caption" sx={{ bgcolor: '#f1f5f9', px: 1, py: 0.3, borderRadius: 1, fontWeight: 700, color: '#475569' }}>{p.sku}</Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Box display="flex" alignItems="center" gap={1.5}>
                        <QrCode sx={{ color: p.barcode ? '#3b82f6' : '#cbd5e1', fontSize: 20 }} />
                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 800, color: p.barcode ? '#0f172a' : '#94a3b8', letterSpacing: 1 }}>
                          {p.barcode || '—'}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell align="center" sx={{ py: 1.5 }}>
                      {p.barcode ? (
                        <Tooltip title={isAr ? 'جاهز للتصدير والطباعة' : 'Ready for export and print'}>
                          <CheckCircle sx={{ color: '#10b981', fontSize: 20 }} />
                        </Tooltip>
                      ) : (
                        <Tooltip title={isAr ? 'لا يوجد باركود حالي' : 'No current barcode'}>
                          <WarningAmber sx={{ color: '#f59e0b', fontSize: 20 }} />
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
