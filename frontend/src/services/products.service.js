// frontend/src/services/products.service.js
import api from './api';

export const productsService = {
  // Products
  list: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
  bulkUpdatePrices: (data) => api.patch('/products/bulk-update-prices', data),
  batchUpdatePrices: (updates) => api.patch('/products/batch-update-prices', { updates }),
  togglePriceLock: (id, isPriceLocked) => api.patch(`/products/${id}/toggle-price-lock`, { isPriceLocked }),
  bulkImport: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/products/bulk-import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },
  downloadImportTemplate: async () => {
    const res = await api.get('/products/import-template', { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products_import_template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },

  // Categories
  listCategories: (params) => api.get('/products/categories', { params }),
  createCategory: (data) => api.post('/products/categories', data),
  updateCategory: (id, data) => api.put(`/products/categories/${id}`, data),
  deleteCategory: (id) => api.delete(`/products/categories/${id}`),

  // Brands
  listBrands: (params) => api.get('/products/brands', { params }),
  createBrand: (data) => api.post('/products/brands', data),
  updateBrand: (id, data) => api.put(`/products/brands/${id}`, data),
  deleteBrand: (id) => api.delete(`/products/brands/${id}`),

  // Warehouses
  listWarehouses: () => api.get('/products/warehouses/all'),
  createWarehouse: (data) => api.post('/products/warehouses', data),

  // Barcodes
  generateMissingBarcodes: () => api.post('/products/barcodes/generate-missing'),

  // Stock
  getTransactions: (productId) => api.get(`/products/${productId}/transactions`),
};
