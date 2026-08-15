// frontend/src/features/inventory/InventoryPage.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowRightLeft, Search, RefreshCw, Archive, Box } from 'lucide-react';
import { inventoryService } from '../../services/inventory.service';
import { productsService } from '../../services/products.service';
import Badge from '../../components/ui/Badge';
import Can from '../auth/Can';
import TransferModal from './TransferModal';

export default function InventoryPage() {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const isAr = i18n.language === 'ar';

  const [search, setSearch] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [transferOpen, setTransferOpen] = useState(false);

  const params = { page, limit, ...(warehouseFilter && { warehouseId: warehouseFilter }) };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['stock', params],
    queryFn: () => inventoryService.getStock(params).then(r => r.data),
  });

  const { data: rawProducts } = useQuery({
    queryKey: ['products-for-search', search],
    queryFn: () => search ? productsService.list({ search, limit: 1 }).then(r => r.data) : null,
    enabled: !!search
  });

  // If user searched, we pass productId to stock filter
  if (rawProducts?.data?.length > 0) {
    params.productId = rawProducts.data[0].id;
  }

  const { data: warehouses } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => inventoryService.listWarehouses().then(r => r.data.data),
  });

  const stocks = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="animate-fade">
      <div className="page-header">
        <div className="page-header-left">
          <h1>{isAr ? 'مستويات المخزون' : 'Stock Levels'}</h1>
          <p>{isAr ? 'تتبع الكميات في المستودعات والمعارض' : 'Track quantities across warehouses and showrooms'}</p>
        </div>
        <div>
          <Can permission="inventory:adjust-stock">
            <button className="btn btn-primary" onClick={() => setTransferOpen(true)}>
              <ArrowRightLeft size={16} />{isAr ? 'نقل مخزون' : 'Transfer Stock'}
            </button>
          </Can>
        </div>
      </div>

      <div className="card mb-4" style={{ minWidth: 370 }}>
        <div style={{ padding: '14px 16px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="input-with-icon" style={{ flex: 1, minWidth: 200 }}>
            <Search className="input-icon" size={15} />
            <input className="input" placeholder={isAr ? 'ابحث عن منتج...' : 'Search product...'} value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <select className="select" style={{ width: 180 }} value={warehouseFilter}
            onChange={e => { setWarehouseFilter(e.target.value); setPage(1); }}>
            <option value="">{isAr ? 'كل المستودعات' : 'All Warehouses'}</option>
            {warehouses?.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <button className="btn btn-ghost btn-icon" onClick={() => refetch()}>
            <RefreshCw size={15} />
          </button>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>{isAr ? 'المنتج' : 'Product'}</th>
                <th>SKU</th>
                <th>{isAr ? 'المستودع' : 'Warehouse'}</th>
                <th>{isAr ? 'الكمية المتوفرة' : 'Available Qty'}</th>
                <th>{isAr ? 'آخر تحديث' : 'Last Updated'}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} style={{ textAlign: 'center', padding: 40 }}><span className="loader loader-dark" style={{ margin: '0 auto', display: 'block' }}/></td></tr>
              ) : stocks.length === 0 ? (
                <tr><td colSpan={5}>
                  <div className="empty-state"><div className="empty-state-icon"><Archive /></div><h3>{isAr ? 'لا يوجد مخزون' : 'No stock found'}</h3></div>
                </td></tr>
              ) : stocks.map(s => (
                <tr key={s.id}>
                  <td style={{ fontWeight: 500 }}>{s.product.name}</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{s.product.sku}</td>
                  <td>
                    <Badge variant={s.warehouse.type === 'Showroom' ? 'primary' : 'ghost'}>
                      {s.warehouse.name}
                    </Badge>
                  </td>
                  <td>
                    <Badge variant={s.quantity > 0 ? 'success' : 'danger'} style={{ fontSize: 14, fontWeight: 700 }}>
                      {s.quantity}
                    </Badge>
                  </td>
                  <td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{new Date(s.updatedAt).toLocaleDateString()}</td>
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

      {transferOpen && (
        <TransferModal
          warehouses={warehouses || []}
          onClose={() => setTransferOpen(false)}
          onSuccess={() => { qc.invalidateQueries(['stock']); setTransferOpen(false); }}
        />
      )}
    </div>
  );
}
