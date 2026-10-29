'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Hook de stock en tiempo real.
 * Se conecta al WebSocket /ws/stock y ejecuta onStockUpdate
 * cada vez que un producto cambia de stock/disponibilidad.
 *
 * El hook reconecta automáticamente si se cae la conexión.
 */
export function useStockWebSocket(onStockUpdate?: (products: StockUpdatePayload[]) => void) {
  const [connected, setConnected] = useState(false);
  const cbRef = useRef(onStockUpdate);
  cbRef.current = onStockUpdate;

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'stock-update' && Array.isArray(data.products)) {
        cbRef.current?.(data.products);
      }
    } catch {
      // mensaje no JSON — ignorar
    }
  }, []);

  useEffect(() => {
    let ws: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let closed = false;

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const wsUrl = API_URL.replace(/^http/, 'ws') + '/ws/stock';

    function connect() {
      if (closed) return;
      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => setConnected(true);
        ws.onclose = () => {
          setConnected(false);
          // Reconectar en 3s
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

export interface StockUpdatePayload {
  id: number;
  stock: number;
  isAvailable: boolean;
}