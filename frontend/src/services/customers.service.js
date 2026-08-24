// frontend/src/services/customers.service.js
import api from './api';

export const customersService = {
  list: (params) => api.get('/customers', { params }),
  create: (data) => api.post('/customers', data),
  update: (id, data) => api.put(`/customers/${id}`, data),
  delete: (id) => api.delete(`/customers/${id}`),
  
  getAccount: (id, params) => api.get(`/customers/${id}/account`, { params }),
  addPayment: (data) => api.post('/customers/payments', data),
  resetAccount: (id, data) => api.post(`/customers/${id}/reset`, data),
  reviewWholesale: (id, action) => api.patch(`/customers/${id}/wholesale-review`, { action }),
};
