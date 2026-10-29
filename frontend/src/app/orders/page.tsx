'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ordersApi, getGuestToken, ORDER_STATUS_LABELS, type OrderBrief } from '@/lib/api/orders';
import { AuthProvider, useAuth } from '@/lib/store/auth-context';

const STATUS_DOT: Record<string, string> = {
  pending: 'bg-amber-500',
  confirmed: 'bg-blue-500',
  preparing: 'bg-purple-500',
  ready: 'bg-green-500',
  delivered: 'bg-gray-400',
  cancelled: 'bg-red-500',
};

function OrdersHistoryContent() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<OrderBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const guestToken = user ? undefined : (getGuestToken() ?? undefined);
    ordersApi
      .mine(guestToken)
      .then(setOrders)
      .catch((e) => setError(e instanceof Error ? e.message : 'No pudimos cargar tus pedidos'))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <main className="min-h-screen bg-cream pb-16">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-sm font-black text-white">gD</span>
            <span className="text-lg font-bold text-ink">gorDOS</span>
          </Link>
          <Link href="/menu" className="text-sm font-medium text-gray-500 hover:text-brand">
            ← Ver carta
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-3xl font-black text-ink">Mis pedidos</h1>
        <p className="mt-1 text-sm text-gray-500">
          {user ? `${user.name}, este es tu historial.` : 'Historial de este dispositivo (invitado).'}
        </p>

        {loading && (
          <div className="mt-6 space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-4 w-40 rounded bg-gray-200" />
                <div className="mt-3 h-3 w-24 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="card mt-6 border-red-200 bg-red-50">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {!loading && !error && orders.length === 0 && (
          <div className="card mt-6 text-center">
            <span className="text-5xl">🧾</span>
            <p className="mt-4 font-bold text-ink">Aún no tienes pedidos</p>
            <p className="mt-1 text-sm text-gray-500">
              Cuando hagas tu primer pedido, aparecerá aquí.
            </p>
            <Link href="/menu" className="btn-primary mt-6 inline-flex">
              Hacer mi primer pedido
            </Link>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <ul className="mt-6 space-y-3">
            {orders.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/orders/${o.id}`}
                  className="card block transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[o.status]}`} />
                        <p className="truncate font-bold text-ink">#{o.orderNumber}</p>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {new Date(o.createdAt).toLocaleString('es-PE', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-black text-brand">S/ {o.total}</p>
                      <p className="text-xs text-gray-400">{ORDER_STATUS_LABELS[o.status]}</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

export default function OrdersHistoryPage() {
  return (
    <AuthProvider>
      <OrdersHistoryContent />
    </AuthProvider>
  );
}