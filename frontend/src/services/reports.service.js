// frontend/src/services/reports.service.js
import api from './api';

export const reportsService = {
  getSales: () => api.get('/reports/sales'),
  getPurchases: () => api.get('/reports/purchases'),
  getInventory: () => api.get('/reports/inventory'),
  getCustomerReports: () => api.get('/reports/customers'),
  getCashflow: () => api.get('/reports/cashflow'),
  getStockTransactions: () => api.get('/reports/stock-transactions'),
  getChartData: () => api.get('/reports/charts'),
  exportCustom: (data) => api.post('/reports/export', data, { responseType: 'blob' }),
};
