// frontend/src/services/orders.service.js
import api from './api';

export const ordersService = {
  list: (params) => api.get('/orders', { params }),
  get: (id) => api.get(`/orders/${id}`),
  create: (data) => api.post('/orders', data),
  updateStatus: (id, status) => api.patch(`/orders/${id}/status`, { status }),
  update: (id, data) => api.put(`/orders/${id}`, data),
  addPayment: (id, data) => api.post(`/orders/${id}/payments`, data),
  delete: (id) => api.delete(`/orders/${id}`),
  exportExcel: (id) => api.get(`/orders/${id}/export/excel`, { responseType: 'blob' }),
};
