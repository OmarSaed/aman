// frontend/src/features/products/MinStockList.jsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { 
  Box, Typography, TextField, Button, Paper, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Stack, Alert
} from '@mui/material';
import { 
  Save, Search, Inventory2
} from '@mui/icons-material';
import { productsService } from '../../services/products.service';
import toast from 'react-hot-toast';

export default function MinStockList() {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [edits, setEdits] = useState({});

  const { data: products, isLoading } = useQuery({
    queryKey: ['products_all_minstock'],
    queryFn: () => productsService.list({ limit: 1000 }).then(r => Array.isArray(r.data?.data) ? r.data.data : (r.data?.data?.data || []))
  });

  // Initialize edits state with current values
  useEffect(() => {
    if (products) {
      const initialEdits = {};
      products.forEach(p => {
        initialEdits[p.id] = p.lowStockThreshold || 1;
      });
      setEdits(initialEdits);
    }
  }, [products]);

  const mutSave = useMutation({
    mutationFn: (updates) => productsService.batchUpdatePrices(updates),
    onSuccess: () => {
      toast.success(isAr ? 'تم تحديث التنبيهات بنجاح' : 'Minimum stock alerts updated successfully');
      qc.invalidateQueries(['products_all_minstock']);
      qc.invalidateQueries(['products']);
    },
    onError: () => toast.error(isAr ? 'حدث خطأ' : 'Error saving stock alerts')
  });

  const handleSave = () => {
    const updates = [];
    products.forEach(p => {
      if (edits[p.id] !== undefined && edits[p.id] !== (p.lowStockThreshold || 1)) {
        updates.push({
          id: p.id,
          lowStockThreshold: parseInt(edits[p.id]) || 1
        });
      }
    });

    if (updates.length === 0) {
      toast.error(isAr ? 'لم تقم بإجراء أي تعديلات' : 'No changes made');
      return;
    }

    mutSave.mutate(updates);
  };

  const filtered = products?.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.sku.toLowerCase().includes(search.toLowerCase())
  );

  const pendingChanges = products ? products.filter(p => edits[p.id] !== undefined && edits[p.id] !== (p.lowStockThreshold || 1)).length : 0;

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={800} gutterBottom sx={{ letterSpacing: -0.5 }}>
            {isAr ? 'تحديث الحد الأدنى للمخزون' : 'Bulk Min Stock Update'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isAr ? 'قم بتعديل تنبيه نقص المخزون لجميع المنتجات وحفظها دفعة واحدة.' : 'Update the low stock alert threshold for all products simultaneously.'}
          </Typography>
        </Box>

        <Stack direction="row" spacing={2}>
          <Button 
            variant="contained" 
            color="primary"
            startIcon={<Save />} 
            onClick={handleSave}
            disabled={mutSave.isPending || pendingChanges === 0}
            sx={{ fontWeight: 800 }}
          >
            {isAr ? `حفظ التعديلات (${pendingChanges})` : `Save Changes (${pendingChanges})`}
          </Button>
        </Stack>
      </Box>

      {pendingChanges > 0 && (
        <Alert 
          severity="info" 
          sx={{ mb: 3, borderRadius: '10px', border: '1px solid #bfdbfe', bgcolor: '#eff6ff', color: '#1e3a8a' }}
        >
          {isAr 
            ? `لديك ${pendingChanges} منتجات معدلة لم يتم حفظها.` 
            : `You have ${pendingChanges} unsaved changes.`}
        </Alert>
      )}

      <Paper sx={{ borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)', overflow: 'hidden', bgcolor: 'white' }}>
        <Box p={2.5} borderBottom="1px solid #f1f5f9" bgcolor="#ffffff">
          <TextField
            size="small"
            placeholder={isAr ? 'ابحث بالاسم أو SKU...' : 'Search by name or SKU...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: { xs: '100%', sm: 400 }, '& .MuiOutlinedInput-root': { borderRadius: '10px', bgcolor: '#f8fafc', '& fieldset': { borderColor: '#e2e8f0' } } }}
            InputProps={{
              startAdornment: <Search sx={{ mr: 1, color: '#94a3b8', fontSize: 20 }} />
            }}
          />
        </Box>

        <TableContainer sx={{ maxHeight: 'calc(100vh - 400px)' }}>
          <Table stickyHeader>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc', color: '#64748b', textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>{isAr ? 'المنتج' : 'Product'}</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc', color: '#64748b', textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>SKU</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc', color: '#64748b', textTransform: 'uppercase', fontSize: 11, letterSpacing: 1 }}>{isAr ? 'الحد الأدنى الحالي' : 'Current Min Stock'}</TableCell>
                <TableCell sx={{ fontWeight: 800, bgcolor: '#f8fafc', color: '#64748b', textTransform: 'uppercase', fontSize: 11, letterSpacing: 1, width: 200 }}>{isAr ? 'الحد الأدنى الجديد' : 'New Min Stock'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 10 }}><span className="loader loader-dark" /></TableCell></TableRow>
              ) : filtered?.length === 0 ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 10 }}><Typography color="text.secondary">{isAr ? 'لا توجد نتائج' : 'No results found'}</Typography></TableCell></TableRow>
              ) : (
                filtered?.map((p) => {
                  const currentVal = p.lowStockThreshold || 1;
                  const editedVal = edits[p.id] !== undefined ? edits[p.id] : currentVal;
                  const isChanged = editedVal !== currentVal;
                  
                  return (
                    <TableRow key={p.id} hover sx={{ '&:last-child td': { border: 0 }, bgcolor: isChanged ? '#f0fdf4' : 'inherit' }}>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" fontWeight={700} color="#1e293b">{p.name}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="caption" sx={{ bgcolor: '#f1f5f9', px: 1, py: 0.3, borderRadius: 1, fontWeight: 700, color: '#475569' }}>{p.sku}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.5 }}>
                        <Typography variant="body2" fontWeight={700} color="text.secondary">{currentVal}</Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1 }}>
                        <TextField
                          size="small"
                          type="number"
                          value={editedVal}
                          onChange={(e) => setEdits(prev => ({ ...prev, [p.id]: parseInt(e.target.value) || 0 }))}
                          sx={{ width: '100px', bgcolor: 'white' }}
                          inputProps={{ min: 0 }}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
