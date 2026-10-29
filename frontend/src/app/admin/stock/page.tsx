'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { stockApi, type StockItem } from '@/lib/api/stock';
import { useStockWebSocket, type StockUpdatePayload } from '@/lib/store/use-stock-websocket';
import { AuthProvider, useAuth } from '@/lib/store/auth-context';
import { useRouter } from 'next/navigation';

function StockPanelContent() {
  const router = useRouter();
  const { user } = useAuth();
  const [items, setItems] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [drafts, setDrafts] = useState<Record<number, string>>({});

  // ── Carga inicial ────────────────────────────────────
  const load = useCallback(() => {
    stockApi
      .list()
      .then(setItems)
      .catch((e) => setError(e instanceof Error ? e.message : 'No se pudo cargar inventario'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.role !== 'admin') {
      router.replace('/menu');
      return;
    }
    load();
  }, [user, router, load]);

  // ── Stock en vivo vía WebSocket ──────────────────────
  const { connected } = useStockWebSocket((updates: StockUpdatePayload[]) => {
    setItems((prev) => {
      const byId = new Map(updates.map((u) => [u.id, u]));
      let changed = false;
      const next = prev.map((it) => {
        const u = byId.get(it.id);
        if (!u || (u.stock === it.stock && u.isAvailable === it.isAvailable)) return it;
        changed = true;
        return { ...it, stock: u.stock, isAvailable: u.isAvailable };
      });
      return changed ? next : prev;
    });
  });

  // ── Acciones ─────────────────────────────────────────
  async function handleSave(item: StockItem) {
    const raw = drafts[item.id];
    if (raw === undefined) return;
    const stock = Number(raw);
    if (!Number.isInteger(stock) || stock < 0) return;

    setSavingId(item.id);
    setError(null);
    try {
      const updated = await stockApi.update(item.id, stock);
      setItems((prev) =>
        prev.map((it) =>
          it.id === item.id
            ? { ...it, stock: updated.stock, isAvailable: updated.isAvailable, updatedAt: new Date().toISOString() }
            : it,
        ),
      );
      setDrafts((d) => {
        const next = { ...d };
        delete next[item.id];
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSavingId(null);
    }
  }

  function handleDraftChange(id: number, value: string) {
    setDrafts((d) => ({ ...d, [id]: value }));
  }

  const lowCount = items.filter((i) => i.lowStock).length;
  const outCount = items.filter((i) => i.outOfStock).length;

  return (
    <main className="min-h-screen bg-cream pb-16">
      {/* ─── Header ──────────────────────────────────── */}
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-sm font-black text-white">gD</span>
            <span className="text-lg font-bold text-ink">gorDOS</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <span
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                connected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-400'}`} />
              {connected ? 'Stock en vivo' : 'Reconectando...'}
            </span>
            <Link href="/menu" className="font-medium text-gray-500 hover:text-brand">
              ← Carta
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8">
        {/* ─── Título + alertas ──────────────────────── */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black text-ink">Inventario</h1>
            <p className="mt-1 text-sm text-gray-500">
              {user?.name} · Panel de administración
            </p>
          </div>
          <div className="flex gap-2">
            {outCount > 0 && (
              <span className="rounded-full bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700">
                {outCount} agotados
              </span>
            )}
            {lowCount > 0 && (
              <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-700">
                {lowCount} stock bajo
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="card mb-4 border-red-200 bg-red-50">
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={load} className="btn-outline mt-3 !px-3 !py-1.5 text-sm">
              Reintentar
            </button>
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-5 w-48 rounded bg-gray-200" />
                <div className="mt-2 h-4 w-24 rounded bg-gray-100" />
              </div>
            ))}
          </div>
        )}

        {!loading && !error && (
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-gray-100 bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3">Producto</th>
                  <th className="px-4 py-3 text-center">Precio</th>
                  <th className="px-4 py-3 text-center">Stock</th>
                  <th className="px-4 py-3 text-center">Estado</th>
                  <th className="px-4 py-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((item) => {
                  const draft = drafts[item.id];
                  const dirty = draft !== undefined && Number(draft) !== item.stock;
                  const status =
                    item.outOfStock
                      ? { label: 'Agotado', cls: 'bg-red-100 text-red-700' }
                      : item.lowStock
                        ? { label: 'Stock bajo', cls: 'bg-amber-100 text-amber-700' }
                        : { label: 'Disponible', cls: 'bg-green-100 text-green-700' };

                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-ink">{item.name}</p>
                        <p className="text-xs text-gray-400">{item.slug}</p>
                      </td>
                      <td className="px-4 py-3 text-center font-medium">S/ {item.price}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-bold text-ink">{item.stock}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${status.cls}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <input
                            type="number"
                            min={0}
                            value={draft ?? item.stock}
                            onChange={(e) => handleDraftChange(item.id, e.target.value)}
                            className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-center text-sm focus:border-brand focus:outline-none"
                            aria-label={`Stock de ${item.name}`}
                          />
                          <button
                            onClick={() => handleSave(item)}
                            disabled={!dirty || savingId === item.id}
                            className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                              dirty && savingId !== item.id
                                ? 'bg-brand text-white hover:bg-brand-dark'
                                : 'cursor-not-allowed bg-gray-100 text-gray-400'
                            }`}
                          >
                            {savingId === item.id ? '...' : 'Guardar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

export default function StockPanelPage() {
  return (
    <AuthProvider>
      <StockPanelContent />
    </AuthProvider>
  );
}