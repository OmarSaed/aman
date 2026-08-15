// frontend/src/features/inventory/TransferModal.jsx
import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { inventoryService } from '../../services/inventory.service';
import { productsService } from '../../services/products.service';
import Modal from '../../components/ui/Modal';
import { ArrowRight } from 'lucide-react';

export default function TransferModal({ warehouses, onClose, onSuccess }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';

  const [formData, setFormData] = useState({
    productId: '',
    fromWarehouseId: '',
    toWarehouseId: '',
    quantity: 1,
    notes: ''
  });

  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    // Load a few products for the dropdown (better to use async select in real prod)
    setLoadingProducts(true);
    productsService.list({ limit: 50 }).then(r => {
      setProducts(r.data.data);
      setLoadingProducts(false);
    });
  }, []);

  const mut = useMutation({
    mutationFn: (data) => inventoryService.transferStock(data),
    onSuccess: () => {
      toast.success(isAr ? 'تم النقل بنجاح' : 'Transfer successful');
      onSuccess();
    },
    onError: (e) => toast.error(e.response?.data?.message || (isAr ? 'حدث خطأ' : 'Error transferring stock'))
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(p => ({ ...p, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    mut.mutate({ ...formData, quantity: parseInt(formData.quantity) });
  };

  return (
    <Modal title={isAr ? 'نقل المخزون' : 'Transfer Stock'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-5">
        
        <div className="form-group">
          <label className="label">{isAr ? 'المنتج' : 'Product'}</label>
          <select required name="productId" className="input select" value={formData.productId} onChange={handleChange}>
            <option value="">{isAr ? 'اختر منتجاً...' : 'Select a product...'}</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>)}
          </select>
          {loadingProducts && <span className="text-xs text-gray-400">Loading...</span>}
        </div>

        <div className="flex gap-4 items-center">
          <div className="form-group flex-1">
            <label className="label text-danger">{isAr ? 'من مستودع (المصدر)' : 'From (Source)'}</label>
            <select required name="fromWarehouseId" className="input select" value={formData.fromWarehouseId} onChange={handleChange}>
              <option value="">{isAr ? 'اختر...' : 'Select...'}</option>
              {warehouses.map(w => <option key={w.id} value={w.id} disabled={w.id === formData.toWarehouseId}>{w.name}</option>)}
            </select>
          </div>
          <ArrowRight className="mt-6 text-gray-400 flex-shrink-0" />
          <div className="form-group flex-1">
            <label className="label text-success">{isAr ? 'إلى مستودع (الوجهة)' : 'To (Destination)'}</label>
            <select required name="toWarehouseId" className="input select" value={formData.toWarehouseId} onChange={handleChange}>
              <option value="">{isAr ? 'اختر...' : 'Select...'}</option>
              {warehouses.map(w => <option key={w.id} value={w.id} disabled={w.id === formData.fromWarehouseId}>{w.name}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="label">{isAr ? 'الكمية المراد نقلها' : 'Transfer Quantity'}</label>
            <input required type="number" min="1" name="quantity" className="input" style={{ fontSize: 18, fontWeight: 600 }} value={formData.quantity} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="label">{isAr ? 'ملاحظات (اختياري)' : 'Notes (Optional)'}</label>
            <input type="text" name="notes" className="input" placeholder="..." value={formData.notes} onChange={handleChange} />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4 border-t pt-4">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{isAr ? 'إلغاء' : 'Cancel'}</button>
          <button type="submit" className="btn btn-primary" disabled={mut.isPending || formData.fromWarehouseId === formData.toWarehouseId}>
            {mut.isPending ? (isAr ? 'جاري النقل...' : 'Transferring...') : (isAr ? 'تنفيذ النقل' : 'Confirm Transfer')}
          </button>
        </div>
      </form>
    </Modal>
  );
}
