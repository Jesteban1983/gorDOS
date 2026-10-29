import { api } from './client';

// ─── Tipos ──────────────────────────────────────────────
export interface AddonOption {
  id: number;
  name: string;
  price: string;
  type: 'addon' | 'sauce' | 'drink' | 'side';
  isRequired: boolean;
  maxSelect: number;
}

export interface CatalogProduct {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  imageUrl: string | null;
  isAvailable: boolean;
  preparationTime: number | null;
  addons: AddonOption[];
}

export interface CatalogCategory {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  products: CatalogProduct[];
}

export interface CategoryBrief {
  id: number;
  name: string;
  slug: string;
  description: string | null;
}

// ─── API ────────────────────────────────────────────────
export const catalogApi = {
  // Carta completa: categorías con productos y addons
  getCard: () => api<CatalogCategory[]>('/api/catalog', { auth: false }),

  // Solo categorías activas
  getCategories: () => api<CategoryBrief[]>('/api/catalog/categories', { auth: false }),

  // Búsqueda por nombre
  search: (q: string) =>
    api<CatalogProduct[]>('/api/catalog/search?q=' + encodeURIComponent(q), { auth: false }),

  // Detalle de producto (con addons)
  getProduct: (slug: string) =>
    api<CatalogProduct>(`/api/catalog/products/${slug}`, { auth: false }),
};