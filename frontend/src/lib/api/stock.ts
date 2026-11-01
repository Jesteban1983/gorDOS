import { api } from './client';

// ─── Tipos ──────────────────────────────────────────────
export interface StockItem {
  id: number;
  name: string;
  slug: string;
  price: string;
  stock: number;
  isAvailable: boolean;
  lowStock: boolean;
  outOfStock: boolean;
  updatedAt: string;
}

export interface LowStockItem {
  id: number;
  name: string;
  stock: number;
  isAvailable: boolean;
  updatedAt: string;
}

// ─── API (solo admin) ───────────────────────────────────
export const stockApi = {
  list: () => api<StockItem[]>('/api/stock', { auth: true }),

  lowStock: () => api<LowStockItem[]>('/api/stock/low', { auth: true }),

  update: (id: number, stock: number) =>
    api<{ id: number; stock: number; isAvailable: boolean }>(`/api/stock/${id}`, {
      method: 'PATCH',
      body: { stock },
      auth: true,
    }),

  bulk: (updates: { id: number; stock: number }[]) =>
    api<{ id: number; stock: number; isAvailable: boolean }[]>('/api/stock/bulk', {
      method: 'POST',
      body: { updates },
      auth: true,
    }),

  decrement: (id: number, quantity: number = 1, reason?: string) =>
    api<{ id: number; stock: number; isAvailable: boolean }>(`/api/stock/${id}/decrement`, {
      method: 'POST',
      body: { quantity, reason },
      auth: true,
    }),
};