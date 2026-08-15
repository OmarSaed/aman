import api from './api';

export const settingsService = {
  getSystemSettings: () => api.get('/settings/system'),
  updateSystemSettings: (data) => api.put('/settings/system', data),
  getCompanySettings: () => api.get('/settings/company'),
  updateCompanySettings: (data) => api.put('/settings/company', data),
  fixCustomerBalances: () => api.post('/settings/maintenance/fix-customer-balances'),
  fixStock: () => api.post('/settings/maintenance/fix-stock'),
};
