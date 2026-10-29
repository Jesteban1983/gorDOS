import { FastifyPluginAsync, FastifyRequest, FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { UnauthorizedError } from '../shared/errors';
import type { TokenPayload } from '../shared/types/auth';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: number;
    userRole?: string;
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest) => Promise<void>;
  }
}

/**
 * Plugin de autenticación: verifica el Bearer token (access JWT)
 * y expone req.userId / req.userRole.
 */
export const authenticatePlugin: FastifyPluginAsync = fp(async (app) => {
  app.decorate('authenticate', async function (this: FastifyInstance, request: FastifyRequest) {
    try {
      const decoded = await request.jwtVerify<TokenPayload>();
      if (decoded.type !== 'access') {
        throw new UnauthorizedError('Token inválido');
      }
      request.userId = decoded.userId;
      request.userRole = decoded.role;
    } catch {
      throw new UnauthorizedError('Sesión expirada o inválida');
    }
  });
});

/**
 * Plugin de autorización por rol (se usa junto a authenticate).
 */
export function requireRole(...roles: string[]) {
  return async function (request: { userRole?: string }) {
    if (!request.userRole || !roles.includes(request.userRole)) {
      throw new UnauthorizedError('No tienes permisos para esta acción');
    }
  };
}