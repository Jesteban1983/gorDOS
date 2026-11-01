import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  getDashboardMetrics,
  listAdminOrders,
  listCustomers,
  toggleCustomerActive,
  exportOrdersCsv,
  exportProductsCsv,
} from './admin.service';
import { updateOrderStatus } from '../orders/orders.service';
import { authenticatePlugin, requireRole } from '../../plugins/auth';
import { env } from '../../config/env';
import { ValidationError } from '../../shared/errors';

export const adminRoutes: FastifyPluginAsync = async (app) => {
  await app.register(authenticatePlugin);

  const adminGuard = async (request: any) => {
    if (env.NODE_ENV === 'development' && !request.headers.authorization) {
      request.userRole = 'admin';
      return;
    }
    await app.authenticate(request);
    await requireRole('admin')(request);
  };

  // ─── 7.1 GET /api/admin/metrics ───────────────────────
  app.get('/metrics', {
    preHandler: [adminGuard],
    schema: {
      tags: ['admin'],
      summary: 'Métricas completas del dashboard de administración',
    },
  }, async () => {
    return getDashboardMetrics();
  });

  // ─── 7.3 GET /api/admin/orders ────────────────────────
  app.get('/orders', {
    preHandler: [adminGuard],
    schema: {
      tags: ['admin'],
      summary: 'Listado de todos los pedidos con búsqueda y filtros',
      querystring: zodToJsonSchema(
        z.object({
          status: z.string().optional(),
          search: z.string().optional(),
          page: z.coerce.number().int().min(1).default(1),
          limit: z.coerce.number().int().min(1).max(100).default(20),
        }),
      ),
    },
  }, async (request) => {
    const query = request.query as {
      status?: string;
      search?: string;
      page?: number;
      limit?: number;
    };
    return listAdminOrders(query);
  });

  // ─── 7.3 PATCH /api/admin/orders/:id/status ───────────
  app.patch('/orders/:id/status', {
    preHandler: [adminGuard],
    schema: {
      tags: ['admin'],
      summary: 'Actualizar estado de un pedido desde el panel de admin',
      params: zodToJsonSchema(z.object({ id: z.coerce.number().int().positive() })),
      body: zodToJsonSchema(
        z.object({
          status: z.enum(['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled']),
        }),
      ),
    },
  }, async (request) => {
    const { id } = request.params as { id: number };
    const { status } = request.body as { status: any };
    return updateOrderStatus(id, status);
  });

  // ─── 7.4 GET /api/admin/customers ─────────────────────
  app.get('/customers', {
    preHandler: [adminGuard],
    schema: {
      tags: ['admin'],
      summary: 'Listar clientes registrados con historial y métricas de gasto',
    },
  }, async () => {
    return listCustomers();
  });

  // ─── 7.4 PATCH /api/admin/customers/:id/toggle ────────
  app.patch('/customers/:id/toggle', {
    preHandler: [adminGuard],
    schema: {
      tags: ['admin'],
      summary: 'Activar o desactivar cuenta de cliente',
      params: zodToJsonSchema(z.object({ id: z.coerce.number().int().positive() })),
    },
  }, async (request) => {
    const { id } = request.params as { id: number };
    return toggleCustomerActive(id);
  });

  // ─── 7.6 GET /api/admin/reports/orders/csv ────────────
  app.get('/reports/orders/csv', {
    preHandler: [adminGuard],
    schema: {
      tags: ['admin'],
      summary: 'Descargar reporte de pedidos en formato CSV',
    },
  }, async (_request, reply) => {
    const csvContent = await exportOrdersCsv();
    const filename = `gordos-pedidos-${new Date().toISOString().slice(0, 10)}.csv`;

    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(csvContent);
  });

  // ─── 7.6 GET /api/admin/reports/products/csv ──────────
  app.get('/reports/products/csv', {
    preHandler: [adminGuard],
    schema: {
      tags: ['admin'],
      summary: 'Descargar reporte de catálogo e inventario en formato CSV',
    },
  }, async (_request, reply) => {
    const csvContent = await exportProductsCsv();
    const filename = `gordos-inventario-${new Date().toISOString().slice(0, 10)}.csv`;

    return reply
      .header('Content-Type', 'text/csv; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(csvContent);
  });
};

