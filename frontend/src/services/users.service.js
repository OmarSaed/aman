// frontend/src/services/users.service.js
import api from './api';
export const usersService = {
  list:         (params)    => api.get('/users',               { params }),
  getStats:     ()          => api.get('/users/stats'),
  getById:      (id)        => api.get(`/users/${id}`),
  create:       (data)      => api.post('/users',              data),
  update:       (id, data)  => api.put(`/users/${id}`,         data),
  toggleStatus: (id)        => api.patch(`/users/${id}/status`),
  delete:       (id)        => api.delete(`/users/${id}`),
};
