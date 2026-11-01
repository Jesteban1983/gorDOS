export interface AgentInteractionInput {
  userId?: number;
  guestToken?: string;
  type: 'order' | 'view' | 'search' | 'click';
  metadata: Record<string, unknown>;
}

export interface CustomerMemoryProfile {
  totalInteractions: number;
  totalOrders: number;
  favoriteProducts: { productId: number; productName: string; count: number }[];
  preferredTimeSlot: 'almuerzo' | 'tarde' | 'cena' | 'noche';
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
  probability: number; // 0 to 1
  probabilityPercentage: number; // 0 to 100
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

export interface DemandPeakHour {
  hour: number;
  hourLabel: string;
  orderCount: number;
  totalRevenue: string;
}

export interface TimeSlotAnalysis {
  slot: 'almuerzo' | 'tarde' | 'cena' | 'noche';
  label: string;
  hours: string;
  orderCount: number;
  topProducts: { productName: string; units: number }[];
}

export interface DemandAnalyticsReport {
  hourlyPeaks: DemandPeakHour[];
  timeSlots: TimeSlotAnalysis[];
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

