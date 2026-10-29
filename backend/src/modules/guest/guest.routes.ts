import { FastifyPluginAsync } from 'fastify';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { createGuestSchema } from '../../shared/types/auth';
import * as authService from '../auth/auth.service';
import { ValidationError } from '../../shared/errors';

/**
 * Sesiones de invitado: permiten pedir sin registro.
 * El token dura 30 días y se guarda en localStorage del cliente.
 */
export const guestRoutes: FastifyPluginAsync = async (app) => {
  // ─── POST /api/guest/session ──────────────────────────
  app.post('/session', {
    schema: {
      body: zodToJsonSchema(createGuestSchema),
      tags: ['guest'],
      summary: 'Crear sesión de invitado',
    },
  }, async (request, reply) => {
    const parsed = createGuestSchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      throw new ValidationError('Datos de invitado inválidos');
    }
    const result = await authService.createGuestSession(parsed.data);
    return reply.code(201).send(result);
  });

  // ─── GET /api/guest/session/:token ────────────────────
  app.get('/session/:token', {
    schema: { tags: ['guest'], summary: 'Validar sesión de invitado' },
  }, async (request) => {
    const { token } = request.params as { token: string };
    const session = await authService.getGuestSession(token);
    return {
      valid: true,
      name: session.name,
      phone: session.phone,
      expiresAt: session.expiresAt,
    };
  });
};