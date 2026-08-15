// frontend/src/store/auth.store.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user:        null,
      accessToken: null,
      permissions: [],
      isAuthenticated: false,

      setAuth: ({ user, accessToken, permissions }) => set({
        user, accessToken, permissions,
        isAuthenticated: true,
      }),

      updateAccessToken: (accessToken) => set({ accessToken }),

      logout: () => set({
        user: null, accessToken: null, permissions: [],
        isAuthenticated: false,
      }),

      hasPermission: (key) => get().permissions.includes(key),

      hasAnyPermission: (...keys) => keys.some(k => get().permissions.includes(k)),
    }),
    {
      name: 'aman-auth',
      partialize: (state) => ({
        user:        state.user,
        accessToken: state.accessToken,
        permissions: state.permissions,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useAuthStore;
