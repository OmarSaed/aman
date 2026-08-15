// frontend/src/features/reports/LowStockReport.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  Box, Typography, Paper, Checkbox, Button, 
  Stack, CircularProgress, IconButton, Tooltip,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import { ArrowLeft, ShoppingCart, Package, AlertTriangle } from 'lucide-react';
import { productsService } from '../../services/products.service';
import { formatCurrency } from '../../utils/format';

export default function LowStockReport() {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState([]);

  const { data, isLoading } = useQuery({
    queryKey: ['products-low-stock'],
    queryFn: () => productsService.list({ limit: 1000 }).then(r => {
       const all = r.data.data || [];
       // Filter for products where total stock across warehouses is low
       // Or more specifically, products with any stock item <= 10
       return all.filter(p => p.stocks?.some(s => s.quantity <= 10));
    })
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) setSelectedIds(data.map(p => p.id));
    else setSelectedIds([]);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleCreatePO = () => {
    if (selectedIds.length === 0) return;
    // Navigate to PO creation with selected product IDs
    navigate('/suppliers/purchases/new', { state: { initialProductIds: selectedIds } });
  };

  if (isLoading) return <Box p={10} textAlign="center"><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 4, bgcolor: '#f8fafc', minHeight: '100vh' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <IconButton onClick={() => navigate('/reports')}>
            <ArrowLeft />
          </IconButton>
          <Box>
            <Typography variant="h4" fontWeight={900}>{data?.length} Low Stock SKUs</Typography>
            <Typography variant="body2" color="text.secondary">Select items to restock via Purchase Order</Typography>
          </Box>
        </Stack>
        
        <Button 
          variant="contained" 
          startIcon={<ShoppingCart />}
          disabled={selectedIds.length === 0}
          onClick={handleCreatePO}
          sx={{ borderRadius: 2, px: 4, py: 1.5, fontWeight: 800 }}
        >
          Add {selectedIds.length} to New PO
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 3, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox 
                  indeterminate={selectedIds.length > 0 && selectedIds.length < data.length}
                  checked={data.length > 0 && selectedIds.length === data.length}
                  onChange={handleSelectAll}
                />
              </TableCell>
              <TableCell>Product</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="center">Current Stock</TableCell>
              <TableCell align="right">Cost Price</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.map((p) => {
              const totalStock = p.stocks?.reduce((s, st) => s + st.quantity, 0) || 0;
              return (
                <TableRow key={p.id} hover selected={selectedIds.includes(p.id)}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Box sx={{ p: 1, bgcolor: '#fff7ed', borderRadius: 2 }}>
                        <Package size={20} color="#f97316" />
                      </Box>
                      <Typography variant="body2" fontWeight={700}>{p.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell><Typography variant="caption" fontWeight={600} color="text.secondary">{p.sku}</Typography></TableCell>
                  <TableCell>{p.category?.name}</TableCell>
                  <TableCell align="center">
                    <Stack direction="row" spacing={1} justifyContent="center" alignItems="center">
                       <Typography variant="body2" fontWeight={900} color="error.main">{totalStock}</Typography>
                       <AlertTriangle size={14} color="#ef4444" />
                    </Stack>
                  </TableCell>
                  <TableCell align="right">{formatCurrency(p.costPrice)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
