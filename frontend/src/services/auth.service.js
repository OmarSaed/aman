// frontend/src/services/auth.service.js
import api from './api';

export const authService = {
  login:   (email, password) => api.post('/auth/login',   { email, password }),
  refresh: (refreshToken)    => api.post('/auth/refresh',  { refreshToken }),
  logout:  (refreshToken)    => api.post('/auth/logout',   { refreshToken }),
  getMe:   ()                => api.get('/auth/me'),
};

// frontend/src/services/users.service.js
export const usersService = {
  list:         (params) => api.get('/users',              { params }),
  getStats:     ()       => api.get('/users/stats'),
  getById:      (id)     => api.get(`/users/${id}`),
  create:       (data)   => api.post('/users',             data),
  update:       (id, data)=> api.put(`/users/${id}`,       data),
  toggleStatus: (id)     => api.patch(`/users/${id}/status`),
  delete:       (id)     => api.delete(`/users/${id}`),
};

// frontend/src/services/roles.service.js
export const rolesService = {
  list:               ()         => api.get('/roles'),
  getById:            (id)       => api.get(`/roles/${id}`),
  listPermissions:    ()         => api.get('/roles/permissions'),
  getRolePermissions: (id)       => api.get(`/roles/${id}/permissions`),
  create:             (data)     => api.post('/roles',                    data),
  update:             (id, data) => api.put(`/roles/${id}`,               data),
  updatePermissions:  (id, ids)  => api.put(`/roles/${id}/permissions`,   { permissionIds: ids }),
  delete:             (id)       => api.delete(`/roles/${id}`),
};
