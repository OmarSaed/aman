// frontend/src/services/expenses.service.js
import api from './api';

export const expensesService = {
  // Categories
  listCategories: () => api.get('/expenses/categories'),
  createCategory: (data) => api.post('/expenses/categories', data),

  // Expenses
  list: (params) => api.get('/expenses', { params }),
  create: (data) => api.post('/expenses', data),
  delete: (id) => api.delete(`/expenses/${id}`),
};
