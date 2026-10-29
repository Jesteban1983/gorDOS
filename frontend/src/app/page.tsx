import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* ─── Hero ─────────────────────────────────────── */}
      <section className="relative flex flex-1 flex-col items-center justify-center bg-gradient-to-b from-brand to-brand-dark px-4 py-20 text-center text-white">
        <div className="mx-auto max-w-2xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-3xl font-black backdrop-blur">
            gD
          </div>
          <h1 className="text-4xl font-black tracking-tight sm:text-6xl">
            gorDOS
          </h1>
          <p className="mt-4 text-lg text-white/90 sm:text-xl">
            Pide tu comida peruana favorita en segundos.
            <br className="hidden sm:block" />
            Pollos a la brasa, parrillas y más, directo a tu mesa.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/menu" className="btn-primary !bg-cream !text-brand hover:!bg-white">
              Ver carta
            </Link>
            <Link href="/auth/register" className="btn-outline !border-white !text-white hover:!bg-white hover:!text-brand">
              Crear cuenta
            </Link>
          </div>

          <p className="mt-6 text-sm text-white/70">
            ¿Ya tienes cuenta?{' '}
            <Link href="/auth/login" className="font-semibold underline hover:text-white">
              Inicia sesión
            </Link>{' '}
            · o pide como{' '}
            <Link href="/menu" className="font-semibold underline hover:text-white">
              invitado
            </Link>
          </p>
        </div>
      </section>

      {/* ─── Features ─────────────────────────────────── */}
      <section className="mx-auto grid w-full max-w-5xl gap-4 px-4 py-12 sm:grid-cols-3">
        {[
          { title: '🛒 Pide desde WhatsApp', desc: 'Escribe al local y recibe el formulario de pedido.' },
          { title: '🔥 Stock en tiempo real', desc: 'Lo que ves es lo que hay. Sin sorpresas.' },
          { title: '💳 Paga como quieras', desc: 'Tarjeta online o contra entrega si estás registrado.' },
        ].map((f) => (
          <div key={f.title} className="card">
            <h3 className="text-lg font-bold text-ink">{f.title}</h3>
            <p className="mt-1 text-sm text-gray-500">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}