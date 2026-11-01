import { recordInteraction, getCustomerContext } from './a1-rag.service';
import { predictCustomerOrder } from './a2-predictor.service';
import { getRecommendations } from './a3-recommender.service';
import { getDemandAnalytics } from './a4-analytics.service';
import type { AgentInteractionInput } from './types';

/**
 * A0 — ORQUESTRADOR CENTRAL
 * Coordina las consultas entre agentes según la interacción del cliente.
 * Implementa el ciclo de vida multiagente descrito en AGENTS.md.
 */
export async function orchestrateMenuSession(params: {
  userId?: number;
  guestToken?: string;
  cartProductIds?: number[];
}) {
  // 1. A1: Consulta memoria de cliente
  const memory = await getCustomerContext(params.userId, params.guestToken);

  // 2. A2: Predicción de próximo pedido
  const predictions = await predictCustomerOrder(params.userId, params.guestToken);

  // 3. A3: Recomendaciones contextuales de acompañamientos
  const recommendations = await getRecommendations(params.cartProductIds || [], 4);

  return {
    customerMemory: memory,
    prediction: predictions[0] || null,
    predictions,
    recommendations,
  };
}

/**
 * Captura y procesa un evento del cliente coordinando RAG y analítica
 */
export async function handleInteractionEvent(input: AgentInteractionInput) {
  // A1 almacena interacción y calcula embedding
  const saved = await recordInteraction(input);
  return {
    acknowledged: true,
    interactionId: saved.id,
    type: saved.type,
  };
}

export {
  getCustomerContext,
  predictCustomerOrder,
  getRecommendations,
  getDemandAnalytics,
};

