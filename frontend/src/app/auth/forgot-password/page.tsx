import Link from 'next/link';

export const metadata = {
  title: 'Recuperar contraseña — gorDOS',
  description: 'Recupera el acceso a tu cuenta de gorDOS.',
};

// Placeholder — Fase 1.5: envío de email de recuperación.
// Se conectará al endpoint POST /api/auth/forgot-password (Fase 1.5).
export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream px-4">
      <div className="w-full max-w-md">
        <div className="card">
          <div className="mb-6 text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-2xl font-black text-white">
              gD
            </div>
            <h1 className="text-2xl font-bold text-ink">¿Olvidaste tu contraseña?</h1>
            <p className="mt-1 text-sm text-gray-500">
              Te enviaremos un enlace para restablecerla (Fase 1.5).
            </p>
          </div>

          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
            ⏳ Esta funcionalidad está en desarrollo. Mientras tanto, escribe a{' '}
            <a href="mailto:soporte@gordos.app" className="font-semibold underline">
              soporte@gordos.app
            </a>
          </p>

          <div className="mt-6 text-center">
            <Link href="/auth/login" className="text-sm font-semibold text-brand hover:underline">
              ← Volver a iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}