// frontend/src/features/products/CategoriesList.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { 
  Box, Typography, Button, TextField, MenuItem, 
  Dialog, DialogTitle, DialogContent, DialogActions,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, IconButton, CircularProgress, Chip, Stack, Pagination
} from '@mui/material';
import { Add, Edit, Delete, AccountTree } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { productsService } from '../../services/products.service';
import { ConfirmModal } from '../../components/ui/Modal';
import Can from '../auth/Can';

const CategoryFormDialog = ({ open, category, categories, onClose, onSuccess }) => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const isEdit = !!category;

  const [formData, setFormData] = useState({
    name: category?.name || '',
    description: category?.description || '',
    parentCategoryId: category?.parentCategoryId || ''
  });

  const mut = useMutation({
    mutationFn: (data) => isEdit ? productsService.updateCategory(category.id, data) : productsService.createCategory(data),
    onSuccess: () => {
      toast.success(isAr ? 'تم حفظ التصنيف بنجاح' : 'Category record updated');
      onSuccess();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error processing request')
  });

  const handleSubmit = (e) => {
    e.preventDefault(); 
    mut.mutate({ ...formData, parentCategoryId: formData.parentCategoryId || null });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '10px' } }}>
      <DialogTitle sx={{ fontWeight: 800 }}>
        {isEdit ? (isAr ? 'تعديل بيانات التصنيف' : 'Refine Category') : (isAr ? 'تسجيل تصنيف جديد' : 'New Category Entry')}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
             label={isAr ? 'اسم القسم' : 'Category Title'}
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
          <TextField
             select
             label={isAr ? 'القسم الرئيسي' : 'Parent Reference'}
             value={formData.parentCategoryId}
             onChange={e => setFormData(p => ({ ...p, parentCategoryId: e.target.value }))}
             fullWidth
             SelectProps={{ sx: { borderRadius: '10px' } }}
          >
            <MenuItem value="">{isAr ? 'لا يوجد (قسم رئيسي)' : 'Root Level (No Parent)'}</MenuItem>
            {categories.filter(c => c.id !== category?.id).map(c => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </TextField>
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

export default function CategoriesList() {
  const { i18n } = useTranslation();
  const qc = useQueryClient();
  const isAr = i18n.language === 'ar';

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [formOpen, setFormOpen] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const params = { page, limit };

  const { data, isLoading } = useQuery({
    queryKey: ['categories', params],
    queryFn: () => productsService.listCategories(params).then(r => r.data),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => productsService.deleteCategory(id),
    onSuccess: () => {
      toast.success(isAr ? 'تم حذف التصنيف' : 'Category removed');
      qc.invalidateQueries(['categories']);
      setDeleteId(null);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error deleting category')
  });

  const categories = data?.data || [];
  const pagination = data?.pagination;

  return (
    <Box sx={{ width: '100%', animate: 'fade 0.5s ease' }}>
      <Paper sx={{ mb: 4, overflow: 'hidden', borderRadius: '10px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
        <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#f8fafc' }}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <AccountTree color="primary" />
            <Typography variant="h6" fontWeight={800}>{isAr ? 'شجرة التصنيفات' : 'Categorization Tree'}</Typography>
          </Box>
          <Can permission="inventory:create-products">
            <Button 
              variant="contained" 
              size="small" 
              sx={{ borderRadius: '8px' }}
              onClick={() => { setEditCategory(null); setFormOpen(true); }}
            >
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Add sx={{ fontSize: 18 }} />
                <Typography variant="button" sx={{ fontWeight: 700, fontSize: '0.75rem' }}>
                  {isAr ? 'إضافة قسم' : 'New Category'}
                </Typography>
              </Stack>
            </Button>
          </Can>
        </Box>

        <TableContainer>
          <Table>
            <TableHead sx={{ bgcolor: '#f8fafc' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 700 }}>{isAr ? 'التصنيف' : 'Label'}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{isAr ? 'المواصفات' : 'Context'}</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>{isAr ? 'القسم الأب' : 'Root Link'}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>{isAr ? 'إجراءات' : 'Controls'}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6 }}><CircularProgress size={24} /></TableCell></TableRow>
              ) : categories.length === 0 ? (
                <TableRow><TableCell colSpan={4} align="center" sx={{ py: 6, color: 'text.secondary' }}>{isAr ? 'لا توجد بيانات' : 'Empty Repository'}</TableCell></TableRow>
              ) : categories.map(c => (
                <TableRow key={c.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{c.name}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{c.description || '—'}</TableCell>
                  <TableCell>
                    {c.parentCategory?.name ? (
                      <Chip label={c.parentCategory.name} size="small" variant="outlined" color="primary" sx={{ borderRadius: '10px' }} />
                    ) : <Typography variant="caption" sx={{ opacity: 0.3 }}>N/A</Typography>}
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                      <Can permission="inventory:update-products">
                        <IconButton size="small" color="primary" onClick={() => { setEditCategory(c); setFormOpen(true); }}>
                          <Edit fontSize="small" />
                        </IconButton>
                      </Can>
                      <Can permission="inventory:delete-products">
                        <IconButton size="small" color="error" onClick={() => setDeleteId(c.id)}>
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
        <CategoryFormDialog 
          open={formOpen}
          category={editCategory} 
          categories={categories}
          onClose={() => setFormOpen(false)} 
          onSuccess={() => { qc.invalidateQueries(['categories']); setFormOpen(false); }} 
        />
      )}

      <ConfirmModal 
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteMut.mutate(deleteId)}
        loading={deleteMut.isPending}
        title={isAr ? 'حذف التصنيف' : 'Confirm Category Deletion'}
        message={isAr ? 'هل أنت متأكد من حذف هذا التصنيف؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this category? This action is permanent.'}
        confirmLabel={isAr ? 'حذف نهائي' : 'Delete Permanently'}
      />
    </Box>
  );
}
