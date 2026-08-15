// frontend/src/services/roles.service.js
import api from './api';
export const rolesService = {
  list:               ()          => api.get('/roles'),
  getById:            (id)        => api.get(`/roles/${id}`),
  listPermissions:    ()          => api.get('/roles/permissions'),
  getRolePermissions: (id)        => api.get(`/roles/${id}/permissions`),
  create:             (data)      => api.post('/roles',                   data),
  update:             (id, data)  => api.put(`/roles/${id}`,              data),
  updatePermissions:  (id, ids)   => api.put(`/roles/${id}/permissions`,  { permissionIds: ids }),
  delete:             (id)        => api.delete(`/roles/${id}`),
};
