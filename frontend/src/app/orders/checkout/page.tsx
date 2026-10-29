'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CartProvider, useCart } from '@/lib/store/cart-context';
import { ordersApi, ensureGuestToken, PAYMENT_LABELS, type PaymentMethod } from '@/lib/api/orders';
import { useAuth } from '@/lib/store/auth-context';
import { AuthProvider } from '@/lib/store/auth-context';

function CheckoutContent() {
  const router = useRouter();
  const { items, totalPrice, clearCart } = useCart();
  const { user } = useAuth();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash_on_delivery');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deliveryFee = 0;
  const grandTotal = totalPrice + deliveryFee;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const guestToken = user ? undefined : ensureGuestToken();
      const result = await ordersApi.create({
        items: items.map((i) => ({
          productId: i.product.id,
          quantity: i.quantity,
          addonIds: i.addons.map((a) => a.addonId),
          notes: i.notes || undefined,
        })),
        paymentMethod,
        deliveryAddress: address.trim() || undefined,
        notes: notes.trim() || undefined,
        guestToken,
      });

      clearCart();

      // Pago online pide confirmación de Stripe (Fase 3.4/3.5)
      if (paymentMethod === 'stripe') {
        router.push(`/orders/${result.order.id}?stripe=${result.stripe?.demoMode ? 'demo' : 'pay'}`);
      } else {
        router.push(`/orders/${result.order.id}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el pedido');
      setLoading(false);
    }
  }

  if (items.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream px-4">
        <div className="card text-center">
          <span className="text-5xl">🛒</span>
          <p className="mt-4 text-lg font-bold text-ink">Tu carrito está vacío</p>
          <p className="mt-1 text-sm text-gray-500">Añade productos a la carta antes de hacer tu pedido.</p>
          <Link href="/menu" className="btn-primary mt-6 inline-flex">
            Ver carta
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream pb-16">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-sm font-black text-white">gD</span>
            <span className="text-lg font-bold text-ink">gorDOS</span>
          </Link>
          <Link href="/menu" className="text-sm font-medium text-gray-500 hover:text-brand">
            ← Seguir viendo la carta
          </Link>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="mx-auto grid max-w-4xl gap-6 px-4 py-8 lg:grid-cols-5">
        {/* ─── Columna izquierda: datos ───────────────── */}
        <div className="space-y-6 lg:col-span-3">
          <div className="card">
            <h2 className="mb-4 text-lg font-black text-ink">1 · Datos del pedido</h2>
            <div className="space-y-4">
              <div>
                <label className="form-label">Dirección de entrega</label>
                <input
                  className="input-field"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Calle, número, referencia (Ventanilla, Lima)"
                  required
                />
              </div>
              <div>
                <label className="form-label">Observaciones para el local</label>
                <textarea
                  className="input-field resize-none"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej: tocar timbre, sin cubiertos..."
                  maxLength={300}
                />
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="mb-4 text-lg font-black text-ink">2 · Método de pago</h2>
            <div className="space-y-3">
              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-colors ${
                  paymentMethod === 'cash_on_delivery' ? 'border-brand bg-brand/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  className="h-4 w-4 text-brand"
                  checked={paymentMethod === 'cash_on_delivery'}
                  onChange={() => setPaymentMethod('cash_on_delivery')}
                />
                <span className="text-2xl">💵</span>
                <span className="flex-1">
                  <span className="block font-semibold text-ink">Contra entrega</span>
                  <span className="text-xs text-gray-500">
                    {user ? 'Paga al recibir tu pedido' : '⚠️ Requiere iniciar sesión — disponible solo para clientes registrados'}
                  </span>
                </span>
              </label>

              <label
                className={`flex cursor-pointer items-center gap-3 rounded-xl border-2 p-4 transition-colors ${
                  paymentMethod === 'stripe' ? 'border-brand bg-brand/5' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="payment"
                  className="h-4 w-4 text-brand"
                  checked={paymentMethod === 'stripe'}
                  onChange={() => setPaymentMethod('stripe')}
                />
                <span className="text-2xl">💳</span>
                <span className="flex-1">
                  <span className="block font-semibold text-ink">Pago online (tarjeta)</span>
                  <span className="text-xs text-gray-500">Visa, Mastercard, Yape/Plin vía pasarela</span>
                </span>
              </label>
            </div>

            {paymentMethod === 'cash_on_delivery' && !user && (
              <p className="mt-3 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                El pago contra entrega requiere una cuenta.{' '}
                <Link href="/auth/login" className="font-semibold underline">Inicia sesión</Link> o{' '}
                <Link href="/auth/register" className="font-semibold underline">regístrate</Link> para usarlo.
              </p>
            )}
          </div>
        </div>

        {/* ─── Columna derecha: resumen ───────────────── */}
        <aside className="lg:col-span-2">
          <div className="card sticky top-4">
            <h2 className="mb-4 text-lg font-black text-ink">Resumen ({items.length} tipos)</h2>

            <ul className="max-h-64 space-y-3 overflow-y-auto pr-1">
              {items.map((item) => (
                <li key={item.key} className="flex items-start justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">
                      {item.quantity} × {item.product.name}
                    </p>
                    {item.addons.length > 0 && (
                      <p className="text-xs text-gray-500">{item.addons.map((a) => a.name).join(', ')}</p>
                    )}
                  </div>
                  <span className="shrink-0 font-semibold">
                    S/ {(item.unitTotal * item.quantity).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-4 space-y-1.5 border-t border-gray-100 pt-4 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span>S/ {totalPrice.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Delivery</span>
                <span>S/ {deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg font-black text-ink">
                <span>Total</span>
                <span className="text-brand">S/ {grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {error && (
              <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
            )}

            <button
              type="submit"
              className="btn-primary mt-5 w-full"
              disabled={loading || (paymentMethod === 'cash_on_delivery' && !user)}
            >
              {loading ? 'Creando pedido...' : `Confirmar pedido · S/ ${grandTotal.toFixed(2)}`}
            </button>

            <p className="mt-3 text-center text-xs text-gray-400">
              Al confirmar aceptas las condiciones del pedido. Método: {PAYMENT_LABELS[paymentMethod]}.
            </p>
          </div>
        </aside>
      </form>
    </main>
  );
}

export default function CheckoutPage() {
  return (
    <AuthProvider>
      <CartProvider>
        <CheckoutContent />
      </CartProvider>
    </AuthProvider>
  );
}