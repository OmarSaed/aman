import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const REFRESH_KEY = 'aman-customer-refresh';

export const useCustomerStore = create(
  persist(
    (set, get) => ({
      customer: null,
      accessToken: null,
      isAuthenticated: false,

      setSession: ({ customer, accessToken, refreshToken }) => {
        if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
        set({ customer, accessToken, isAuthenticated: true });
      },

      updateAccessToken: (accessToken) => set({ accessToken }),
      updateCustomer: (customer) => set({ customer }),

      logout: () => {
        localStorage.removeItem(REFRESH_KEY);
        set({ customer: null, accessToken: null, isAuthenticated: false });
      },

      isWholesale: () => get().customer?.type === 'WHOLESALE',
      wholesalePending: () =>
        get().customer?.requestedType === 'WHOLESALE'
        && get().customer?.type !== 'WHOLESALE'
        && get().customer?.accountStatus === 'PENDING',
    }),
    {
      name: 'aman-customer-auth',
      partialize: (state) => ({
        customer: state.customer,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export const getCustomerRefreshToken = () => localStorage.getItem(REFRESH_KEY);
