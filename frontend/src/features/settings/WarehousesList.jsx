// frontend/src/features/settings/WarehousesList.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { 
  Box, Paper, Table, TableBody, TableCell, TableContainer, 
  TableHead, TableRow, Typography, Button, IconButton, 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  TextField, Stack, Chip, CircularProgress, MenuItem
} from '@mui/material';
import { Add, Delete, Store, Inventory } from '@mui/icons-material';
import { productsService } from '../../services/products.service';
import { toast } from 'react-hot-toast';

export default function WarehousesList() {
  const { t } = useTranslation('settings');
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', location: '', type: 'Warehouse' });

  const { data: warehouses, isLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => productsService.listWarehouses()
  });

  const mutCreate = useMutation({
    mutationFn: (data) => productsService.createWarehouse(data),
    onSuccess: () => {
      qc.invalidateQueries(['warehouses']);
      toast.success(t('warehouse.added'));
      setOpen(false);
      setFormData({ name: '', location: '', type: 'WAREHOUSE' });
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error')
  });

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name) return;
    mutCreate.mutate(formData);
  };

  if (isLoading) return <CircularProgress sx={{ m: 5 }} />;

  return (
    <Box className="animate-fade">
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight={800} color="var(--text-primary)">
          {t('warehouse.title')}
        </Typography>
        <button 
          className="btn btn-primary" 
          onClick={handleOpen}
          style={{ height: 40, borderRadius: '10px' }}
        >
          <Add sx={{ mr: 1, fontSize: 20 }} />
          {t('warehouse.addNew')}
        </button>
      </Box>

      <Box className="card" sx={{ overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: 'var(--slate-50)' }}>
                <TableCell sx={{ fontWeight: 800, color: 'var(--slate-700)', py: 2 }}>{t('warehouse.name')}</TableCell>
                <TableCell sx={{ fontWeight: 800, color: 'var(--slate-700)', py: 2 }}>{t('warehouse.type')}</TableCell>
                <TableCell sx={{ fontWeight: 800, color: 'var(--slate-700)', py: 2 }}>{t('warehouse.locationCol')}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 800, color: 'var(--slate-700)', py: 2 }}>{t('warehouse.actions')}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {warehouses?.data?.data?.map((item) => (
                <TableRow key={item.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell>
                    <Stack direction="row" alignItems="center" gap={1.5}>
                      <Box sx={{ 
                        p: 1, 
                        borderRadius: '10px', 
                        bgcolor: item.type === 'SHOWROOM' ? 'var(--secondary-50)' : 'var(--primary-50)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        {item.type === 'SHOWROOM' ? <Store fontSize="small" sx={{ color: 'var(--secondary-600)' }} /> : <Inventory fontSize="small" sx={{ color: 'var(--primary-600)' }} />}
                      </Box>
                      <Typography variant="body2" fontWeight={700} color="var(--slate-800)">{item.name}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip 
                      label={item.type === 'Showroom' ? t('warehouse.typeShowroom') : t('warehouse.typeWarehouse')} 
                      size="small"
                      sx={{ 
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        borderRadius: '6px',
                        bgcolor: item.type === 'Showroom' ? 'var(--secondary-50)' : 'var(--primary-50)',
                        color: item.type === 'Showroom' ? 'var(--secondary-700)' : 'var(--primary-700)',
                        border: 'none'
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ color: 'var(--slate-600)' }}>{item.location || '-'}</TableCell>
                  <TableCell align="right">
                    <IconButton size="small" sx={{ color: 'var(--error)' }}><Delete fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Dialog 
        open={open} 
        onClose={handleClose} 
        maxWidth="xs" 
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 800, fontSize: '1.25rem' }}>{t('warehouse.addDialog')}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <Stack spacing={2.5} sx={{ mt: 1 }}>
              <TextField 
                label={t('warehouse.nodeName')} 
                required 
                fullWidth 
                autoFocus
                size="small"
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />
              <TextField 
                select
                label={t('warehouse.nodeType')} 
                required 
                fullWidth
                size="small"
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value})}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              >
                <MenuItem value="Warehouse">{t('warehouse.typeWarehouse')}</MenuItem>
                <MenuItem value="Showroom">{t('warehouse.typeShowroom')}</MenuItem>
              </TextField>
              <TextField 
                label={t('warehouse.location')} 
                fullWidth
                size="small"
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ p: 2.5, gap: 1 }}>
            <Button onClick={handleClose} color="inherit" sx={{ fontWeight: 700 }}>{t('common:cancel', 'Cancel')}</Button>
            <button type="submit" className="btn btn-primary" disabled={mutCreate.isPending} style={{ height: 40, px: 4 }}>
              {mutCreate.isPending ? '...' : t('warehouse.save')}
            </button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
