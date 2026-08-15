// frontend/src/features/expenses/CategoryManagerModal.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Tag, Plus, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { expensesService } from '../../services/expenses.service';
import Modal from '../../components/ui/Modal';
import { Button, Grid, CircularProgress } from '@mui/material';

export default function CategoryManagerModal({ onClose }) {
  const { i18n } = useTranslation();
  const qc = useQueryClient();
  const isAr = i18n.language === 'ar';

  const [newName, setNewName] = useState('');
  const [newNameAr, setNewNameAr] = useState('');

  const { data: categories, isLoading } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => expensesService.listCategories().then(r => r.data),
  });

  const mutCreate = useMutation({
    mutationFn: (data) => expensesService.createCategory(data),
    onSuccess: () => {
      toast.success(isAr ? 'تمت إضافة الفئة' : 'Category added');
      setNewName('');
      setNewNameAr('');
      qc.invalidateQueries(['expense-categories']);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error adding category')
  });

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newName) return toast.error(isAr ? 'الاسم مطلوب' : 'Name is required');
    mutCreate.mutate({ name: newName, nameAr: newNameAr });
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={isAr ? 'إدارة فئات المصروفات' : 'Expense Categories'}
      size="sm"
      footer={<Button onClick={onClose} color="inherit">{isAr ? 'إغلاق' : 'Close'}</Button>}
    >
      <div className="p-2 space-y-4">
        {/* Add New Category */}
        <form onSubmit={handleAdd} className="bg-slate-50 p-4 rounded-xl border border-slate-100 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <input 
                type="text" className="input h-10 text-xs" 
                placeholder="English Name" 
                value={newName} 
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <input 
                type="text" className="input h-10 text-xs text-right" 
                placeholder="الاسم بالعربية" 
                value={newNameAr} 
                onChange={(e) => setNewNameAr(e.target.value)}
              />
            </div>
          </div>
          <Button 
            fullWidth 
            variant="contained" 
            size="small" 
            onClick={handleAdd}
            disabled={mutCreate.isPending}
            startIcon={<Plus size={14} />}
          >
            {isAr ? 'إضافة فئة جديدة' : 'Add New Category'}
          </Button>
        </form>

        {/* Categories List */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {isLoading ? (
            <div className="text-center py-4"><CircularProgress size={24} /></div>
          ) : categories?.data?.length === 0 ? (
            <div className="text-center py-6 text-xs text-slate-400 font-bold uppercase tracking-widest">{isAr ? 'لا توجد فئات' : 'No categories found'}</div>
          ) : (
            categories.data.map(cat => (
              <div key={cat.id} className="flex items-center justify-between p-3 bg-white border border-slate-100 rounded-xl hover:border-slate-200 transition-all">
                <div>
                  <div className="text-sm font-bold text-slate-700">{cat.name}</div>
                  <div className="text-[10px] text-slate-400 font-bold">{cat.nameAr || '—'}</div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="badge badge-gray text-[10px] px-2 py-1">
                    {cat._count.expenses} {isAr ? 'مصروفات' : 'items'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="bg-amber-50 border border-amber-100 p-3 rounded-lg flex gap-3">
          <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
            {isAr ? 'يتم استخدام هذه الفئات لتصنيف مصروفات التشغيل (مثل الإيجار، الرواتب، الكهرباء).' : 'These categories are used to classify operating expenses (e.g., Rent, Salaries, Electricity).'}
          </p>
        </div>
      </div>
    </Modal>
  );
}
