'use client';

import { useState, useEffect } from 'react';
import type { CatalogProduct, AddonOption } from '../../lib/api/catalog';
import { useCart, type SelectedAddon } from '../../lib/store/cart-context';

interface ProductModalProps {
  product: CatalogProduct | null;
  onClose: () => void;
}

export function ProductModal({ product, onClose }: ProductModalProps) {
  const { addItem } = useCart();
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [notes, setNotes] = useState('');
  const [quantity, setQuantity] = useState(1);

  // Reset al abrir un producto distinto
  useEffect(() => {
    if (product) {
      setSelected({});
      setNotes('');
      setQuantity(1);
    }
  }, [product]);

  if (!product) return null;
  const current = product;

  const addons = current.addons ?? [];

  // Agrupar por tipo para UI amigable
  const required = addons.filter((a) => a.isRequired);
  const optional = addons.filter((a) => !a.isRequired);
  const sauces = optional.filter((a) => a.type === 'sauce');
  const extras = optional.filter((a) => a.type !== 'sauce');

  function toggleAddon(addon: AddonOption) {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[addon.id] > 0) {
        delete next[addon.id];
      } else {
        next[addon.id] = 1;
      }
      return next;
    });
  }

  // Bloquear cerrar si hay cremas requeridas sin elegir
  function handleConfirm() {
    const missingRequired = required.some((a) => !selected[a.id]);
    if (missingRequired) {
      alert('Elige las cremas requeridas antes de continuar');
      return;
    }

    const selectedAddons: SelectedAddon[] = addons
      .filter((a) => selected[a.id])
      .map((a) => ({ addonId: a.id, name: a.name, price: a.price }));

    addItem(current, selectedAddons, notes.trim(), quantity);
    onClose();
  }

  const addonsTotal = addons
    .filter((a) => selected[a.id])
    .reduce((sum, a) => sum + parseFloat(a.price || '0'), 0);
  const total = (parseFloat(current.price) + addonsTotal) * quantity;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black text-ink">{product.name}</h2>
            <p className="mt-1 text-sm text-gray-500">{product.description}</p>
            <p className="mt-2 text-xl font-bold text-brand">S/ {product.price}</p>
            {product.preparationTime ? (
              <p className="mt-1 text-xs text-gray-400">⏱ {product.preparationTime} min aprox.</p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>

        {/* Cremas requeridas */}
        {required.length > 0 && (
          <section className="mb-5">
            <h3 className="mb-2 font-semibold text-ink">
              Cremas <span className="text-xs font-normal text-red-500">* requeridas</span>
            </h3>
            <div className="flex flex-wrap gap-2">
              {required.map((a) => (
                <button
                  key={a.id}
                  onClick={() => toggleAddon(a)}
                  className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                    selected[a.id]
                      ? 'border-brand bg-brand text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-brand'
                  }`}
                >
                  {a.name}
                  {parseFloat(a.price) > 0 ? ` (+S/ ${a.price})` : ''}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Cremas opcionales */}
        {sauces.length > 0 && (
          <section className="mb-5">
            <h3 className="mb-2 font-semibold text-ink">Cremas adicionales</h3>
            <div className="flex flex-wrap gap-2">
              {sauces.map((a) => (
                <button
                  key={a.id}
                  onClick={() => toggleAddon(a)}
                  className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                    selected[a.id]
                      ? 'border-accent bg-accent text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-accent'
                  }`}
                >
                  {a.name}
                  {parseFloat(a.price) > 0 ? ` (+S/ ${a.price})` : ''}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Extras / adicionales */}
        {extras.length > 0 && (
          <section className="mb-5">
            <h3 className="mb-2 font-semibold text-ink">Adicionales</h3>
            <div className="flex flex-wrap gap-2">
              {extras.map((a) => (
                <button
                  key={a.id}
                  onClick={() => toggleAddon(a)}
                  className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${
                    selected[a.id]
                      ? 'border-brand-dark bg-brand-dark text-white'
                      : 'border-gray-300 bg-white text-gray-700 hover:border-brand-dark'
                  }`}
                >
                  {a.name}
                  {parseFloat(a.price) > 0 ? ` (+S/ ${a.price})` : ''}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Observaciones */}
        <section className="mb-5">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            Observaciones
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ej: poco picante, sin cebolla, extra cubiertos..."
            rows={2}
            className="input-field resize-none"
            maxLength={200}
          />
        </section>

        {/* Cantidad + confirmar */}
        <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
          <div className="flex items-center rounded-lg border border-gray-300">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="px-3 py-2 text-gray-500 hover:text-brand"
              aria-label="Menos"
            >
              −
            </button>
            <span className="w-8 text-center font-semibold">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="px-3 py-2 text-gray-500 hover:text-brand"
              aria-label="Más"
            >
              +
            </button>
          </div>

          <button onClick={handleConfirm} className="btn-primary flex-1">
            Añadir · S/ {total.toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  );
}