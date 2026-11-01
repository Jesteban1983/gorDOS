import { api } from './client';
import type { OrderStatus, OrderView } from './orders';

export interface DashboardMetrics {
  totalRevenue: string;
  todayOrders: number;
  totalOrders: number;
  averageTicket: string;
  statusBreakdown: Record<OrderStatus, number>;
  topProducts: {
    productId: number;
    productName: string;
    unitsSold: number;
    revenue: string;
  }[];
  recentOrders: {
    id: number;
    orderNumber: string;
    customer: string;
    status: OrderStatus;
    paymentMethod: string;
    paymentStatus: string;
    total: string;
    itemCount: number;
    createdAt: string;
  }[];
  stockAlerts: {
    outOfStock: number;
    lowStock: number;
  };
}

export interface AdminCustomer {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  lastOrderAt: string | null;
  createdAt: string;
  ordersCount: number;
  totalSpent: string;
}

export interface AdminOrdersResponse {
  orders: OrderView[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateProductInput {
  categoryId: number;
  name: string;
  slug?: string;
  description?: string;
  price: string;
  stock?: number;
  preparationTime?: number;
  sortOrder?: number;
  imageUrl?: string;
}

export const adminApi = {
  // ── 7.1 Métricas ──────────────────────────────────────
  getMetrics: () =>
    api<DashboardMetrics>('/api/admin/metrics', {
      auth: Boolean(localStorage.getItem('gordos_token')),
    }),

  // ── 7.3 Gestión de Pedidos ────────────────────────────
  getOrders: (params: { status?: string; search?: string; page?: number; limit?: number } = {}) => {
    const sp = new URLSearchParams();
    if (params.status && params.status !== 'all') sp.set('status', params.status);
    if (params.search) sp.set('search', params.search);
    if (params.page) sp.set('page', String(params.page));
    if (params.limit) sp.set('limit', String(params.limit));

    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return api<AdminOrdersResponse>(`/api/admin/orders${qs}`, {
      auth: Boolean(localStorage.getItem('gordos_token')),
    });
  },

  updateOrderStatus: (id: number, status: OrderStatus) =>
    api<OrderView>(`/api/admin/orders/${id}/status`, {
      method: 'PATCH',
      body: { status },
      auth: Boolean(localStorage.getItem('gordos_token')),
    }),

  // ── 7.4 Clientes ──────────────────────────────────────
  getCustomers: () =>
    api<AdminCustomer[]>('/api/admin/customers', {
      auth: Boolean(localStorage.getItem('gordos_token')),
    }),

  toggleCustomer: (id: number) =>
    api<{ id: number; email: string; isActive: boolean }>(`/api/admin/customers/${id}/toggle`, {
      method: 'PATCH',
      auth: Boolean(localStorage.getItem('gordos_token')),
    }),

  // ── 7.2 Gestión de Productos ─────────────────────────
  createProduct: (data: CreateProductInput) =>
    api('/api/catalog/admin/products', {
      method: 'POST',
      body: data,
      auth: Boolean(localStorage.getItem('gordos_token')),
    }),

  updateProduct: (id: number, data: Partial<CreateProductInput>) =>
    api(`/api/catalog/admin/products/${id}`, {
      method: 'PATCH',
      body: data,
      auth: Boolean(localStorage.getItem('gordos_token')),
    }),

  toggleProduct: (id: number) =>
    api(`/api/catalog/admin/products/${id}/toggle`, {
      method: 'PATCH',
      auth: Boolean(localStorage.getItem('gordos_token')),
    }),

  deleteProduct: (id: number) =>
    api(`/api/catalog/admin/products/${id}`, {
      method: 'DELETE',
      auth: Boolean(localStorage.getItem('gordos_token')),
    }),

  // ── 7.6 Reportes CSV ──────────────────────────────────
  getOrdersCsvUrl: () => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
    return `${base}/api/admin/reports/orders/csv`;
  },

  getProductsCsvUrl: () => {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
    return `${base}/api/admin/reports/products/csv`;
  },
};

