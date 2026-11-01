import { api } from './client';

export interface CustomerMemoryProfile {
  totalInteractions: number;
  totalOrders: number;
  favoriteProducts: { productId: number; productName: string; count: number }[];
  preferredTimeSlot: string;
  typicalDayOfWeek: string;
  lastInteractionAt: string | null;
  tags: string[];
}

export interface PredictedItem {
  productId: number;
  productName: string;
  slug: string;
  price: string;
  imageUrl: string | null;
  probability: number;
  probabilityPercentage: number;
  confidence: 'alta' | 'media' | 'baja';
  reason: string;
}

export interface ProductRecommendation {
  productId: number;
  productName: string;
  slug: string;
  price: string;
  imageUrl: string | null;
  categoryName: string;
  score: number;
  type: 'frequently_bought_together' | 'complementary' | 'time_slot';
  reason: string;
}

export interface DemandAnalyticsReport {
  hourlyPeaks: {
    hour: number;
    hourLabel: string;
    orderCount: number;
    totalRevenue: string;
  }[];
  timeSlots: {
    slot: string;
    label: string;
    hours: string;
    orderCount: number;
    topProducts: { productName: string; units: number }[];
  }[];
  busiestHour: { hour: number; hourLabel: string; count: number };
  busiestDay: { dayName: string; count: number };
  agentStatus: {
    a0_orchestrator: boolean;
    a1_rag_memory: boolean;
    a2_predictor: boolean;
    a3_recommender: boolean;
    a4_analytics: boolean;
  };
}

export interface MenuSessionOrchestration {
  customerMemory: CustomerMemoryProfile;
  prediction: PredictedItem | null;
  predictions: PredictedItem[];
  recommendations: ProductRecommendation[];
}

export const agentsApi = {
  // A0: Sesión inteligente para la carta
  getSession: (guestToken?: string, cartProductIds?: number[]) => {
    const sp = new URLSearchParams();
    if (guestToken) sp.set('guestToken', guestToken);
    if (cartProductIds && cartProductIds.length > 0) {
      sp.set('cartProductIds', cartProductIds.join(','));
    }
    const qs = sp.toString() ? `?${sp.toString()}` : '';
    return api<MenuSessionOrchestration>(`/api/agents/session${qs}`, {
      auth: Boolean(typeof window !== 'undefined' && localStorage.getItem('gordos_token')),
    });
  },

  // A1: Registrar evento de interacción
  recordInteraction: (
    type: 'order' | 'view' | 'search' | 'click',
    metadata: Record<string, unknown> = {},
    guestToken?: string,
  ) =>
    api<{ acknowledged: boolean; interactionId: number; type: string }>('/api/agents/interaction', {
      method: 'POST',
      body: { type, metadata, guestToken },
      auth: Boolean(typeof window !== 'undefined' && localStorage.getItem('gordos_token')),
    }),

  // A2: Predicción directa
  getPrediction: (guestToken?: string) => {
    const qs = guestToken ? `?guestToken=${encodeURIComponent(guestToken)}` : '';
    return api<{ topPrediction: PredictedItem | null; predictions: PredictedItem[] }>(
      `/api/agents/prediction${qs}`,
      { auth: Boolean(typeof window !== 'undefined' && localStorage.getItem('gordos_token')) },
    );
  },

  // A3: Recomendaciones para el carrito o modal
  getRecommendations: (productIds: number[] = [], limit: number = 4) => {
    const sp = new URLSearchParams();
    if (productIds.length > 0) sp.set('productIds', productIds.join(','));
    sp.set('limit', String(limit));
    return api<{ recommendations: ProductRecommendation[] }>(
      `/api/agents/recommendations?${sp.toString()}`,
      { auth: false },
    );
  },

  // A4: Reporte de analítica de demanda para el admin
  getDemandAnalytics: () =>
    api<DemandAnalyticsReport>('/api/agents/analytics/demand', {
      auth: Boolean(typeof window !== 'undefined' && localStorage.getItem('gordos_token')),
    }),
};

