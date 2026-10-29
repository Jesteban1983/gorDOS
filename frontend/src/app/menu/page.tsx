import Link from 'next/link';

export const metadata = {
  title: 'Carta — gorDOS',
  description: 'Explora la carta de gorDOS.',
};

// Placeholder de la Fase 2 — Catálogo y carta digital.
// Se construirá con: categorías, productos, addons y carrito.
export default function MenuPage() {
  return (
    <main className="min-h-screen bg-cream">
      <header className="border-b border-gray-100 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-sm font-black text-white">
              gD
            </span>
            <span className="text-lg font-bold text-ink">gorDOS</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/auth/login" className="font-medium text-gray-600 hover:text-brand">
              Iniciar sesión
            </Link>
            <Link href="/auth/register" className="btn-primary !px-3 !py-1.5">
              Registrarse
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-12">
        <h1 className="text-3xl font-black text-ink">Nuestra carta</h1>
        <p className="mt-1 text-gray-500">La carta digital llega en la Fase 2 del plan.</p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {['Pollos a la brasa', 'Parrillas', 'Bebidas'].map((c) => (
            <div key={c} className="card flex items-center justify-between">
              <div>
                <h3 className="font-bold text-ink">{c}</h3>
                <p className="text-sm text-gray-400">Próximamente</p>
              </div>
              <span className="text-2xl">🍗</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}