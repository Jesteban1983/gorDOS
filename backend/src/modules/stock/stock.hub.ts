import type { FastifyInstance } from 'fastify';
import type WebSocket from 'ws';

/**
 * Hub de WebSocket para stock en tiempo real.
 * - Cliente se conecta a /ws/stock
 * - Recibe eventos { type: 'stock-update', products: [{id, stock, isAvailable}] }
 * - También recibe eventos de pedidos nuevos (para cocina/caja)
 */

export interface StockUpdate {
  id: number;
  stock: number;
  isAvailable: boolean;
}

type StockClient = {
  socket: WebSocket;
  alive: boolean;
};

const clients = new Set<StockClient>();

function safeSend(client: StockClient, payload: string) {
  try {
    if (client.socket.readyState === client.socket.OPEN) {
      client.socket.send(payload);
    }
  } catch {
    clients.delete(client);
  }
}

export function registerStockHub(app: FastifyInstance) {
  app.get('/ws/stock', { websocket: true }, (socket: WebSocket) => {
    const client: StockClient = { socket, alive: true };
    clients.add(client);

    // Confirmación de conexión
    safeSend(client, JSON.stringify({ type: 'connected', message: 'Stock en tiempo real conectado' }));

    socket.on('close', () => {
      clients.delete(client);
    });
    socket.on('error', () => {
      clients.delete(client);
    });
  });
}

export function broadcastStockUpdate(products: StockUpdate[]) {
  if (products.length === 0 || clients.size === 0) return;
  const payload = JSON.stringify({
    type: 'stock-update',
    products,
    at: new Date().toISOString(),
  });
  for (const client of clients) {
    safeSend(client, payload);
  }
}

export function broadcastOrderEvent(order: { id: number; orderNumber: string; status: string }) {
  if (clients.size === 0) return;
  const payload = JSON.stringify({
    type: 'order-event',
    order,
    at: new Date().toISOString(),
  });
  for (const client of clients) {
    safeSend(client, payload);
  }
}

/**
 * Emite evento de nuevo pedido completo a las pantallas de Cocina / Caja (KDS)
 */
export function broadcastNewOrder(order: any) {
  if (clients.size === 0) return;
  const payload = JSON.stringify({
    type: 'new-order',
    order,
    at: new Date().toISOString(),
  });
  for (const client of clients) {
    safeSend(client, payload);
  }
}

/**
 * Emite cambio de estado de un pedido (ej: pending -> preparing -> ready -> delivered)
 * Notifica a Cocina y a la pantalla del cliente (/orders/:id)
 */
export function broadcastOrderStatusUpdate(data: {
  id: number;
  orderNumber: string;
  status: string;
  message?: string;
  readyAt?: string | null;
  confirmedAt?: string | null;
}) {
  if (clients.size === 0) return;
  const payload = JSON.stringify({
    type: 'order-status-update',
    ...data,
    at: new Date().toISOString(),
  });
  for (const client of clients) {
    safeSend(client, payload);
  }
}

/**
 * Emite comanda para impresoras térmicas remotas conectadas al WebSocket
 */
export function broadcastPrintJob(payload: {
  orderId: number;
  orderNumber: string;
  type: 'kitchen' | 'cashier';
  text: string;
  escposBase64: string;
}) {
  if (clients.size === 0) return;
  const msg = JSON.stringify({
    type: 'print-ticket',
    ticketType: payload.type,
    orderId: payload.orderId,
    orderNumber: payload.orderNumber,
    text: payload.text,
    escposBase64: payload.escposBase64,
    at: new Date().toISOString(),
  });
  for (const client of clients) {
    safeSend(client, msg);
  }
}

export function getStockClientCount(): number {
  return clients.size;
}