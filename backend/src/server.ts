import Fastify, { FastifyError } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import websocket from '@fastify/websocket';
import { env } from './config/env';
import { getDb } from './config/db';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { AppError } from './shared/errors';
import { authRoutes } from './modules/auth/auth.routes';
import { guestRoutes } from './modules/guest/guest.routes';
import { userRoutes } from './modules/users/user.routes';
import { catalogRoutes } from './modules/products/catalog.routes';
import { orderRoutes } from './modules/orders/orders.routes';
import { stockRoutes } from './modules/stock/stock.routes';
import { registerStockHub } from './modules/stock/stock.hub';

declare module 'fastify' {
  interface FastifyInstance {
    db: NodePgDatabase;
  }
}

const app = Fastify({ logger: true });

// ─── Plugins ────────────────────────────────────────────
await app.register(cors, { origin: env.CORS_ORIGIN, credentials: true });
await app.register(jwt, { secret: env.JWT_SECRET });
await app.register(websocket);
await app.register(swagger, {
  openapi: {
    info: { title: 'gorDOS API', version: '0.1.0', description: 'Sistema de pedidos inteligente' },
    servers: [{ url: `http://localhost:${env.PORT}` }],
  },
});
await app.register(swaggerUi, { routePrefix: '/docs' });

// ─── Error handler global ──────────────────────────────
// Convierte AppError en respuestas JSON con su statusCode real
// (409 para conflicto, 401 no autorizado, etc.)
app.setErrorHandler((error: FastifyError, request, reply) => {
  if (error instanceof AppError) {
    return reply.code(error.statusCode).send({
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
    });
  }
  // Zod/validación de Fastify
  if (error.validation) {
    return reply.code(400).send({
      code: 'VALIDATION_ERROR',
      message: 'Datos inválidos',
      statusCode: 400,
      details: error.validation,
    });
  }
  app.log.error(error);
  return reply.code(500).send({
    code: 'INTERNAL_ERROR',
    message: 'Error interno del servidor',
    statusCode: 500,
  });
});

// ─── Decorate with DB ───────────────────────────────────
const db = getDb();
app.decorate('db', db);

// ─── Routes ─────────────────────────────────────────────
app.register(authRoutes, { prefix: '/api/auth' });
app.register(guestRoutes, { prefix: '/api/guest' });
app.register(userRoutes, { prefix: '/api/users' });
app.register(catalogRoutes, { prefix: '/api/catalog' });
app.register(orderRoutes, { prefix: '/api/orders' });
app.register(stockRoutes, { prefix: '/api/stock' });
registerStockHub(app); // GET /ws/stock

// ─── Health ─────────────────────────────────────────────
app.get('/api/health', async () => ({ status: 'ok', service: 'gorDOS', timestamp: new Date().toISOString() }));

// ─── Start ──────────────────────────────────────────────
const start = async () => {
  try {
    await app.listen({ port: env.PORT, host: env.HOST });
    console.log(`🍔 gorDOS API corriendo en http://${env.HOST}:${env.PORT}`);
    console.log(`📖 Documentación en http://localhost:${env.PORT}/docs`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();