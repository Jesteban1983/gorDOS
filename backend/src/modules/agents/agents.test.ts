import { describe, it, expect } from 'vitest';
import { generateEmbedding, cosineSimilarity, EMBEDDING_DIM } from './embedding';
import { recordInteraction, getCustomerContext, searchSimilarInteractions } from './a1-rag.service';
import { predictCustomerOrder } from './a2-predictor.service';
import { getRecommendations } from './a3-recommender.service';
import { getDemandAnalytics } from './a4-analytics.service';
import { orchestrateMenuSession } from './a0-orchestrator.service';

describe('Sistema Multiagente + RAG (Fase 8)', () => {
  describe('Motor de Embeddings Semánticos', () => {
    it('genera un vector de 384 dimensiones normalizado', () => {
      const vec = generateEmbedding('pollo a la brasa con papas fritas');
      expect(vec).toHaveLength(EMBEDDING_DIM);

      let norm = 0;
      for (const v of vec) norm += v * v;
      expect(Math.sqrt(norm)).toBeCloseTo(1.0, 4);
    });

    it('calcula similitud del coseno coherente entre textos relacionados', () => {
      const vecPollo = generateEmbedding('pollo a la brasa');
      const vecPolloCremas = generateEmbedding('pollo con cremas y papas');
      const vecAuto = generateEmbedding('vehículo motorizado');

      const simRelated = cosineSimilarity(vecPollo, vecPolloCremas);
      const simUnrelated = cosineSimilarity(vecPollo, vecAuto);

      expect(simRelated).toBeGreaterThan(simUnrelated);
      expect(simRelated).toBeGreaterThan(0.2);
    });
  });

  describe('A1 — RAG & Memoria de Interacciones', () => {
    it('registra una interacción y genera su vector semántico en BD', async () => {
      const saved = await recordInteraction({
        guestToken: 'test-guest-rag',
        type: 'search',
        metadata: { query: 'parrilla mixta' },
      });

      expect(saved).toBeDefined();
      expect(saved.id).toBeGreaterThan(0);
      expect(saved.type).toBe('search');
      expect(saved.embedding).toBeDefined();
    });

    it('recupera el contexto de memoria del cliente', async () => {
      const context = await getCustomerContext(undefined, 'test-guest-rag');
      expect(context).toBeDefined();
      expect(context.totalInteractions).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(context.favoriteProducts)).toBe(true);
      expect(context.preferredTimeSlot).toBeDefined();
      expect(Array.isArray(context.tags)).toBe(true);
    });

    it('realiza búsqueda semántica sobre interacciones', async () => {
      const results = await searchSimilarInteractions('parrilla', 3);
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('A2 — Predictor de Pedidos', () => {
    it('predice el próximo pedido del cliente con probabilidad > 0.6', async () => {
      const predictions = await predictCustomerOrder(undefined, 'test-guest-rag');
      expect(Array.isArray(predictions)).toBe(true);
      expect(predictions.length).toBeGreaterThan(0);

      const top = predictions[0];
      expect(top).toHaveProperty('productId');
      expect(top).toHaveProperty('productName');
      expect(top.probability).toBeGreaterThanOrEqual(0.6); // Criterio de éxito: >60%
      expect(top.probabilityPercentage).toBeGreaterThanOrEqual(60);
      expect(top.confidence).toBeDefined();
      expect(top.reason).toBeDefined();
    });
  });

  describe('A3 — Recomendador Inteligente (Venta Cruzada)', () => {
    it('sugiere bebidas y guarniciones complementarias', async () => {
      const recs = await getRecommendations([27], 3);
      expect(Array.isArray(recs)).toBe(true);
      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0]).toHaveProperty('productName');
      expect(recs[0]).toHaveProperty('reason');
    });
  });

  describe('A4 — Analítico de Demanda y Horarios', () => {
    it('genera el reporte de picos horarios y franjas horarias', async () => {
      const report = await getDemandAnalytics();
      expect(report).toBeDefined();
      expect(report.hourlyPeaks).toHaveLength(24);
      expect(report.timeSlots.length).toBe(4);
      expect(report.busiestHour).toBeDefined();
      expect(report.busiestDay).toBeDefined();
      expect(report.agentStatus.a0_orchestrator).toBe(true);
      expect(report.agentStatus.a1_rag_memory).toBe(true);
      expect(report.agentStatus.a2_predictor).toBe(true);
      expect(report.agentStatus.a3_recommender).toBe(true);
      expect(report.agentStatus.a4_analytics).toBe(true);
    });
  });

  describe('A0 — Orquestador Central', () => {
    it('orquestar una sesión completa unificando A1, A2 y A3', async () => {
      const session = await orchestrateMenuSession({ guestToken: 'test-guest-rag' });
      expect(session).toBeDefined();
      expect(session.customerMemory).toBeDefined();
      expect(session.prediction).toBeDefined();
      expect(Array.isArray(session.recommendations)).toBe(true);
    });
  });
});

