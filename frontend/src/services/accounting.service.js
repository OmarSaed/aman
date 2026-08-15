// frontend/src/services/accounting.service.js
import api from './api';

export const accountingService = {
  // Unified Transactions
  listTransactions: (params) => api.get('/accounting/transactions', { params }),
};
