// frontend/src/services/suppliers.service.js
import api from './api';

export const suppliersService = {
  // Suppliers
  list: (params) => api.get('/suppliers', { params }),
  create: (data) => api.post('/suppliers', data),
  update: (id, data) => api.put(`/suppliers/${id}`, data),
  delete: (id) => api.delete(`/suppliers/${id}`),

  // Prices
  getPrices: (productId) => api.get(`/suppliers/products/${productId}/prices`),
  addPrice: (data) => api.post('/suppliers/prices', data),

  // POs
  listOrders: (params) => api.get('/suppliers/orders', { params }),
  getOrder: (id) => api.get(`/suppliers/orders/${id}`),
  createOrder: (data) => api.post('/suppliers/orders', data),
  updateOrder: (id, data) => api.put(`/suppliers/orders/${id}`, data),
  deleteOrder: (id) => api.delete(`/suppliers/orders/${id}`),
  updateOrderStatus: (id, status) => api.patch(`/suppliers/orders/${id}/status`, { status }),
  receiveOrder: (id, data) => api.post(`/suppliers/orders/${id}/receive`, data),
  importOrder: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      if (key !== 'file' && data[key] !== undefined) formData.append(key, data[key]);
    });
    if (data.file) formData.append('file', data.file);
    return api.post('/suppliers/orders/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
  },

  // Account & Ledger
  getAccount: (id, params) => api.get(`/suppliers/${id}/account`, { params }),
  addPayment: (data) => api.post('/suppliers/payment', data),
};
