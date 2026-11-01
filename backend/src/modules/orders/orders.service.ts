import { and, asc, desc, eq, inArray, sql } from 'drizzle-orm';
import { getDb } from '../../config/db';
import { orders, orderItems, products, productAddons, users } from '../../config/schema';
import { env } from '../../config/env';
import { NotFoundError, BadRequestError, UnauthorizedError } from '../../shared/errors';
import { decrementStock } from '../stock/stock.service';
import { broadcastOrderEvent, broadcastNewOrder, broadcastOrderStatusUpdate } from '../stock/stock.hub';
import { recordInteraction } from '../agents/a1-rag.service';
import type { Order, OrderItem } from '../../config/schema';

// ─── Tipos ──────────────────────────────────────────────
export interface CreateOrderItemInput {
  productId: number;
  quantity: number;
  addonIds?: number[];
  notes?: string;
}

export interface CreateOrderInput {
  items: CreateOrderItemInput[];
  paymentMethod: 'stripe' | 'cash_on_delivery';
  deliveryAddress?: string;
  notes?: string;
  guestToken?: string;
  userId?: number;
}

function generateOrderNumber(): string {
  const now = new Date();
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `GOR-${ymd}-${rand}`;
}

interface AddonInfo {
  id: number;
  name: string;
  price: string;
}

function parseMoney(value: string): number {
  return parseFloat(value) || 0;
}

/**
 * Crea un pedido validando precios contra la BD (nunca confía en el cliente).
 */
export async function createOrder(input: CreateOrderInput) {
  const db = getDb();

  if (!input.items || input.items.length === 0) {
    throw new BadRequestError('El pedido no tiene productos');
  }
  if (input.paymentMethod === 'cash_on_delivery' && !input.userId) {
    throw new UnauthorizedError('El pago contra entrega requiere iniciar sesión');
  }

  // ── Validar productos y precios reales ────────────────
  const productIds = [...new Set(input.items.map((i) => i.productId))];
  const productRows = await db
    .select()
    .from(products)
    .where(inArray(products.id, productIds));

  const productMap = new Map(productRows.map((p) => [p.id, p]));

  // ── Validar addons ────────────────────────────────────
  const allAddonIds = [...new Set(input.items.flatMap((i) => i.addonIds ?? []))];
  let addonMap = new Map<number, AddonInfo>();
  if (allAddonIds.length > 0) {
    const addonRows = await db
      .select()
      .from(productAddons)
      .where(inArray(productAddons.id, allAddonIds));
    addonMap = new Map(addonRows.map((a) => [a.id, a]));
  }

  // ── Construir items con precios reales ────────────────
  let subtotal = 0;
  let maxPrepTime = 0;

  const itemsToInsert = input.items.map((item) => {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new BadRequestError(`Producto ${item.productId} no existe`);
    }
    if (!product.isAvailable) {
      throw new BadRequestError(`El producto "${product.name}" no está disponible`);
    }
    if (item.quantity < 1 || item.quantity > 50) {
      throw new BadRequestError('Cantidad inválida');
    }

    const addons = (item.addonIds ?? [])
      .map((id) => addonMap.get(id))
      .filter((a): a is AddonInfo => Boolean(a));

    const addonsTotal = addons.reduce((s, a) => s + parseMoney(a.price), 0);
    const unitPrice = parseMoney(product.price);
    const totalPrice = (unitPrice + addonsTotal) * item.quantity;

    subtotal += totalPrice;
    maxPrepTime = Math.max(maxPrepTime, product.preparationTime ?? 15);

    return {
      productId: product.id,
      productName: product.name,
      quantity: item.quantity,
      unitPrice: unitPrice.toFixed(2),
      addons: addons.map((a) => ({ id: a.id, name: a.name, price: a.price })),
      notes: item.notes ?? null,
      totalPrice: totalPrice.toFixed(2),
    };
  });

  const deliveryFee = 0; // Fase 4: delivery configurable
  const total = subtotal + deliveryFee;
  const estimatedTime = maxPrepTime + 10;

  // ── Insertar pedido ───────────────────────────────────
  const [order] = await db
    .insert(orders)
    .values({
      orderNumber: generateOrderNumber(),
      userId: input.userId ?? null,
      guestToken: input.guestToken ?? null,
      status: 'pending',
      paymentMethod: input.paymentMethod,
      paymentStatus: 'pending',
      subtotal: subtotal.toFixed(2),
      deliveryFee: deliveryFee.toFixed(2),
      total: total.toFixed(2),
      notes: input.notes ?? null,
      deliveryAddress: input.deliveryAddress ?? null,
      estimatedTime,
    })
    .returning();

  await db.insert(orderItems).values(
    itemsToInsert.map((i) => ({ ...i, orderId: order.id })),
  );

  // Actualizar lastOrderAt del usuario si existe
  if (input.userId) {
    await db
      .update(users)
      .set({ lastOrderAt: sql`now()` })
      .where(eq(users.id, input.userId));
  }

  // ── Descontar stock en tiempo real (Fase 4) ──────────
  // Si un producto se agota aquí, el broadcast lo quita de la carta en vivo.
  for (const item of itemsToInsert) {
    await decrementStock(item.productId, item.quantity);
  }

  const createdOrderWithDetails = await getOrderById(order.id, {
    userId: input.userId,
    guestToken: input.guestToken,
    skipAuth: true,
  });

  // Notificar a Cocina / KDS y clientes en tiempo real (Fase 5)
  broadcastNewOrder(createdOrderWithDetails);
  broadcastOrderEvent({ id: order.id, orderNumber: order.orderNumber, status: order.status });

  // Registro automático en Memoria Semántica A1 RAG (Fase 8)
  recordInteraction({
    userId: input.userId,
    guestToken: input.guestToken,
    type: 'order',
    metadata: {
      orderId: order.id,
      orderNumber: order.orderNumber,
      total: order.total,
      paymentMethod: input.paymentMethod,
      items: itemsToInsert.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
      })),
    },
  }).catch((err) => console.error('[A1 Interaction Record Error]', err));

  // ── Stripe (si aplica) ────────────────────────────────
  let stripePayload: { clientSecret?: string; demoMode?: boolean } = {};
  if (input.paymentMethod === 'stripe') {
    if (env.STRIPE_SECRET_KEY) {
      const Stripe = (await import('stripe')).default;
      const stripe = new Stripe(env.STRIPE_SECRET_KEY);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(total * 100),
        currency: 'pen',
        metadata: { orderId: String(order.id), orderNumber: order.orderNumber },
        automatic_payment_methods: { enabled: true },
      });
      await db
        .update(orders)
        .set({ stripePaymentIntentId: paymentIntent.id })
        .where(eq(orders.id, order.id));
      stripePayload = { clientSecret: paymentIntent.client_secret ?? undefined };
    } else {
      // Modo demo: sin key de Stripe configurada
      stripePayload = { demoMode: true };
    }
  }

  return {
    order: createdOrderWithDetails,
    stripe: stripePayload,
  };
}

// ─── Consultas ──────────────────────────────────────────
function canAccess(order: Order, ctx: { userId?: number; guestToken?: string }): boolean {
  if (ctx.userId && order.userId === ctx.userId) return true;
  if (ctx.guestToken && order.guestToken === ctx.guestToken) return true;
  if (!order.userId && !order.guestToken) return true;
  return false;
}

export async function getOrderById(
  id: number,
  ctx?: { userId?: number; guestToken?: string; skipAuth?: boolean },
) {
  const db = getDb();
  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.id, id))
    .limit(1);

  if (!order) {
    throw new NotFoundError('Pedido no encontrado');
  }
  if (!ctx?.skipAuth && !canAccess(order, ctx ?? {})) {
    throw new UnauthorizedError('No tienes acceso a este pedido');
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .orderBy(asc(orderItems.id));

  return {
    ...order,
    items: items.map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      addons: i.addons ?? [],
      notes: i.notes,
      totalPrice: i.totalPrice,
    })),
  };
}

export async function listMyOrders(ctx: { userId?: number; guestToken?: string }) {
  const db = getDb();

  if (!ctx.userId && !ctx.guestToken) {
    throw new UnauthorizedError('Necesitas una sesión para ver pedidos');
  }

  const conditions = ctx.userId
    ? eq(orders.userId, ctx.userId)
    : eq(orders.guestToken, ctx.guestToken!);

  const rows = await db
    .select()
    .from(orders)
    .where(conditions)
    .orderBy(desc(orders.createdAt))
    .limit(50);

  return rows.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    paymentMethod: o.paymentMethod,
    paymentStatus: o.paymentStatus,
    total: o.total,
    estimatedTime: o.estimatedTime,
    createdAt: o.createdAt,
  }));
}

// ─── Admin / cocina ────────────────────────────────────
export async function listActiveKitchenOrders() {
  const db = getDb();
  // Pedidos activos: pending, confirmed, preparing, ready
  const activeOrders = await db
    .select()
    .from(orders)
    .where(inArray(orders.status, ['pending', 'confirmed', 'preparing', 'ready']))
    .orderBy(asc(orders.createdAt));

  if (activeOrders.length === 0) return [];

  const orderIds = activeOrders.map((o) => o.id);
  const items = await db
    .select()
    .from(orderItems)
    .where(inArray(orderItems.orderId, orderIds))
    .orderBy(asc(orderItems.id));

  const itemsByOrder = new Map<number, typeof items>();
  for (const item of items) {
    if (!itemsByOrder.has(item.orderId)) {
      itemsByOrder.set(item.orderId, []);
    }
    itemsByOrder.get(item.orderId)!.push(item);
  }

  return activeOrders.map((o) => ({
    ...o,
    items: (itemsByOrder.get(o.id) ?? []).map((i) => ({
      id: i.id,
      productId: i.productId,
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      addons: (i.addons as { id: number; name: string; price: string }[]) ?? [],
      notes: i.notes,
      totalPrice: i.totalPrice,
    })),
  }));
}

export async function getOrderForTicket(orderId: number) {
  const db = getDb();
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) {
    throw new NotFoundError('Pedido no encontrado');
  }

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .orderBy(asc(orderItems.id));

  return {
    ...order,
    items: items.map((i) => ({
      productName: i.productName,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      totalPrice: i.totalPrice,
      addons: (i.addons as { name: string; price: string }[]) ?? [],
      notes: i.notes,
    })),
  };
}

async function notifyCustomerWhatsApp(order: Order) {
  const statusMessages: Record<string, string> = {
    confirmed: `🍗 ¡Tu pedido #${order.orderNumber} en gorDOS ha sido confirmado! Estamos preparando los ingredientes.`,
    preparing: `🔥 ¡Tu pedido #${order.orderNumber} ya está en la brasa y cocina de gorDOS!`,
    ready: `✨ ¡Tu pedido #${order.orderNumber} está LISTO! ${order.deliveryAddress ? 'Va en camino a tu domicilio.' : 'Puedes pasar a recogerlo al mostrador.'}`,
    delivered: `🍔 ¡Pedido #${order.orderNumber} entregado! Esperamos que lo disfrutes. ¡Muchas gracias por elegir gorDOS!`,
    cancelled: `❌ Tu pedido #${order.orderNumber} ha sido cancelado. Si tienes dudas, contáctanos.`,
  };

  const message = statusMessages[order.status];
  if (!message) return;

  if (env.WHATSAPP_TOKEN) {
    try {
      console.log(`[WhatsApp Cloud API] Enviando notificación para pedido ${order.orderNumber}`);
    } catch (err) {
      console.error('[WhatsApp Cloud API Error]', err);
    }
  } else {
    console.log(`📲 [WhatsApp SIMULADO] Pedido #${order.orderNumber} -> Estado: ${order.status.toUpperCase()}`);
    console.log(`   Mensaje: "${message}"`);
  }
}

export async function updateOrderStatus(id: number, status: Order['status']) {
  const db = getDb();
  const [existing] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  if (!existing) {
    throw new NotFoundError('Pedido no encontrado');
  }

  const updates: Partial<Order> = { status };
  if (status === 'confirmed') updates.confirmedAt = new Date();
  if (status === 'ready') updates.readyAt = new Date();

  const [updated] = await db
    .update(orders)
    .set({ ...updates, updatedAt: sql`now()` })
    .where(eq(orders.id, id))
    .returning();

  // Emite actualización en tiempo real para KDS y pantalla del cliente
  broadcastOrderStatusUpdate({
    id: updated.id,
    orderNumber: updated.orderNumber,
    status: updated.status,
    readyAt: updated.readyAt ? updated.readyAt.toISOString() : null,
    confirmedAt: updated.confirmedAt ? updated.confirmedAt.toISOString() : null,
  });

  // Notificación al cliente (WhatsApp simulación / live)
  notifyCustomerWhatsApp(updated).catch(() => {});

  return updated;
}

export async function confirmStripePayment(orderId: number, paymentIntentId: string) {
  const db = getDb();
  return db
    .update(orders)
    .set({
      paymentStatus: 'paid',
      stripePaymentIntentId: paymentIntentId,
      status: 'confirmed',
      confirmedAt: new Date(),
      updatedAt: sql`now()`,
    })
    .where(and(eq(orders.id, orderId), eq(orders.stripePaymentIntentId, paymentIntentId)))
    .returning();
}

export type { Order, OrderItem };