'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  ordersApi,
  ORDER_STATUS_LABELS,
  PAYMENT_LABELS,
  type OrderView,
  type OrderStatus,
} from '@/lib/api/orders';
import { useOrdersWebSocket, type PrintTicketPayload } from '@/lib/store/use-orders-websocket';

function playBeep() {
  if (typeof window === 'undefined') return;
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); // Nota A5
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Si el usuario no ha interactuado aún, WebAudio puede bloquearse
  }
}

function getElapsedMinutes(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / 60000));
}

export default function KitchenPage() {
  const [orders, setOrders] = useState<OrderView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'preparing' | 'ready'>('all');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<{
    text: string;
    type: string;
    orderNumber: string;
  } | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Carga inicial de pedidos activos
  const loadActiveOrders = useCallback(() => {
    setLoading(true);
    ordersApi
      .kitchenActive()
      .then((data) => {
        setOrders(data);
        setError(null);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Error cargando comandas');
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadActiveOrders();
    // Refresco de tiempo transcurrido cada 30 segundos
    const timer = setInterval(() => {
      setOrders((prev) => [...prev]);
    }, 30000);
    return () => clearInterval(timer);
  }, [loadActiveOrders]);

  // Suscripción WebSocket a eventos en tiempo real
  const { connected: wsConnected } = useOrdersWebSocket({
    onNewOrder: (newOrder) => {
      setOrders((prev) => {
        // Evitar duplicados
        if (prev.some((o) => o.id === newOrder.id)) return prev;
        return [newOrder, ...prev];
      });
      if (soundEnabled) {
        playBeep();
      }
    },
    onStatusUpdate: (update) => {
      setOrders((prev) => {
        // Si el estado pasó a delivered o cancelled, se retira de la pantalla activa
        if (update.status === 'delivered' || update.status === 'cancelled') {
          return prev.filter((o) => o.id !== update.id);
        }
        return prev.map((o) => (o.id === update.id ? { ...o, status: update.status } : o));
      });
    },
    onPrintTicket: (printJob) => {
      console.log('🖨 Comanda recibida por WebSocket:', printJob.orderNumber);
    },
  });

  // Cambiar estado de pedido
  const handleStatusChange = async (orderId: number, nextStatus: OrderStatus) => {
    setActionLoading(orderId);
    try {
      const updated = await ordersApi.updateStatus(orderId, nextStatus);
      if (nextStatus === 'delivered' || nextStatus === 'cancelled') {
        setOrders((prev) => prev.filter((o) => o.id !== orderId));
      } else {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: updated.status } : o)),
        );
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error actualizando estado');
    } finally {
      setActionLoading(null);
    }
  };

  // Abrir comanda o ticket térmico
  const handleOpenTicket = async (orderId: number, type: 'kitchen' | 'cashier') => {
    try {
      const ticket = await ordersApi.getTicket(orderId, type);
      setSelectedTicket({
        text: ticket.text,
        type: ticket.type,
        orderNumber: ticket.orderNumber,
      });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al generar ticket');
    }
  };

  // Crear pedido demo para test rápido de cocina
  const handleCreateDemoOrder = async () => {
    try {
      await ordersApi.create({
        items: [{ productId: 27, quantity: 1, notes: 'Bien crocante y papas extra' }],
        paymentMethod: 'stripe',
        deliveryAddress: 'Mesa 4 - Salón',
        notes: 'Cliente esperando en mesa',
      });
    } catch {
      // Si falla por ID de producto, recargamos
      loadActiveOrders();
    }
  };

  // Filtros
  const filteredOrders = useMemo(() => {
    if (filter === 'all') return orders;
    if (filter === 'pending') {
      return orders.filter((o) => o.status === 'pending' || o.status === 'confirmed');
    }
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const counts = useMemo(
    () => ({
      all: orders.length,
      pending: orders.filter((o) => o.status === 'pending' || o.status === 'confirmed').length,
      preparing: orders.filter((o) => o.status === 'preparing').length,
      ready: orders.filter((o) => o.status === 'ready').length,
    }),
    [orders],
  );

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 pb-20">
      {/* ─── Header KDS ─────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/90 backdrop-blur px-4 py-3">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-600 font-black text-white text-lg">
              gD
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black text-white">gorDOS KDS</h1>
                <span className="rounded bg-orange-500/20 px-2 py-0.5 text-xs font-bold text-orange-400">
                  Cocina & Comandas
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Sistema de visualización y despacho en tiempo real
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Estado WebSocket */}
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${
                wsConnected
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  wsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                }`}
              />
              {wsConnected ? 'En vivo' : 'Desconectado'}
            </div>

            {/* Toggle Sonido */}
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playBeep();
              }}
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
            >
              {soundEnabled ? '🔔 Alarma activada' : '🔕 Silenciado'}
            </button>

            {/* Crear Pedido Demo */}
            <button
              onClick={handleCreateDemoOrder}
              className="rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-500"
            >
              + Pedido Test
            </button>

            <Link
              href="/menu"
              className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"
            >
              Ver Carta
            </Link>
          </div>
        </div>

        {/* ─── Pestañas de Filtro ──────────────────────── */}
        <div className="mx-auto mt-3 flex max-w-7xl gap-2 overflow-x-auto pb-1 text-sm">
          <button
            onClick={() => setFilter('all')}
            className={`rounded-lg px-4 py-1.5 font-bold transition-colors ${
              filter === 'all'
                ? 'bg-slate-100 text-slate-900'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Todos ({counts.all})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`rounded-lg px-4 py-1.5 font-bold transition-colors ${
              filter === 'pending'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-800/80 text-amber-400 hover:bg-slate-800'
            }`}
          >
            Nuevos / Pendientes ({counts.pending})
          </button>
          <button
            onClick={() => setFilter('preparing')}
            className={`rounded-lg px-4 py-1.5 font-bold transition-colors ${
              filter === 'preparing'
                ? 'bg-purple-500 text-white'
                : 'bg-slate-800/80 text-purple-400 hover:bg-slate-800'
            }`}
          >
            En Preparación ({counts.preparing})
          </button>
          <button
            onClick={() => setFilter('ready')}
            className={`rounded-lg px-4 py-1.5 font-bold transition-colors ${
              filter === 'ready'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800/80 text-emerald-400 hover:bg-slate-800'
            }`}
          >
            Listos para Entrega ({counts.ready})
          </button>
        </div>
      </header>

      {/* ─── Contenedor de Comandas ─────────────────────── */}
      <div className="mx-auto max-w-7xl px-4 py-6">
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl border border-slate-800 bg-slate-800/50"
              />
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-950/40 p-6 text-center text-red-200">
            <p className="font-bold">{error}</p>
            <button
              onClick={loadActiveOrders}
              className="mt-3 rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && filteredOrders.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-12 text-center">
            <span className="text-5xl">🍗</span>
            <h3 className="mt-4 text-xl font-bold text-white">Cocina al día</h3>
            <p className="mt-1 text-sm text-slate-400">
              No hay pedidos pendientes en esta sección. Los nuevos pedidos aparecerán aquí
              automáticamente.
            </p>
          </div>
        )}

        {/* Grid de Tarjetas de Comanda */}
        {!loading && !error && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredOrders.map((order) => {
              const elapsed = getElapsedMinutes(order.createdAt);
              const isUrgent = elapsed >= 20;
              const isWarning = elapsed >= 10 && elapsed < 20;

              return (
                <div
                  key={order.id}
                  className={`flex flex-col rounded-2xl border bg-slate-950/80 shadow-xl transition-all ${
                    order.status === 'ready'
                      ? 'border-emerald-500/40'
                      : order.status === 'preparing'
                        ? 'border-purple-500/40'
                        : isUrgent
                          ? 'border-rose-500 ring-1 ring-rose-500'
                          : isWarning
                            ? 'border-amber-500/60'
                            : 'border-slate-800'
                  }`}
                >
                  {/* Encabezado de la Tarjeta */}
                  <div
                    className={`flex items-center justify-between border-b px-4 py-3 ${
                      order.status === 'ready'
                        ? 'border-emerald-500/20 bg-emerald-950/30'
                        : order.status === 'preparing'
                          ? 'border-purple-500/20 bg-purple-950/30'
                          : 'border-slate-800/80 bg-slate-900/60'
                    }`}
                  >
                    <div>
                      <span className="text-xs font-bold tracking-wider text-slate-400">
                        ORDEN #{order.orderNumber.slice(-4)}
                      </span>
                      <p className="font-mono text-sm font-black text-white">
                        {order.orderNumber}
                      </p>
                    </div>

                    <div className="text-right">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-xs font-black ${
                          isUrgent
                            ? 'bg-rose-500 text-white animate-pulse'
                            : isWarning
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        ⏱ {elapsed} min
                      </span>
                      <p className="mt-0.5 text-[10px] text-slate-400">
                        {new Date(order.createdAt).toLocaleTimeString('es-PE', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Info Entrega / Pago */}
                  <div className="border-b border-slate-900 px-4 py-2 text-xs text-slate-400 flex items-center justify-between">
                    <span className="font-semibold text-slate-300">
                      {order.deliveryAddress ? '🛵 Delivery' : '🥡 Para Llevar'}
                    </span>
                    <span className="text-[11px] font-mono text-orange-400">
                      S/ {order.total} · {PAYMENT_LABELS[order.paymentMethod]}
                    </span>
                  </div>

                  {/* Lista de Items (Platos) */}
                  <div className="flex-1 space-y-3 p-4">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-3"
                      >
                        <div className="flex items-start gap-2">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-500/20 text-sm font-black text-orange-400">
                            {item.quantity}x
                          </span>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-white text-sm leading-tight">
                              {item.productName}
                            </h4>

                            {/* Complementos / Cremas */}
                            {item.addons && item.addons.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {item.addons.map((a, idx) => (
                                  <span
                                    key={idx}
                                    className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-300"
                                  >
                                    + {a.name}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Observación por item */}
                            {item.notes && (
                              <p className="mt-1.5 rounded bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-300">
                                ⚠ {item.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Observación general */}
                    {order.notes && (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2 text-xs font-medium text-amber-200">
                        <strong>Nota del cliente:</strong> "{order.notes}"
                      </div>
                    )}
                    {order.deliveryAddress && (
                      <p className="text-[11px] text-slate-400 italic">
                        📍 {order.deliveryAddress}
                      </p>
                    )}
                  </div>

                  {/* Acciones Rápidas de Cocina */}
                  <div className="border-t border-slate-900 p-3 bg-slate-950/40 space-y-2">
                    <div className="flex gap-2">
                      {(order.status === 'pending' || order.status === 'confirmed') && (
                        <button
                          disabled={actionLoading === order.id}
                          onClick={() => handleStatusChange(order.id, 'preparing')}
                          className="flex-1 rounded-xl bg-purple-600 py-2.5 text-xs font-black text-white hover:bg-purple-500 active:scale-95 transition-transform"
                        >
                          ▶ Iniciar Preparación
                        </button>
                      )}

                      {order.status === 'preparing' && (
                        <button
                          disabled={actionLoading === order.id}
                          onClick={() => handleStatusChange(order.id, 'ready')}
                          className="flex-1 rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white hover:bg-emerald-500 active:scale-95 transition-transform"
                        >
                          ✓ Marcar Listo
                        </button>
                      )}

                      {order.status === 'ready' && (
                        <button
                          disabled={actionLoading === order.id}
                          onClick={() => handleStatusChange(order.id, 'delivered')}
                          className="flex-1 rounded-xl bg-slate-700 py-2.5 text-xs font-black text-white hover:bg-slate-600 active:scale-95 transition-transform"
                        >
                          🛵 Entregar / Despachar
                        </button>
                      )}
                    </div>

                    {/* Botones de Impresión */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => handleOpenTicket(order.id, 'kitchen')}
                        className="flex-1 rounded-lg border border-slate-800 bg-slate-900 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-800"
                      >
                        🖨 Comanda Cocina
                      </button>
                      <button
                        onClick={() => handleOpenTicket(order.id, 'cashier')}
                        className="flex-1 rounded-lg border border-slate-800 bg-slate-900 py-1.5 text-[11px] font-semibold text-slate-300 hover:bg-slate-800"
                      >
                        🧾 Ticket Caja
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── Modal de Visualización e Impresión Térmica (ESC/POS) ──── */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">
                Vista previa de Ticket ({selectedTicket.type.toUpperCase()})
              </h3>
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Simulación de Ticket Térmico 80mm */}
            <div className="my-4 max-h-[60vh] overflow-y-auto rounded-xl bg-amber-50 p-4 text-slate-900 shadow-inner">
              <pre className="font-mono text-xs leading-relaxed whitespace-pre-wrap">
                {selectedTicket.text}
              </pre>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 rounded-xl bg-orange-600 py-2.5 text-xs font-bold text-white hover:bg-orange-500"
              >
                🖨 Imprimir en Térmica
              </button>
              <button
                onClick={() => setSelectedTicket(null)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

