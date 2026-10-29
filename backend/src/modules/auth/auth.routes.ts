import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { loginSchema, registerSchema } from '../../shared/types/auth';
import * as authService from './auth.service';
import { authenticatePlugin } from '../../plugins/auth';
import { ValidationError } from '../../shared/errors';

export const authRoutes: FastifyPluginAsync = async (app) => {
  await app.register(authenticatePlugin);

  // ─── POST /api/auth/register ──────────────────────────
  app.post('/register', {
    schema: {
      body: zodToJsonSchema(registerSchema),
      tags: ['auth'],
      summary: 'Registro de cliente',
    },
  }, async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError('Datos de registro inválidos');
    }
    const result = await authService.register(app, parsed.data);
    return reply.code(201).send(result);
  });

  // ─── POST /api/auth/login ─────────────────────────────
  app.post('/login', {
    schema: {
      body: zodToJsonSchema(loginSchema),
      tags: ['auth'],
      summary: 'Inicio de sesión',
    },
  }, async (request) => {
    const parsed = loginSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError('Email o contraseña inválidos');
    }
    return authService.login(app, parsed.data);
  });

  // ─── POST /api/auth/refresh ───────────────────────────
  app.post('/refresh', {
    schema: {
      body: zodToJsonSchema(z.object({ refreshToken: z.string() })),
      tags: ['auth'],
      summary: 'Renovar token de sesión',
    },
  }, async (request) => {
    const body = request.body as { refreshToken?: string } | undefined;
    if (!body?.refreshToken) {
      throw new ValidationError('refreshToken requerido');
    }
    return authService.refresh(app, body.refreshToken);
  });

  // ─── GET /api/auth/me ─────────────────────────────────
  app.get('/me', {
    preHandler: [app.authenticate],
    schema: { tags: ['auth'], summary: 'Perfil del cliente autenticado' },
  }, async (request) => {
    return authService.getProfile(request.userId!);
  });
};