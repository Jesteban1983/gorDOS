'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ordersApi, getGuestToken, ORDER_STATUS_LABELS, PAYMENT_LABELS, type OrderView } from '@/lib/api/orders';
import { AuthProvider, useAuth } from '@/lib/store/auth-context';
import { useOrdersWebSocket } from '@/lib/store/use-orders-websocket';

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-purple-100 text-purple-800',
  ready: 'bg-green-100 text-green-800',
  delivered: 'bg-gray-100 text-gray-700',
  cancelled: 'bg-red-100 text-red-700',
};

function OrderDetailContent() {
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const [order, setOrder] = useState<OrderView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = Number(params.id);
    if (!id) {
      setError('Pedido inválido');
      setLoading(false);
      return;
    }
    const guestToken = user ? undefined : (getGuestToken() ?? undefined);
    ordersApi
      .get(id, guestToken)
      .then(setOrder)
      .catch((e) => setError(e instanceof Error ? e.message : 'No pudimos cargar el pedido'))
      .finally(() => setLoading(false));
  }, [params.id, user]);

  // Actualización en tiempo real desde Cocina (Fase 5)
  useOrdersWebSocket({
    onStatusUpdate: (update) => {
      setOrder((prev) => (prev && prev.id === update.id ? { ...prev, status: update.status } : prev));
    },
  });

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream">
        <div className="card animate-pulse text-center">
          <p className="text-lg font-semibold text-ink">Cargando tu pedido...</p>
        </div>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream px-4">
        <div className="card text-center">
          <span className="text-5xl">😕</span>
          <p className="mt-4 font-bold text-ink">{error ?? 'Pedido no encontrado'}</p>
          <Link href="/menu" className="btn-primary mt-6 inline-flex">Volver a la carta</Link>
        </div>
      </main>
    );
  }

  const isStripePaid = order.paymentMethod === 'stripe' && order.paymentStatus === 'paid';

  return (
    <main className="min-h-screen bg-cream pb-16">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-sm font-black text-white">gD</span>
            <span className="text-lg font-bold text-ink">gorDOS</span>
          </Link>
          <Link href="/orders" className="text-sm font-medium text-gray-500 hover:text-brand">
            Mis pedidos →
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        {/* ─── Header del pedido ─────────────────────── */}
        <div className="card">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm text-gray-400">Pedido #{order.orderNumber}</p>
              <h1 className="mt-1 text-2xl font-black text-ink">
                {isStripePaid ? '🎉 ¡Pedido confirmado!' : 'Pedido recibido'}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {new Date(order.createdAt).toLocaleString('es-PE', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${STATUS_STYLES[order.status]}`}>
              {ORDER_STATUS_LABELS[order.status]}
            </span>
          </div>

          {/* Barra de estados */}
          <div className="mt-6">
            <div className="flex items-center gap-1 text-xs">
              {(['pending', 'confirmed', 'preparing', 'ready', 'delivered'] as const).map((s, i, arr) => {
                const reached =
                  order.status === s ||
                  (['pending', 'confirmed', 'preparing', 'ready', 'delivered'].indexOf(order.status) >= i);
                return (
                  <div key={s} className="flex flex-1 items-center gap-1">
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                        reached ? 'bg-brand text-white' : 'bg-gray-200 text-gray-400'
                      }`}
                    >
                      {reached && !['delivered'].includes(s) ? '✓' : i + 1}
                    </div>
                    {i < arr.length - 1 && (
                      <div className={`h-0.5 flex-1 ${reached ? 'bg-brand' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>
            <div className="mt-1 flex justify-between text-[10px] text-gray-400">
              <span>Pendiente</span><span>Confirmado</span><span>Preparando</span>
              <span>Listo</span><span>Entregado</span>
            </div>
          </div>

          {order.estimatedTime && order.status === 'pending' && (
            <p className="mt-4 rounded-lg bg-brand/5 px-4 py-3 text-sm text-brand-dark">
              ⏱ Tiempo estimado de preparación: <strong>{order.estimatedTime} minutos</strong>
            </p>
          )}
        </div>

        {/* ─── Detalle de items ──────────────────────── */}
        <div className="card">
          <h2 className="mb-4 text-lg font-black text-ink">Tu pedido</h2>
          <ul className="divide-y divide-gray-100">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {item.quantity} × {item.productName}
                  </p>
                  {item.addons.length > 0 && (
                    <p className="mt-0.5 text-xs text-gray-500">{item.addons.map((a) => a.name).join(', ')}</p>
                  )}
                  {item.notes && (
                    <p className="mt-0.5 text-xs italic text-gray-400">"{item.notes}"</p>
                  )}
                </div>
                <span className="shrink-0 font-semibold">S/ {item.totalPrice}</span>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-4 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span><span>S/ {order.subtotal}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Delivery</span><span>S/ {order.deliveryFee}</span>
            </div>
            <div className="flex justify-between text-lg font-black text-ink">
              <span>Total</span><span className="text-brand">S/ {order.total}</span>
            </div>
          </div>
        </div>

        {/* ─── Pago y entrega ────────────────────────── */}
        <div className="card">
          <h2 className="mb-3 text-lg font-black text-ink">Pago y entrega</h2>
          <div className="space-y-2 text-sm">
            <p className="flex justify-between">
              <span className="text-gray-500">Método de pago</span>
              <span className="font-semibold text-ink">{PAYMENT_LABELS[order.paymentMethod]}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-gray-500">Estado del pago</span>
              <span className={`font-semibold ${order.paymentStatus === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                {order.paymentStatus === 'paid' ? 'Pagado ✓' : 'Pendiente de pago'}
              </span>
            </p>
            {order.deliveryAddress && (
              <p className="flex justify-between gap-4">
                <span className="shrink-0 text-gray-500">Entrega</span>
                <span className="text-right font-semibold text-ink">{order.deliveryAddress}</span>
              </p>
            )}
            {order.notes && (
              <p className="flex justify-between gap-4">
                <span className="shrink-0 text-gray-500">Notas</span>
                <span className="text-right text-ink">{order.notes}</span>
              </p>
            )}
          </div>

          {order.paymentMethod === 'stripe' && !isStripePaid && (
            <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
              💳 El pago online con Stripe se habilita cuando configures tu clave en{' '}
              <code className="rounded bg-blue-100 px-1">STRIPE_SECRET_KEY</code>. Hasta entonces, el pedido
              se crea en modo demo (estado pendiente de pago).
            </div>
          )}

          <div className="mt-5 flex gap-3">
            <Link href="/menu" className="btn-outline flex-1">Seguir pidiendo</Link>
            <Link href="/orders" className="btn-primary flex-1">Ver mis pedidos</Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function OrderDetailPage() {
  return (
    <AuthProvider>
      <OrderDetailContent />
    </AuthProvider>
  );
}