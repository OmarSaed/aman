import axios from 'axios';
import { useCustomerStore, getCustomerRefreshToken } from './customer.store';

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
});

publicApi.interceptors.request.use((config) => {
  const token = useCustomerStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing = false;
let queue = [];
const flush = (error, token = null) => {
  queue.forEach((p) => (error ? p.reject(error) : p.resolve(token)));
  queue = [];
};

publicApi.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original?._retry || original?.url?.includes('/public/auth/')) {
      return Promise.reject(error);
    }
    const refreshToken = getCustomerRefreshToken();
    if (!refreshToken) {
      useCustomerStore.getState().logout();
      return Promise.reject(error);
    }
    if (refreshing) {
      return new Promise((resolve, reject) => {
        queue.push({
          resolve: (token) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(publicApi(original));
          },
          reject,
        });
      });
    }
    original._retry = true;
    refreshing = true;
    try {
      const { data } = await axios.post(`${publicApi.defaults.baseURL}/public/auth/refresh`, { refreshToken });
      const payload = data?.data || data;
      const newToken = payload.accessToken;
      useCustomerStore.getState().updateAccessToken(newToken);
      if (payload.customer) useCustomerStore.getState().updateCustomer(payload.customer);
      flush(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return publicApi(original);
    } catch (refreshError) {
      flush(refreshError, null);
      useCustomerStore.getState().logout();
      return Promise.reject(refreshError);
    } finally {
      refreshing = false;
    }
  }
);

const unwrap = (res) => res.data?.data ?? res.data;

export const storefrontApi = {
  getCompany: async () => unwrap(await publicApi.get('/public/company')),
  getCategories: async () => unwrap(await publicApi.get('/public/categories')),
  getProducts: async (params) => {
    const res = await publicApi.get('/public/products', { params });
    return {
      data: res.data?.data || [],
      pagination: res.data?.pagination || null,
    };
  },
  getProduct: async (id) => unwrap(await publicApi.get(`/public/products/${id}`)),
  createOrder: async (payload) => unwrap(await publicApi.post('/public/orders', payload)),
  register: async (payload) => unwrap(await publicApi.post('/public/auth/register', payload)),
  login: async (payload) => unwrap(await publicApi.post('/public/auth/login', payload)),
  logout: async () => {
    const refreshToken = getCustomerRefreshToken();
    try { await publicApi.post('/public/auth/logout', { refreshToken }); } catch { /* ignore */ }
  },
  me: async () => unwrap(await publicApi.get('/public/account/me')),
  updateMe: async (payload) => unwrap(await publicApi.put('/public/account/me', payload)),
  myOrders: async () => unwrap(await publicApi.get('/public/account/orders')),
};
