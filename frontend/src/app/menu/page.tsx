'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { catalogApi, type CatalogCategory, type CatalogProduct } from '@/lib/api/catalog';
import { CartProvider, useCart } from '@/lib/store/cart-context';
import { ProductModal } from '@/components/menu/product-modal';
import { CartDrawer } from '@/components/menu/cart-drawer';
import { useStockWebSocket, type StockUpdatePayload } from '@/lib/store/use-stock-websocket';

function MenuContent() {
  const [card, setCard] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<CatalogProduct | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const { totalItems, totalPrice } = useCart();

  // Fase 4: stock en tiempo real — actualiza la carta al vuelo
  const { connected: wsConnected } = useStockWebSocket((updates: StockUpdatePayload[]) => {
    setCard((prev) => {
      const byId = new Map(updates.map((u) => [u.id, u]));
      let changed = false;
      const next = prev.map((cat) => ({
        ...cat,
        products: cat.products.map((p) => {
          const u = byId.get(p.id);
          if (!u || (u.isAvailable === p.isAvailable && u.stock === p.stock)) return p;
          changed = true;
          return { ...p, isAvailable: u.isAvailable, stock: u.stock } as CatalogProduct & { stock: number };
        }),
      }));
      return changed ? next : prev;
    });
  });

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
                {cat.products.map((p) => {
                  const outOfStock = !p.isAvailable;
                  const lowStock = outOfStock ? false : (p as CatalogProduct & { stock?: number }).stock !== undefined
                    ? (p as CatalogProduct & { stock: number }).stock <= 10
                    : false;
                  return (
                  <button
                    key={p.id}
                    onClick={() => !outOfStock && setSelectedProduct(p)}
                    className={`card group relative flex items-center gap-4 text-left transition-shadow ${
                      outOfStock ? 'cursor-not-allowed opacity-60' : 'hover:shadow-md'
                    }`}
                    disabled={outOfStock}
                  >
                    {outOfStock && (
                      <span className="absolute right-3 top-3 rounded-full bg-gray-700 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                        Agotado
                      </span>
                    )}
                    {lowStock && !outOfStock && (
                      <span className="absolute right-3 top-3 rounded-full bg-amber-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-white">
                        ¡Últimas!
                      </span>
                    )}
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
                  );
                })}
              </div>
            </section>
          ))}

        {!loading && !error && (
          <p className="flex items-center justify-center gap-2 pb-4 text-center text-xs text-gray-400">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                wsConnected ? 'bg-green-500' : 'bg-gray-300'
              }`}
            />
            {wsConnected ? 'Stock en vivo · actualización automática' : 'Reconectando stock en vivo...'}
          </p>
        )}
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