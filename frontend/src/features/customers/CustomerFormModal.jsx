// frontend/src/features/customers/CustomerFormModal.jsx
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { customersService } from '../../services/customers.service';
import Modal from '../../components/ui/Modal';

const CustomerFormModal = ({ customer, onClose, onSuccess }) => {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  const isEdit = !!customer;

  const [formData, setFormData] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    address: customer?.address || '',
    type: customer?.type || 'NORMAL',
    isDefaultPos: customer?.isDefaultPos || false,
  });

  const mut = useMutation({
    mutationFn: (data) => isEdit ? customersService.update(customer.id, data) : customersService.create(data),
    onSuccess: () => {
      toast.success(isAr ? 'تم الحفظ بنجاح' : 'Saved successfully');
      onSuccess();
    },
    onError: (e) => toast.error(e.response?.data?.message || (isAr ? 'خطأ أثناء الحفظ' : 'Error saving'))
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    mut.mutate(formData);
  };

  return (
    <Modal 
      isOpen={true} 
      title={isEdit ? (isAr ? 'تعديل بيانات العميل' : 'Edit Customer') : (isAr ? 'إضافة عميل جديد' : 'Add New Customer')} 
      onClose={onClose} 
      size="sm"
    >
      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-4">
        <div className="form-group">
          <label className="label">{isAr ? 'الاسم' : 'Name'}</label>
          <input required type="text" className="input" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="label">{isAr ? 'الهاتف' : 'Phone'}</label>
          <input type="text" className="input" value={formData.phone} onChange={e => setFormData(p => ({ ...p, phone: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="label">{isAr ? 'نوع العميل' : 'Customer Type'}</label>
          <select 
            className="select" 
            value={formData.type} 
            onChange={e => setFormData(p => ({ ...p, type: e.target.value }))}
          >
            <option value="NORMAL">{isAr ? 'عادي' : 'Normal'}</option>
            <option value="WHOLESALE">{isAr ? 'جملة' : 'Wholesale'}</option>
          </select>
        </div>
        <div className="form-group">
          <label className="label">{isAr ? 'البريد الإلكتروني' : 'Email'}</label>
          <input type="email" className="input" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} />
        </div>
        <div className="form-group">
          <label className="label">{isAr ? 'العنوان' : 'Address'}</label>
          <textarea className="input" rows="2" value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} />
        </div>

        <div className="form-group flex items-center gap-2 mt-2">
          <input 
            type="checkbox" 
            id="isDefaultPos" 
            checked={formData.isDefaultPos} 
            onChange={e => setFormData(p => ({ ...p, isDefaultPos: e.target.checked }))} 
            className="w-4 h-4 cursor-pointer"
          />
          <label htmlFor="isDefaultPos" className="label cursor-pointer !mb-0">
            {isAr ? 'تعيين كعميل افتراضي لنقطة البيع (POS)' : 'Set as Default POS Customer'}
          </label>
        </div>
        
        <div className="flex justify-end gap-3 mt-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{isAr ? 'إلغاء' : 'Cancel'}</button>
          <button type="submit" className="btn btn-primary" disabled={mut.isPending}>
            {mut.isPending ? '...' : (isAr ? 'حفظ' : 'Save')}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CustomerFormModal;
