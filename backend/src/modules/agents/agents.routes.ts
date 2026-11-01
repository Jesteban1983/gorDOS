import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  orchestrateMenuSession,
  handleInteractionEvent,
  getCustomerContext,
  predictCustomerOrder,
  getRecommendations,
  getDemandAnalytics,
} from './a0-orchestrator.service';
import { authenticateOptional, authOptionalHook } from '../../plugins/auth';
import { ValidationError } from '../../shared/errors';

export const agentRoutes: FastifyPluginAsync = async (app) => {
  await app.register(authenticateOptional);

  // ─── GET /api/agents/session ──────────────────────────
  // Orquestación completa de sesión: Memoria (A1) + Predicción (A2) + Recomendaciones (A3)
  app.get('/session', {
    preHandler: [authOptionalHook],
    schema: {
      tags: ['agents'],
      summary: 'Orquestar sesión inteligente del cliente (A0)',
      querystring: zodToJsonSchema(
        z.object({
          guestToken: z.string().optional(),
          cartProductIds: z.string().optional(), // separados por coma "27,30"
        }),
      ),
    },
  }, async (request) => {
    const q = request.query as { guestToken?: string; cartProductIds?: string };
    const cartIds = q.cartProductIds
      ? q.cartProductIds.split(',').map((id) => Number(id)).filter((id) => !isNaN(id))
      : [];

    return orchestrateMenuSession({
      userId: request.userId,
      guestToken: request.userId ? undefined : q.guestToken,
      cartProductIds: cartIds,
    });
  });

  // ─── POST /api/agents/interaction ─────────────────────
  // A1: Registrar evento de interacción para memoria y RAG
  app.post('/interaction', {
    preHandler: [authOptionalHook],
    schema: {
      tags: ['agents'],
      summary: 'Registrar interacción de cliente para memoria semántica (A1)',
      body: zodToJsonSchema(
        z.object({
          guestToken: z.string().optional(),
          type: z.enum(['order', 'view', 'search', 'click']),
          metadata: z.record(z.unknown()).default({}),
        }),
      ),
    },
  }, async (request, reply) => {
    const body = request.body as {
      guestToken?: string;
      type: 'order' | 'view' | 'search' | 'click';
      metadata: Record<string, unknown>;
    };

    const res = await handleInteractionEvent({
      userId: request.userId,
      guestToken: request.userId ? undefined : body.guestToken,
      type: body.type,
      metadata: body.metadata,
    });

    return reply.code(201).send(res);
  });

  // ─── GET /api/agents/prediction ───────────────────────
  // A2: Predicción de próximo pedido ("¿Lo de siempre?")
  app.get('/prediction', {
    preHandler: [authOptionalHook],
    schema: {
      tags: ['agents'],
      summary: 'Predecir próximo pedido con modelo probabilístico (A2)',
      querystring: zodToJsonSchema(z.object({ guestToken: z.string().optional() })),
    },
  }, async (request) => {
    const q = request.query as { guestToken?: string };
    const predictions = await predictCustomerOrder(
      request.userId,
      request.userId ? undefined : q.guestToken,
    );
    return {
      topPrediction: predictions[0] || null,
      predictions,
    };
  });

  // ─── GET /api/agents/recommendations ──────────────────
  // A3: Recomendador contextual y venta cruzada
  app.get('/recommendations', {
    schema: {
      tags: ['agents'],
      summary: 'Obtener sugerencias contextuales de acompañamientos y bebidas (A3)',
      querystring: zodToJsonSchema(
        z.object({
          productIds: z.string().optional(), // "27,30"
          limit: z.coerce.number().int().min(1).max(10).default(4),
        }),
      ),
    },
  }, async (request) => {
    const q = request.query as { productIds?: string; limit?: number };
    const ids = q.productIds
      ? q.productIds.split(',').map((id) => Number(id)).filter((id) => !isNaN(id))
      : [];
    const recommendations = await getRecommendations(ids, q.limit ?? 4);
    return { recommendations };
  });

  // ─── GET /api/agents/memory ───────────────────────────
  // A1: Obtener perfil de memoria del cliente
  app.get('/memory', {
    preHandler: [authOptionalHook],
    schema: {
      tags: ['agents'],
      summary: 'Obtener perfil de memoria y tags del cliente (A1)',
      querystring: zodToJsonSchema(z.object({ guestToken: z.string().optional() })),
    },
  }, async (request) => {
    const q = request.query as { guestToken?: string };
    return getCustomerContext(
      request.userId,
      request.userId ? undefined : q.guestToken,
    );
  });

  // ─── GET /api/agents/analytics/demand ─────────────────
  // A4: Reporte de análisis de demanda y picos de horarios
  app.get('/analytics/demand', {
    schema: {
      tags: ['agents'],
      summary: 'Análisis de demanda por horarios y franjas (A4)',
    },
  }, async () => {
    return getDemandAnalytics();
  });
};

