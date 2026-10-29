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

export function getStockClientCount(): number {
  return clients.size;
}