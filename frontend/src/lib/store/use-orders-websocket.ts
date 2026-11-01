'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type { OrderStatus, OrderView } from '../api/orders';

export interface OrderStatusUpdatePayload {
  id: number;
  orderNumber: string;
  status: OrderStatus;
  readyAt?: string | null;
  confirmedAt?: string | null;
}

export interface PrintTicketPayload {
  orderId: number;
  orderNumber: string;
  type: 'kitchen' | 'cashier';
  text: string;
  escposBase64: string;
}

interface OrdersWebSocketCallbacks {
  onNewOrder?: (order: OrderView) => void;
  onStatusUpdate?: (update: OrderStatusUpdatePayload) => void;
  onPrintTicket?: (ticket: PrintTicketPayload) => void;
}

/**
 * Hook de WebSocket para eventos de pedidos en tiempo real (Cocina, Caja, Seguimiento).
 * Se conecta a /ws/stock y filtra los eventos de pedidos.
 */
export function useOrdersWebSocket(callbacks: OrdersWebSocketCallbacks) {
  const [connected, setConnected] = useState(false);
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'new-order' && data.order) {
        cbRef.current.onNewOrder?.(data.order);
      } else if (data.type === 'order-status-update' && data.id) {
        cbRef.current.onStatusUpdate?.({
          id: data.id,
          orderNumber: data.orderNumber,
          status: data.status,
          readyAt: data.readyAt,
          confirmedAt: data.confirmedAt,
        });
      } else if (data.type === 'print-ticket') {
        cbRef.current.onPrintTicket?.(data);
      }
    } catch {
      // Ignorar errores de parsing
    }
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';
    const wsUrl = API_URL.replace(/^http/, 'ws') + '/ws/stock';

    function connect() {
      if (closed) return;
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => setConnected(true);
        ws.onclose = () => {
          setConnected(false);
          if (!closed) {
            retryTimer = setTimeout(connect, 3000);
          }
        };
        ws.onerror = () => {
          ws?.close();
        };
        ws.onmessage = handleMessage;
      } catch {
        retryTimer = setTimeout(connect, 3000);
      }
    }

    connect();

    return () => {
      closed = true;
      if (retryTimer) clearTimeout(retryTimer);
      ws?.close();
    };
  }, [handleMessage]);

  return { connected };
}

