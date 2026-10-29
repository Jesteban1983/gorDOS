'use client';

import Link from 'next/link';
import { useCart } from '@/lib/store/cart-context';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, totalItems, totalPrice, updateQuantity, removeItem } = useCart();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <aside
        className="flex h-full w-full max-w-md flex-col bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-xl font-black text-ink">
            Tu pedido {totalItems > 0 && <span className="text-brand">({totalItems})</span>}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar carrito"
          >
            ✕
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <span className="text-5xl">🛒</span>
              <p className="mt-4 font-semibold text-ink">Tu carrito está vacío</p>
              <p className="mt-1 text-sm text-gray-500">
                Explora la carta y añade tus favoritos.
              </p>
              <button onClick={onClose} className="btn-primary mt-6">
                Ver carta
              </button>
            </div>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => (
                <li key={item.key} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-bold text-ink">{item.product.name}</p>
                      {item.addons.length > 0 && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          {item.addons.map((a) => a.name).join(', ')}
                        </p>
                      )}
                      {item.notes && (
                        <p className="mt-0.5 text-xs italic text-gray-400">"{item.notes}"</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(item.key)}
                      className="text-xs text-gray-400 hover:text-red-500"
                      aria-label="Quitar"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center rounded-lg border border-gray-200">
                      <button
                        onClick={() => updateQuantity(item.key, item.quantity - 1)}
                        className="px-2.5 py-1 text-gray-500 hover:text-brand"
                        aria-label="Menos"
                      >
                        −
                      </button>
                      <span className="w-7 text-center text-sm font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.key, item.quantity + 1)}
                        className="px-2.5 py-1 text-gray-500 hover:text-brand"
                        aria-label="Más"
                      >
                        +
                      </button>
                    </div>
                    <span className="font-bold text-brand">
                      S/ {(item.unitTotal * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-gray-100 px-5 py-4">
            <div className="mb-3 flex items-center justify-between text-lg">
              <span className="font-semibold text-ink">Total</span>
              <span className="font-black text-brand">S/ {totalPrice.toFixed(2)}</span>
            </div>
            <Link
              href="/orders/checkout"
              className="btn-primary w-full"
              onClick={onClose}
            >
              Continuar al pedido →
            </Link>
            <p className="mt-2 text-center text-xs text-gray-400">
              Pagos online y contra entrega disponibles (Fase 3)
            </p>
          </div>
        )}
      </aside>
    </div>
  );
}