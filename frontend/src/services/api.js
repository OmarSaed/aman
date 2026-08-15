// frontend/src/services/api.js
import axios from 'axios';
import useAuthStore from '../store/auth.store';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 → refresh token → retry once
let isRefreshing = false;
let queue = [];

const processQueue = (error, token = null) => {
  queue.forEach(p => (error ? p.reject(error) : p.resolve(token)));
  queue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({
            resolve: (token) => { original.headers.Authorization = `Bearer ${token}`; resolve(api(original)); },
            reject,
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const stored = useAuthStore.getState();
        const { data } = await axios.post('/api/auth/refresh', {
          refreshToken: localStorage.getItem('aman-refresh-token'),
        });
        const newToken = data.data.accessToken;
        useAuthStore.getState().updateAccessToken(newToken);
        processQueue(null, newToken);
        original.headers.Authorization = `Bearer ${newToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
