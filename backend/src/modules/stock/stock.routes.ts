import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  listStock,
  listLowStock,
  updateStock,
  decrementStock,
  bulkUpdateStock,
  LOW_STOCK_THRESHOLD,
} from './stock.service';
import { authenticatePlugin, requireRole } from '../../plugins/auth';
import { env } from '../../config/env';
import { ValidationError } from '../../shared/errors';

const idParamSchema = {
  type: 'object',
  properties: { id: { type: 'integer' } },
  required: ['id'],
} as const;

const updateStockSchema = z.object({
  stock: z.number().int().min(0).max(999999),
});

const bulkStockSchema = z.object({
  updates: z
    .array(z.object({ id: z.number().int().positive(), stock: z.number().int().min(0).max(999999) }))
    .min(1)
    .max(100),
});

export const stockRoutes: FastifyPluginAsync = async (app) => {
  await app.register(authenticatePlugin);

  const adminGuard = async (request: any) => {
    if (env.NODE_ENV === 'development' && !request.headers.authorization) {
      request.userRole = 'admin';
      return;
    }
    await app.authenticate(request);
    await requireRole('admin')(request);
  };

  // ═══ ADMIN ════════════════════════════════════════════

  // ─── GET /api/stock ───────────────────────────────────
  app.get('/', {
    preHandler: [adminGuard],
    schema: {
      tags: ['stock-admin'],
      summary: 'Listar stock de todos los productos (admin)',
    },
  }, async () => {
    return listStock();
  });

  // ─── GET /api/stock/low ───────────────────────────────
  app.get('/low', {
    preHandler: [adminGuard],
    schema: {
      tags: ['stock-admin'],
      summary: `Productos con stock bajo (< ${LOW_STOCK_THRESHOLD})`,
    },
  }, async () => {
    return listLowStock();
  });

  // ─── PATCH /api/stock/:id ─────────────────────────────
  app.patch('/:id', {
    preHandler: [adminGuard],
    schema: {
      tags: ['stock-admin'],
      summary: 'Actualizar stock de un producto',
      params: idParamSchema,
      body: zodToJsonSchema(updateStockSchema),
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    const productId = Number(id);
    const parsed = updateStockSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError('Stock inválido');
    }
    return updateStock(productId, parsed.data.stock);
  });

  // ─── POST /api/stock/:id/decrement ────────────────────
  // Descuenta stock por venta presencial (mostrador / caja física)
  app.post('/:id/decrement', {
    preHandler: [adminGuard],
    schema: {
      tags: ['stock-admin'],
      summary: 'Descontar stock por venta presencial en caja',
      params: idParamSchema,
      body: zodToJsonSchema(
        z.object({
          quantity: z.number().int().min(1).max(999).default(1),
          reason: z.string().optional(),
        }),
      ),
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    const productId = Number(id);
    const body = request.body as { quantity?: number; reason?: string } | undefined;
    const quantity = body?.quantity ?? 1;
    return decrementStock(productId, quantity);
  });

  // ─── POST /api/stock/bulk ─────────────────────────────
  app.post('/bulk', {
    preHandler: [adminGuard],
    schema: {
      tags: ['stock-admin'],
      summary: 'Actualizar stock de varios productos (inventario)',
      body: zodToJsonSchema(bulkStockSchema),
    },
  }, async (request) => {
    const parsed = bulkStockSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError('Datos de inventario inválidos');
    }
    return bulkUpdateStock(parsed.data.updates);
  });
};