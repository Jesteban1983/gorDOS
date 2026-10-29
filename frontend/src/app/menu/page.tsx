'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { catalogApi, type CatalogCategory, type CatalogProduct } from '@/lib/api/catalog';
import { CartProvider, useCart } from '@/lib/store/cart-context';
import { ProductModal } from '@/components/menu/product-modal';
import { CartDrawer } from '@/components/menu/cart-drawer';

function MenuContent() {
  const [card, setCard] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const { totalItems, totalPrice } = useCart();

  useEffect(() => {
    catalogApi
      .getCard()
      .then(setCard)
      .catch(() => setError('No pudimos cargar la carta. Intenta de nuevo.'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let cats = card;
    if (activeCat !== 'all') {
      cats = cats.filter((c) => c.slug === activeCat);
    }
    if (query.trim()) {
      const q = query.toLowerCase();
      cats = cats
        .map((c) => ({
          ...c,
          products: c.products.filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              (p.description ?? '').toLowerCase().includes(q),
          ),
        }))
        .filter((c) => c.products.length > 0);
    }
    return cats;
  }, [card, activeCat, query]);

  const totalProducts = useMemo(
    () => card.reduce((s, c) => s + c.products.length, 0),
    [card],
  );

  return (
    <main className="min-h-screen bg-cream pb-28">
      {/* ─── Header ──────────────────────────────────── */}
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-sm font-black text-white">
              gD
            </span>
            <span className="text-lg font-bold text-ink">gorDOS</span>
          </Link>

          <button
            onClick={() => setCartOpen(true)}
            className="btn-primary relative !px-4 !py-2"
            aria-label="Abrir carrito"
          >
            🛒 Carrito
            {totalItems > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-xs font-bold text-white">
                {totalItems}
              </span>
            )}
            {totalItems > 0 && (
              <span className="ml-2 hidden text-sm font-semibold sm:inline">
                S/ {totalPrice.toFixed(2)}
              </span>
            )}
          </button>
        </div>

        {/* Búsqueda */}
        <div className="mx-auto max-w-5xl px-4 pb-3">
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400">
              🔍
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar pollo a la brasa, lomo saltado, chicha..."
              className="input-field !pl-10"
            />
          </div>
        </div>

        {/* Categorías */}
        <div className="mx-auto max-w-5xl overflow-x-auto px-4 pb-3">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveCat('all')}
              className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                activeCat === 'all'
                  ? 'bg-brand text-white'
                  : 'border border-gray-200 bg-white text-gray-600 hover:border-brand'
              }`}
            >
              Todo ({totalProducts})
            </button>
            {card.map((c) => (
              <button
                key={c.slug}
                onClick={() => setActiveCat(c.slug)}
                className={`whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  activeCat === c.slug
                    ? 'bg-brand text-white'
                    : 'border border-gray-200 bg-white text-gray-600 hover:border-brand'
                }`}
              >
                {c.name} ({c.products.length})
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* ─── Cuerpo de carta ─────────────────────────── */}
      <section className="mx-auto max-w-5xl px-4 py-6">
        {loading && (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-5 w-40 rounded bg-gray-200" />
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {[1, 2].map((j) => (
                    <div key={j} className="h-20 rounded-xl bg-gray-100" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="card border-red-200 bg-red-50 text-center">
            <p className="text-red-700">{error}</p>
            <button onClick={() => window.location.reload()} className="btn-outline mt-4 !px-4 !py-2">
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="card text-center">
            <p className="text-lg font-semibold text-ink">Sin resultados para "{query}"</p>
            <p className="mt-1 text-sm text-gray-500">
              Prueba con otro nombre o mira toda la carta.
            </p>
          </div>
        )}

        {!loading && !error &&
          filtered.map((cat) => (
            <section key={cat.slug} className="mb-10">
              <div className="mb-4 flex items-baseline gap-3">
                <h2 className="text-2xl font-black text-ink">{cat.name}</h2>
                {cat.description && (
                  <p className="hidden text-sm text-gray-400 sm:block">{cat.description}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {cat.products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedProduct(p)}
                    className="card group flex items-center gap-4 text-left transition-shadow hover:shadow-md"
                    disabled={!p.isAvailable}
                  >
                    {/* Imagen placeholder */}
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand/10 to-accent/20 text-3xl">
                      {p.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.imageUrl} alt={p.name} className="h-full w-full rounded-xl object-cover" />
                      ) : (
                        '🍔'
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-ink">{p.name}</h3>
                        <span className="shrink-0 font-bold text-brand">S/ {p.price}</span>
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-sm text-gray-500">{p.description}</p>
                      <p className="mt-1.5 text-xs font-medium text-accent-dark">
                        {p.addons.length > 0
                          ? `Personalizable: cremas, adicionales +`
                          : p.preparationTime
                            ? `⏱ ${p.preparationTime} min`
                            : ''}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          ))}
      </section>

      {/* ─── Modales ─────────────────────────────────── */}

      <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </main>
  );
}

export default function MenuPage() {
  return (
    <CartProvider>
      <MenuContent />
    </CartProvider>
  );
}