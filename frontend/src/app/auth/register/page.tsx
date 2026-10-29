import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/store/auth-context';
import { RegisterForm } from '@/components/forms/register-form';

export const metadata: Metadata = {
  title: 'Crear cuenta — gorDOS',
  description: 'Regístrate para pedir más rápido y llevar historial de pedidos.',
};

export default function RegisterPage() {
  return (
    <AuthProvider>
      <main className="flex min-h-screen items-center justify-center bg-cream px-4">
        <div className="w-full max-w-md">
          <div className="card">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand text-2xl font-black text-white">
                gD
              </div>
              <h1 className="text-2xl font-bold text-ink">Crear cuenta</h1>
              <p className="mt-1 text-sm text-gray-500">
                Pide más rápido y guarda tu historial
              </p>
            </div>

            <RegisterForm />

            <p className="mt-6 text-center text-sm text-gray-500">
              ¿Ya tienes cuenta?{' '}
              <a href="/auth/login" className="font-semibold text-brand hover:underline">
                Inicia sesión
              </a>
            </p>
          </div>
        </div>
      </main>
    </AuthProvider>
  );
}