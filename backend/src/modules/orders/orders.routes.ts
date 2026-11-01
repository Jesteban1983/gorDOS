import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  createOrder,
  getOrderById,
  listMyOrders,
  listActiveKitchenOrders,
  getOrderForTicket,
  updateOrderStatus,
  confirmStripePayment,
} from './orders.service';
import {
  formatKitchenTicket,
  formatCashierTicket,
  buildEscPosBuffer,
} from './escpos.service';
import { broadcastPrintJob } from '../stock/stock.hub';
import { env } from '../../config/env';
import { authenticatePlugin, authOptionalHook, requireRole } from '../../plugins/auth';
import { ValidationError, UnauthorizedError } from '../../shared/errors';

// ─── Schemas de params (JSON Schema nativo, sin z.coerce) ─
const idParamSchema = {
  type: 'object',
  properties: { id: { type: 'integer' } },
  required: ['id'],
} as const;

// ─── Schemas ────────────────────────────────────────────
const orderItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(50),
  addonIds: z.array(z.number().int().positive()).optional(),
  notes: z.string().max(200).optional(),
});

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1).max(30),
  paymentMethod: z.enum(['stripe', 'cash_on_delivery']),
  deliveryAddress: z.string().max(500).optional(),
  notes: z.string().max(500).optional(),
  guestToken: z.string().max(255).optional(),
});

const updateStatusSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled']),
});

// ─── Rutas ──────────────────────────────────────────────
export const orderRoutes: FastifyPluginAsync = async (app) => {
  await app.register(authenticatePlugin);

  // ═══ CLIENTE ══════════════════════════════════════════

  // ─── POST /api/orders ─────────────────────────────────
  // Crea un pedido. Autenticado → userId; invitado → guestToken.
  // Acepta ambos: si el Bearer token es válido usa el userId,
  // si no, usa el guestToken (invitado).
  app.post('/', {
    preHandler: [authOptionalHook],
    schema: {
      tags: ['orders'],
      summary: 'Crear pedido (registrado o invitado)',
      body: zodToJsonSchema(createOrderSchema),
    },
  }, async (request, reply) => {
    const parsed = createOrderSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError('Datos del pedido inválidos');
    }

    // Usuario autenticado → userId; invitado → guestToken
    const ctx = {
      userId: request.userId,
      guestToken: request.userId ? undefined : parsed.data.guestToken,
    };

    const result = await createOrder({ ...parsed.data, ...ctx });
    return reply.code(201).send(result);
  });

  // ─── GET /api/orders/mine ─────────────────────────────
  app.get('/mine', {
    preHandler: [authOptionalHook],
    schema: {
      tags: ['orders'],
      summary: 'Historial de pedidos (por token o userId)',
    },
  }, async (request) => {
    const guestToken = (request.query as { guestToken?: string }).guestToken;
    return listMyOrders({
      userId: request.userId,
      guestToken: request.userId ? undefined : guestToken,
    });
  });

  // ─── GET /api/orders/:id ──────────────────────────────
  app.get('/:id', {
    preHandler: [authOptionalHook],
    schema: {
      tags: ['orders'],
      summary: 'Detalle de pedido',
      params: idParamSchema,
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    const orderId = Number(id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      throw new ValidationError('Id de pedido inválido');
    }
    const guestToken = (request.query as { guestToken?: string }).guestToken;
    return getOrderById(orderId, {
      userId: request.userId,
      guestToken: request.userId ? undefined : guestToken,
    });
  });

  // ═══ COCINA / ADMIN ═══════════════════════════════════

  const staffGuard = async (request: any) => {
    // En desarrollo permitimos operar la pantalla de cocina sin token si no se envía
    if (env.NODE_ENV === 'development' && !request.headers.authorization) {
      request.userRole = 'kitchen';
      return;
    }
    await app.authenticate(request);
    await requireRole('admin', 'kitchen', 'cashier')(request);
  };

  // ─── GET /api/orders/kitchen/active ───────────────────
  // Obtiene todos los pedidos activos para la pantalla de cocina (KDS)
  app.get('/kitchen/active', {
    preHandler: [staffGuard],
    schema: {
      tags: ['orders-kitchen'],
      summary: 'Listar pedidos activos para cocina (pending, confirmed, preparing, ready)',
    },
  }, async () => {
    return listActiveKitchenOrders();
  });

  // ─── GET /api/orders/:id/ticket ───────────────────────
  // Genera ticket en texto plano y formato binario ESC/POS (Base64)
  app.get('/:id/ticket', {
    preHandler: [staffGuard],
    schema: {
      tags: ['orders-kitchen'],
      summary: 'Obtener ticket comanda o caja (ESC/POS y texto plano)',
      params: idParamSchema,
      querystring: zodToJsonSchema(
        z.object({ type: z.enum(['kitchen', 'cashier']).default('kitchen') }),
      ),
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    const orderId = Number(id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      throw new ValidationError('Id de pedido inválido');
    }
    const type = ((request.query as { type?: 'kitchen' | 'cashier' })?.type ?? 'kitchen') as
      | 'kitchen'
      | 'cashier';

    const orderData = await getOrderForTicket(orderId);
    const textTicket =
      type === 'kitchen' ? formatKitchenTicket(orderData) : formatCashierTicket(orderData);
    const escposBuffer = buildEscPosBuffer(orderData, type);

    return {
      orderId,
      orderNumber: orderData.orderNumber,
      type,
      text: textTicket,
      escposBase64: escposBuffer.toString('base64'),
    };
  });

  // ─── POST /api/orders/:id/print ───────────────────────
  // Dispara el comando de impresión a impresoras térmicas conectadas por WebSocket
  app.post('/:id/print', {
    preHandler: [staffGuard],
    schema: {
      tags: ['orders-kitchen'],
      summary: 'Enviar orden de impresión a comanderas conectadas por WebSocket',
      params: idParamSchema,
      body: zodToJsonSchema(
        z.object({ type: z.enum(['kitchen', 'cashier']).default('kitchen') }),
      ),
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    const orderId = Number(id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      throw new ValidationError('Id de pedido inválido');
    }
    const body = (request.body as { type?: 'kitchen' | 'cashier' }) ?? {};
    const type = body.type ?? 'kitchen';

    const orderData = await getOrderForTicket(orderId);
    const textTicket =
      type === 'kitchen' ? formatKitchenTicket(orderData) : formatCashierTicket(orderData);
    const escposBuffer = buildEscPosBuffer(orderData, type);

    broadcastPrintJob({
      orderId,
      orderNumber: orderData.orderNumber,
      type,
      text: textTicket,
      escposBase64: escposBuffer.toString('base64'),
    });

    return {
      success: true,
      orderNumber: orderData.orderNumber,
      type,
      message: `Comanda de ${type} enviada a impresoras térmicas`,
    };
  });

  // ─── PATCH /api/orders/:id/status ─────────────────────
  app.patch('/:id/status', {
    preHandler: [staffGuard],
    schema: {
      tags: ['orders-kitchen'],
      summary: 'Actualizar estado del pedido (cocina/admin)',
      params: idParamSchema,
      body: zodToJsonSchema(updateStatusSchema),
    },
  }, async (request) => {
    const { id } = request.params as { id: string };
    const orderId = Number(id);
    if (!Number.isInteger(orderId) || orderId <= 0) {
      throw new ValidationError('Id de pedido inválido');
    }
    const parsed = updateStatusSchema.safeParse(request.body);
    if (!parsed.success) {
      throw new ValidationError('Estado inválido');
    }
    return updateOrderStatus(orderId, parsed.data.status);
  });

  // ─── POST /api/orders/stripe/confirm ──────────────────
  // Webhook manual (modo demo): confirma pago Stripe por paymentIntentId
  app.post('/stripe/confirm', {
    preHandler: [app.authenticate, requireRole('admin')],
    schema: {
      tags: ['orders-kitchen'],
      summary: 'Confirmar pago Stripe (webhook/demo)',
    },
  }, async (request) => {
    const body = request.body as { orderId?: number; paymentIntentId?: string } | undefined;
    if (!body?.orderId || !body?.paymentIntentId) {
      throw new ValidationError('orderId y paymentIntentId requeridos');
    }
    const [updated] = await confirmStripePayment(body.orderId, body.paymentIntentId);
    if (!updated) {
      throw new UnauthorizedError('El paymentIntent no coincide con el pedido');
    }
    return updated;
  });
};