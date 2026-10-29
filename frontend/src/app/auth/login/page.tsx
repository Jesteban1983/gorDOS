import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/store/auth-context';
import { LoginForm } from '@/components/forms/login-form';

export const metadata: Metadata = {
  title: 'Iniciar sesión — gorDOS',
  description: 'Accede a tu cuenta para pedir más rápido.',
};

export default function LoginPage() {
  return (
    <AuthProvider>
      <main className="flex min-h-screen items-center justify-center bg-cream px-4">
        <div className="w-full max-w-md">
          <div className="card">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-2xl font-black text-white">
                gD
              </div>
              <h1 className="text-2xl font-bold text-ink">Bienvenido de nuevo</h1>
              <p className="mt-1 text-sm text-gray-500">
                Inicia sesión para continuar tu pedido
              </p>
            </div>

            <LoginForm />

            <p className="mt-6 text-center text-sm text-gray-500">
              ¿No tienes cuenta?{' '}
              <a href="/auth/register" className="font-semibold text-brand hover:underline">
                Crea una gratis
              </a>
            </p>
          </div>
        </div>
      </main>
    </AuthProvider>
  );
}