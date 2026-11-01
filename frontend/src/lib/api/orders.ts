import { api } from './client';

// ─── Tipos ──────────────────────────────────────────────
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'stripe' | 'cash_on_delivery';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';

export interface OrderItemView {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: string;
  addons: { id: number; name: string; price: string }[];
  notes: string | null;
  totalPrice: string;
}

export interface OrderView {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  subtotal: string;
  deliveryFee: string;
  total: string;
  notes: string | null;
  deliveryAddress: string | null;
  estimatedTime: number | null;
  createdAt: string;
  confirmedAt: string | null;
  readyAt: string | null;
  items: OrderItemView[];
}

export interface OrderBrief {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  total: string;
  estimatedTime: number | null;
  createdAt: string;
}

export interface CreateOrderInput {
  items: { productId: number; quantity: number; addonIds?: number[]; notes?: string }[];
  paymentMethod: PaymentMethod;
  deliveryAddress?: string;
  notes?: string;
  guestToken?: string;
}

export interface CreateOrderResult {
  order: OrderView;
  stripe?: { clientSecret?: string; demoMode?: boolean };
}

// ─── Utilidades de sesión ───────────────────────────────
export function getGuestToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('gordos_guest_token');
}

export function ensureGuestToken(): string {
  const existing = getGuestToken();
  if (existing) return existing;
  const token =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `guest-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  localStorage.setItem('gordos_guest_token', token);
  return token;
}

// ─── API ────────────────────────────────────────────────
export const ordersApi = {
  create: (input: CreateOrderInput) =>
    api<CreateOrderResult>('/api/orders', {
      method: 'POST',
      body: input,
      auth: Boolean(localStorage.getItem('gordos_token')),
    }),

  mine: (guestToken?: string) => {
    const q = guestToken ? `?guestToken=${encodeURIComponent(guestToken)}` : '';
    return api<OrderBrief[]>(`/api/orders/mine${q}`, {
      auth: Boolean(localStorage.getItem('gordos_token')),
    });
  },

  get: (id: number, guestToken?: string) => {
    const q = guestToken ? `?guestToken=${encodeURIComponent(guestToken)}` : '';
    return api<OrderView>(`/api/orders/${id}${q}`, {
      auth: Boolean(localStorage.getItem('gordos_token')),
    });
  },

  // ── Cocina y Comandas (Fase 5) ────────────────────────
  kitchenActive: () =>
    api<OrderView[]>('/api/orders/kitchen/active', {
      auth: Boolean(localStorage.getItem('gordos_token')),
    }),

  updateStatus: (id: number, status: OrderStatus) =>
    api<OrderView>(`/api/orders/${id}/status`, {
      method: 'PATCH',
      body: { status },
      auth: Boolean(localStorage.getItem('gordos_token')),
    }),

  getTicket: (id: number, type: 'kitchen' | 'cashier' = 'kitchen') =>
    api<{ orderId: number; orderNumber: string; type: string; text: string; escposBase64: string }>(
      `/api/orders/${id}/ticket?type=${type}`,
      { auth: Boolean(localStorage.getItem('gordos_token')) },
    ),

  sendToPrinter: (id: number, type: 'kitchen' | 'cashier' = 'kitchen') =>
    api<{ success: boolean; orderNumber: string; type: string; message: string }>(
      `/api/orders/${id}/print`,
      {
        method: 'POST',
        body: { type },
        auth: Boolean(localStorage.getItem('gordos_token')),
      },
    ),
};

// ─── Etiquetas de estado (UI) ───────────────────────────
export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmado',
  preparing: 'En preparación',
  ready: 'Listo para recoger',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  stripe: 'Pago online (tarjeta)',
  cash_on_delivery: 'Contra entrega',
};