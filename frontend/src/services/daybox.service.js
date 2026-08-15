// frontend/src/services/daybox.service.js
import api from './api';

export const dayboxService = {
  list: (params) => api.get('/daybox', { params }),
  open: (data) => api.post('/daybox/open', data),
  getActive: () => api.get('/daybox/active'),
  getSummary: (id) => api.get(`/daybox/${id}/summary`),
  close: (id, data) => api.patch(`/daybox/${id}/close`, data),
};
