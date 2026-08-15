// frontend/src/features/products/BrandsList.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { 
  Box, Typography, Button, TextField, 
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, CircularProgress, Stack, Pagination, MenuItem
} from '@mui/material';
import { Add, Edit, Delete, BrandingWatermark } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { productsService } from '../../services/products.service';
import { ConfirmModal } from '../../components/ui/Modal';
import Can from '../auth/Can';

const BrandFormDialog = ({ open, brand, onClose, onSuccess }) => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const isEdit = !!brand;

  const [formData, setFormData] = useState({
    name: brand?.name || '',
    description: brand?.description || ''
  });

  const mut = useMutation({
    mutationFn: (data) => isEdit ? productsService.updateBrand(brand.id, data) : productsService.createBrand(data),
    onSuccess: () => {
      toast.success(isAr ? 'تم حفظ الماركة بنجاح' : 'Brand record updated');
      onSuccess();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error processing request')
  });

  const handleSubmit = (e) => {
    e.preventDefault(); 
    mut.mutate(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '10px' } }}>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {isEdit ? (isAr ? 'تعديل بيانات الماركة' : 'Refine Brand') : (isAr ? 'تسجيل ماركة جديدة' : 'New Brand Entry')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
             label={isAr ? 'اسم الماركة' : 'Brand Legal Name'}
             value={formData.name}
             onChange={e => setFormData(p => ({ ...p, name: e.target.value }))}
             fullWidth
             required
             InputProps={{ sx: { borderRadius: '10px' } }}
          />
          <TextField
             label={isAr ? 'لمحة وصفية' : 'Summary'}
             value={formData.description}
             onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
             fullWidth
             multiline
             rows={2}
             InputProps={{ sx: { borderRadius: '10px' } }}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2.5 }}>
        <Button onClick={onClose} color="inherit">{isAr ? 'إلغاء' : 'Cancel'}</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={mut.isPending} sx={{ borderRadius: '8px' }}>
          {mut.isPending ? '...' : (isAr ? 'تأكيد الحفظ' : 'Confirm Save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default function BrandsList() {
  const { i18n } = useTranslation();
  const qc = useQueryClient();
  const isAr = i18n.language === 'ar';

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [formOpen, setFormOpen] = useState(false);
  const [editBrand, setEditBrand] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const params = { page, limit };

  const { data, isLoading } = useQuery({
    queryKey: ['brands', params],
    queryFn: () => productsService.listBrands(params).then(r => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => productsService.deleteBrand(id),
    onSuccess: () => {
      toast.success(isAr ? 'تم حذف الماركة' : 'Brand removed');
      qc.invalidateQueries(['brands']);
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error deleting brand')
  });

  const brands = data?.data || [];
  const pagination = data?.pagination;

  return (
    <Box sx={{ width: '100%', animate: 'fade 0.5s ease' }}>
      <Paper sx={{ mb: 4, overflow: 'hidden', borderRadius: '10px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc' }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <BrandingWatermark color="primary" />
            <Typography variant="h6" fontWeight={800}>{isAr ? 'قائمة الماركات المسجلة' : 'Registered Brands'}</Typography>
          </Box>
          <Can permission="inventory:create-products">
            <Button 
              variant="contained" 
              size="small" 
              sx={{ borderRadius: '8px' }}
              onClick={() => { setEditBrand(null); setFormOpen(true); }}
            >
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Add sx={{ fontSize: 18 }} />
                <Typography variant="button" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                   {isAr ? 'إضافة ماركة' : 'New Brand'}
                </Typography>
              </Stack>
            </Button>
          </Can>
        </Box>

        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>{isAr ? 'الماركة' : 'Brand name'}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{isAr ? 'المواصفات' : 'Context'}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{isAr ? 'إجراءات' : 'Controls'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={3} align="center" sx={{ py: 6 }}><CircularProgress size={24} /></TableCell></TableRow>
              ) : brands.length === 0 ? (
                <TableRow><TableCell colSpan={3} align="center" sx={{ py: 6, color: 'text.secondary' }}>{isAr ? 'لا توجد ماركات' : 'Empty Repository'}</TableCell></TableRow>
              ) : brands.map(b => (
                <TableRow key={b.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{b.name}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{b.description || '—'}</TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Can permission="inventory:update-products">
                        <IconButton size="small" color="primary" onClick={() => { setEditBrand(b); setFormOpen(true); }}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Can>
                      <Can permission="inventory:delete-products">
                        <IconButton size="small" color="error" onClick={() => setDeleteId(b.id)}>
                          <Delete fontSize="small" />
                        </IconButton>
                      </Can>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
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

      {formOpen && (
        <BrandFormDialog 
          open={formOpen}
          brand={editBrand} 
          onClose={() => setFormOpen(false)} 
          onSuccess={() => { qc.invalidateQueries(['brands']); setFormOpen(false); }} 
        />
      )}

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMut.mutate(deleteId)}
        loading={deleteMut.isPending}
        title={isAr ? 'حذف الماركة' : 'Confirm Brand Deletion'}
        message={isAr ? 'هل أنت متأكد من حذف هذه الماركة؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this brand? This action is permanent.'}
        confirmLabel={isAr ? 'حذف نهائي' : 'Delete Permanently'}
      />
    </Box>
  );
}
