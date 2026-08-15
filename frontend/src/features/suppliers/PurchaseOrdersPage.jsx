// frontend/src/features/suppliers/PurchaseOrdersPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { FileText, Plus, CheckCircle, PackageCheck, AlertCircle, Pencil, Trash2, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { suppliersService } from '../../services/suppliers.service';
import { inventoryService } from '../../services/inventory.service';
import Badge from '../../components/ui/Badge';
import Modal from '../../components/ui/Modal';
import Can from '../auth/Can';
import POImportModal from './POImportModal';
import { Upload } from 'lucide-react';
import { Stack } from '@mui/material';
import { exportToCSV } from '../../utils/export';

// ── Receive Modal ───────────────────────────────────────────────────────────
function POReceiveModal({ po, onClose, onSuccess }) {
  const { i18n } = useTranslation();
  const isAr = i18n.language === 'ar';
  
  const [warehouseId, setWarehouseId] = useState('');
  const [receiveItems, setReceiveItems] = useState(
    po.items.map(i => ({ itemId: i.id, productId: i.productId, requested: i.quantityOrdered, received: i.quantityOrdered }))
  );

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => inventoryService.listWarehouses().then(r => r.data.data),
  });

  const mut = useMutation({
    mutationFn: (payload) => suppliersService.receiveOrder(po.id, payload),
    onSuccess: () => {
      toast.success(isAr ? 'تم الاستلام بنجاح' : 'Order received successfully');
      onSuccess();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error receiving PO')
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!warehouseId) return toast.error(isAr ? 'اختر المستودع' : 'Please select a warehouse');
    
    const payload = {
      warehouseId,
      receiveItems: receiveItems.map(item => ({
        itemId: item.itemId,
        quantityReceived: parseInt(item.received) || 0
      }))
    };
    mut.mutate(payload);
  };

  return (
    <Modal 
      isOpen={true}
      title={isAr ? `نقل للمستودع (PO: ${po.poNumber})` : `Receive Order (PO: ${po.poNumber})`} 
      onClose={onClose} 
      size="lg"
    >
      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-5">
        
        <div className="bg-blue-50 text-blue-800 p-4 rounded-md flex gap-3 text-sm" style={{ background: '#eff6ff', color: '#1e40af' }}>
          <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }}/>
          <div>
            <strong>{isAr ? 'حالة الاستلام:' : 'Receiving Status:'}</strong>
            <p>{isAr ? 'سيتم تحويل هذه الكميات إلى مستودع المخزون المختار مع تسجيل حركات واردة جديدة.' : 'These quantities will be added to the selected warehouse stock.'}</p>
          </div>
        </div>

        <div className="form-group border-b pb-4">
          <label className="label">{isAr ? 'المستودع المستلم' : 'Destination Warehouse'} *</label>
          <select required className="input select" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
            <option value="">{isAr ? 'اختر مستودع...' : 'Choose warehouse...'}</option>
            {warehouses?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </div>

        <table style={{ width: '100%' }}>
          <thead>
            <tr style={{ background: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              <th style={{ padding: 8, textAlign: isAr?'right':'left', fontSize: 13 }}>{isAr ? 'معرف العنصر' : 'Item ID'}</th>
              <th style={{ padding: 8, textAlign: isAr?'right':'left', fontSize: 13 }}>{isAr ? 'الكمية المطلوبة' : 'Requested'}</th>
              <th style={{ padding: 8, textAlign: isAr?'right':'left', fontSize: 13, width: 140 }}>{isAr ? 'الكمية المستلمة' : 'Received Qty'}</th>
            </tr>
          </thead>
          <tbody>
            {receiveItems.map((item, idx) => (
              <tr key={item.itemId} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px 8px', fontFamily: 'monospace', fontSize: 13 }}>{item.productId.substring(0,8)}...</td>
                <td style={{ padding: '12px 8px', fontWeight: 600 }}>{item.requested}</td>
                <td style={{ padding: '8px' }}>
                  <input type="number" min="0" max={item.requested} className="input" style={{ width: '100%', height: 36, padding: '0 8px' }}
                    value={item.received}
                    onChange={e => {
                      const newArr = [...receiveItems];
                      newArr[idx].received = e.target.value;
                      setReceiveItems(newArr);
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end gap-3 pt-4">
          <button type="button" className="btn btn-ghost" onClick={onClose}>{isAr ? 'إلغاء' : 'Cancel'}</button>
          <button type="submit" className="btn btn-primary bg-emerald-600 hover:bg-emerald-700" disabled={mut.isPending} style={{ background: '#059669', color: 'white', border: 'none' }}>
            <CheckCircle size={16}/> {mut.isPending ? '...' : (isAr ? 'تأكيد الاستلام' : 'Confirm Receipt')}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────
export default function PurchaseOrdersPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isAr = i18n.language === 'ar';

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [statusFilter, setStatusFilter] = useState('');
  const [receivePo, setReceivePo] = useState(null);
  const [showImport, setShowImport] = useState(false);

  const params = { page, limit, ...(statusFilter && { status: statusFilter }) };

  const { data, isLoading } = useQuery({
    queryKey: ['purchaseOrders', params],
    queryFn: () => suppliersService.listOrders(params).then(r => r.data),
  });

  const mutUpdateStatus = useMutation({
    mutationFn: ({ id, status }) => suppliersService.updateOrderStatus(id, status),
    onSuccess: () => {
      toast.success(isAr ? 'تم تحديث الحالة' : 'Status updated');
      qc.invalidateQueries(['purchaseOrders']);
      qc.invalidateQueries(['stock']);
    },
    onSettled: () => setPage(p => p), // Refresh current page
    onError: (e) => toast.error(e.response?.data?.message || 'Error updating status')
  });

  const mutDeletePo = useMutation({
    mutationFn: (id) => suppliersService.deleteOrder(id),
    onSuccess: () => {
      toast.success(isAr ? 'تم الحذف بنجاح' : 'Order deleted successfully');
      qc.invalidateQueries(['purchaseOrders']);
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Error deleting PO')
  });

  const handleDelete = (po) => {
    if (window.confirm(isAr ? `هل أنت متأكد من حذف أمر الشراء ${po.poNumber}؟ لا يمكن التراجع.` : `Delete PO ${po.poNumber}? This cannot be undone.`)) {
      mutDeletePo.mutate(po.id);
    }
  };

  const pos = data?.data || [];
  const pagination = data?.pagination;

  const handleExport = () => {
    if (pos.length === 0) return toast.error(isAr ? 'لا توجد بيانات للتصدير' : 'No data to export');
    const headers = [
      { key: 'poNumber', label: isAr ? 'رقم الطلب' : 'PO Number' },
      { key: 'supplier', label: isAr ? 'المورد' : 'Supplier' },
      { key: 'date', label: isAr ? 'تاريخ الطلب' : 'Date' },
      { key: 'totalAmount', label: isAr ? 'الإجمالي' : 'Total Amount' },
      { key: 'status', label: isAr ? 'الحالة' : 'Status' }
    ];
    const rows = pos.map(p => ({
      poNumber: p.poNumber,
      supplier: p.supplier?.name || '-',
      date: new Date(p.createdAt).toLocaleDateString(),
      totalAmount: p.totalAmount,
      status: p.status
    }));
    exportToCSV('purchase_orders', rows, headers);
  };

  const getStatusBadge = (status) => {
    const label = t(`purchaseOrderStatus.${status}`, status);
    switch (status) {
      case 'Draft': return <Badge variant="ghost">{label}</Badge>;
      case 'Sent': return <Badge variant="primary">{label}</Badge>;
      case 'Partial': return <Badge variant="warning">{label}</Badge>;
      case 'Received': return <Badge variant="success">{label}</Badge>;
      case 'Cancelled': return <Badge variant="danger">{label}</Badge>;
      case 'Returned': return <Badge variant="warning" style={{ background: '#fef3c7', color: '#92400e' }}>{label}</Badge>;
      default: return <Badge>{label}</Badge>;
    }
  };

  const handleStatusChange = (po, newStatus) => {
    if (newStatus === po.status) return;
    
    if (newStatus === 'Returned') {
      if (!window.confirm(isAr ? 'هل أنت متأكد من إرجاع هذا الطلب؟ سيتم خصم الكميات من المخزن.' : 'Are you sure you want to RETURN this PO? Stock will be reversed.')) return;
    }
    
    if (newStatus === 'Received' && po.status !== 'Received') {
      setReceivePo(po);
      return;
    }

    mutUpdateStatus.mutate({ id: po.id, status: newStatus });
  };


  return (
    <div className="animate-fade">
      <div className="page-header">
        <div className="page-header-left">
          <h1>{isAr ? 'أوامر الشراء (POs)' : 'Purchase Orders'}</h1>
          <p>{isAr ? 'تتبع طلبات التوريد وحالتها' : 'Track vendor material requests and receipts'}</p>
        </div>
        {/* Create new PO */}
        <Stack direction="row" spacing={2}>
          <button className="btn btn-outline" onClick={handleExport}>
            <Download size={16} />{isAr ? 'تصدير' : 'Export'}
          </button>
          <Can permission="orders:create-po">
            <button className="btn btn-outline" onClick={() => setShowImport(true)}>
              <Upload size={16} />{isAr ? 'استيراد من Excel' : 'Import Excel'}
            </button>
          </Can>
          <Can permission="orders:create-po">
            <button className="btn btn-primary" onClick={() => navigate('/orders/new')}>
              <Plus size={16} />{isAr ? 'أمر شراء جديد' : 'New PO'}
            </button>
          </Can>
        </Stack>
      </div>

      <div className="card mb-4" style={{ minWidth: 370 }}>
        <div style={{ padding: '14px 16px', display: 'flex', gap: 10 }}>
          <select className="select" style={{ width: 180 }} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
            <option value="">{isAr ? 'حالة الطلب: الكل' : 'All Statuses'}</option>
            <option value="Draft">{t('purchaseOrderStatus.Draft')}</option>
            <option value="Sent">{t('purchaseOrderStatus.Sent')}</option>
            <option value="Received">{t('purchaseOrderStatus.Received')}</option>
            <option value="Cancelled">{t('purchaseOrderStatus.Cancelled')}</option>
            <option value="Returned">{t('purchaseOrderStatus.Returned')}</option>
          </select>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{isAr ? 'رقم الطلب' : 'PO Number'}</th>
                <th>{isAr ? 'المورد' : 'Supplier'}</th>
                <th>{isAr ? 'تاريخ الطلب' : 'Created Date'}</th>
                <th>{isAr ? 'الإجمالي' : 'Total Amount'}</th>
                <th>{isAr ? 'الحالة' : 'Status'}</th>
                <th style={{ width: 100 }}>{isAr ? 'إجراءات' : 'Actions'}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ textAlign: 'center', padding: 40 }}><span className="loader loader-dark" style={{ margin: '0 auto', display: 'block' }}/></td></tr>
              ) : pos.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '12px' }}>
                    <div className="empty-state-icon"><FileText size={48} style={{ color: 'var(--text-tertiary)' }} /></div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-secondary)' }}>{isAr ? 'لا توجد طلبات شراء' : 'No purchase orders'}</h3>
                  </div>
                </td></tr>
              ) : pos.map(po => (
                <tr key={po.id}>
                  <td style={{ fontWeight: 600, fontFamily: 'monospace' }}>{po.poNumber}</td>
                  <td style={{ fontWeight: 500 }}>{po.supplier?.name || '—'}</td>
                  <td style={{ color: 'var(--text-secondary)' }}>{new Date(po.createdAt).toLocaleDateString()}</td>
                  <td style={{ fontWeight: 600, color: 'var(--primary)' }}>${parseFloat(po.totalAmount).toFixed(2)}</td>
                  <td>
                    <select 
                      className={`select-sm ${po.status === 'Received' ? 'text-success' : po.status === 'Cancelled' ? 'text-danger' : ''}`}
                      style={{ 
                        fontSize: 12, fontWeight: 700, padding: '2px 4px', height: 'auto', borderRadius: 4, 
                        border: '1px solid #e2e8f0', background: '#f8fafc', width: 110, cursor: 'pointer'
                      }}
                      value={po.status}
                      onChange={(e) => handleStatusChange(po, e.target.value)}
                      disabled={mutUpdateStatus.isPending || po.status === 'Returned'}
                    >
                      <option value="Draft">{t('purchaseOrderStatus.Draft')}</option>
                      <option value="Sent">{t('purchaseOrderStatus.Sent')}</option>
                      <option value="Partial">{t('purchaseOrderStatus.Partial')}</option>
                      <option value="Received" disabled={po.status === 'Returned'}>{t('purchaseOrderStatus.Received')}</option>
                      <option value="Cancelled">{t('purchaseOrderStatus.Cancelled')}</option>
                      <option value="Returned" disabled={po.status !== 'Received' && po.status !== 'Returned' && po.status !== 'Partial'}>{t('purchaseOrderStatus.Returned')}</option>
                    </select>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Can permission="orders:create-po">
                        <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, height: 'auto', background: '#f8fafc' }}
                          onClick={() => navigate(`/orders/${po.id}/edit`)}>
                          <Pencil size={14} style={{ marginInlineEnd: 4 }}/> 
                          {(po.status === 'Received' || po.status === 'Cancelled' || po.status === 'Returned') 
                            ? (isAr ? 'عرض التفاصيل' : 'View Details') 
                            : (isAr ? 'عرض وتعديل' : 'View/Edit')}
                        </button>
                      </Can>

                      {(po.status === 'Draft' || po.status === 'Sent' || po.status === 'Partial') && (
                        <Can permission="orders:receive-po">
                          <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, height: 'auto', color: '#059669', background: '#ecfdf5' }}
                            onClick={() => setReceivePo(po)}>
                            <PackageCheck size={14} style={{ marginInlineEnd: 4 }}/> {isAr ? 'استلام' : 'Receive'}
                          </button>
                        </Can>
                      )}

                      {(po.status === 'Cancelled' || po.status === 'Returned') && (
                        <Can permission="orders:delete-po">
                          <button className="btn btn-ghost" style={{ padding: '4px 8px', fontSize: 12, height: 'auto', color: 'var(--danger)', background: '#fef2f2' }}
                            disabled={mutDeletePo.isPending}
                            onClick={() => handleDelete(po)}
                          >
                            <Trash2 size={14} style={{ marginInlineEnd: 4 }}/> {isAr ? 'حذف' : 'Delete'}
                          </button>
                        </Can>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination && (
          <div className="pagination" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>{isAr ? 'صفوف:' : 'Rows:'}</span>
              <select 
                className="select" 
                style={{ width: 65, height: 32, padding: '0 4px', fontSize: 13, borderRadius: '8px' }}
                value={limit}
                onChange={e => { setLimit(parseInt(e.target.value)); setPage(1); }}
              >
                {[5, 10, 20, 50].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)', marginInlineStart: 8, minWidth: 200 }}>
                {isAr ? `إجمالي ${pagination.total} عنصر` : `Total ${pagination.total} items`}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button className="pagination-btn" disabled={!pagination.hasPrev} onClick={() => setPage(p => p - 1)}>‹</button>
              <span className="pagination-info" style={{ margin: '0 10px', fontSize: 13, fontWeight: 600 }}>{isAr ? 'صفحة' : 'Page'} {pagination.page} / {pagination.totalPages}</span>
              <button className="pagination-btn" disabled={!pagination.hasNext} onClick={() => setPage(p => p + 1)}>›</button>
            </div>
          </div>
        )}
      </div>

      {receivePo && (
        <POReceiveModal
          po={receivePo}
          onClose={() => setReceivePo(null)}
          onSuccess={() => { qc.invalidateQueries(['purchaseOrders']); qc.invalidateQueries(['stock']); setReceivePo(null); }}
        />
      )}

      {showImport && (
        <POImportModal
          onClose={() => setShowImport(false)}
          onSuccess={() => { qc.invalidateQueries(['purchaseOrders']); setShowImport(false); }}
        />
      )}
    </div>
  );
}
