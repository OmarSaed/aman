import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { snapQuantity } from './utils';

export const useCartStore = create(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product, quantity) => {
        const box = product.boxQuantity || 1;
        const qty = snapQuantity(quantity ?? box, box);
        const items = [...get().items];
        const idx = items.findIndex((row) => row.id === product.id);
        if (idx >= 0) {
          items[idx] = {
            ...items[idx],
            quantity: snapQuantity(items[idx].quantity + qty, box),
            price: product.price,
            boxQuantity: box,
            name: product.name,
            imageUrl: product.imageUrl,
            sku: product.sku,
          };
        } else {
          items.push({
            id: product.id,
            name: product.name,
            sku: product.sku,
            imageUrl: product.imageUrl,
            price: product.price,
            boxQuantity: box,
            quantity: qty,
          });
        }
        set({ items });
      },
      setQuantity: (id, quantity) => {
        set({
          items: get().items.map((row) => {
            if (row.id !== id) return row;
            return { ...row, quantity: snapQuantity(quantity, row.boxQuantity || 1) };
          }),
        });
      },
      removeItem: (id) => set({ items: get().items.filter((row) => row.id !== id) }),
      clear: () => set({ items: [] }),
      syncPricing: (products) => {
        const byId = new Map((products || []).map((p) => [p.id, p]));
        set({
          items: get().items.map((row) => {
            const product = byId.get(row.id);
            if (!product) return row;
            const box = product.boxQuantity || 1;
            return {
              ...row,
              price: product.price,
              boxQuantity: box,
              name: product.name,
              imageUrl: product.imageUrl,
              sku: product.sku,
              quantity: snapQuantity(row.quantity, box),
            };
          }),
        });
      },
      count: () => get().items.reduce((sum, row) => sum + row.quantity, 0),
      lines: () => get().items.length,
      subtotal: () => get().items.reduce((sum, row) => sum + Number(row.price) * row.quantity, 0),
    }),
    { name: 'aman-wholesale-cart' }
  )
);
