'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useCart } from '@/lib/store/cart-context';
import { agentsApi, type ProductRecommendation } from '@/lib/api/agents';
import { catalogApi } from '@/lib/api/catalog';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function CartDrawer({ open, onClose }: CartDrawerProps) {
  const { items, totalItems, totalPrice, updateQuantity, removeItem, addItem } = useCart();
  const [recommendations, setRecommendations] = useState<ProductRecommendation[]>([]);

  // A3: Carga de recomendaciones contextuales de venta cruzada
  useEffect(() => {
    if (!open || items.length === 0) {
      setRecommendations([]);
      return;
    }
    const productIds = items.map((i) => i.product.id);
    agentsApi
      .getRecommendations(productIds, 3)
      .then((res) => setRecommendations(res.recommendations))
      .catch(() => {});
  }, [open, items]);

  const handleAddRecommendation = async (rec: ProductRecommendation) => {
    try {
      const fullProd = await catalogApi.getProduct(rec.slug);
      if (fullProd) {
        addItem(fullProd, [], '', 1);
      }
    } catch {
      // Ignorar si no se puede añadir directamente
    }
  };

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

          {/* ─── A3: Recomendaciones Contextuales (Fase 8) ──────── */}
          {items.length > 0 && recommendations.length > 0 && (
            <div className="mt-6 rounded-2xl border border-amber-200/70 bg-amber-50/60 p-4">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                <span>🤖</span>
                <span>Acompaña tu pedido (gorDOS IA)</span>
              </div>
              <p className="text-[11px] text-amber-700/90 mt-0.5">
                Los clientes suelen agregar estas opciones:
              </p>

              <div className="mt-3 space-y-2">
                {recommendations.map((rec) => (
                  <div
                    key={rec.productId}
                    className="flex items-center justify-between rounded-xl border border-amber-200/80 bg-white p-2.5 shadow-sm"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="font-bold text-xs text-ink truncate">{rec.productName}</p>
                      <p className="text-[10px] text-gray-400">{rec.categoryName}</p>
                    </div>
                    <button
                      onClick={() => handleAddRecommendation(rec)}
                      className="shrink-0 rounded-lg bg-orange-600 px-2.5 py-1 text-[11px] font-bold text-white shadow hover:bg-orange-500 active:scale-95 transition-transform"
                    >
                      + S/ {rec.price}
                    </button>
                  </div>
                ))}
              </div>
            </div>
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