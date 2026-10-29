import { FastifyPluginAsync } from 'fastify';
import * as authService from '../auth/auth.service';
import { authenticatePlugin, requireRole } from '../../plugins/auth';

export const userRoutes: FastifyPluginAsync = async (app) => {
  await app.register(authenticatePlugin);

  // ─── GET /api/users/profile ───────────────────────────
  app.get('/profile', {
    preHandler: [app.authenticate],
    schema: { tags: ['users'], summary: 'Obtener mi perfil' },
  }, async (request) => {
    return authService.getProfile(request.userId!);
  });

  // ─── GET /api/users/me/orders (placeholder Fase 3) ────
  app.get('/me/orders', {
    preHandler: [app.authenticate],
    schema: { tags: ['users'], summary: 'Historial de pedidos del cliente' },
  }, async (request) => {
    // Fase 3: devolver pedidos reales con paginación
    return { orders: [], pagination: { page: 1, limit: 20, total: 0 } };
  });

  // ─── GET /api/users (solo admin) ──────────────────────
  app.get('/', {
    preHandler: [app.authenticate, requireRole('admin')],
    schema: { tags: ['users'], summary: 'Listar usuarios (admin)' },
  }, async () => {
    return { users: [] }; // Fase 7: panel admin
  });
};