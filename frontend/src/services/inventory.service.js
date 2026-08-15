// frontend/src/services/inventory.service.js
import api from './api';

export const inventoryService = {
  listWarehouses: () => api.get('/inventory/warehouses'),
  createWarehouse: (data) => api.post('/inventory/warehouses', data),
  updateWarehouse: (id, data) => api.put(`/inventory/warehouses/${id}`, data),
  
  getStock: (params) => api.get('/inventory/stock', { params }),
  getMovements: (params) => api.get('/inventory/movements', { params }),
  
  transferStock: (data) => api.post('/inventory/transfer', data),
  adjustStock: (data) => api.post('/inventory/adjust', data),
};
