'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/store/auth-context';

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.push('/menu');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div>
        <label className="form-label" htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          className="input-field"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tucorreo@ejemplo.com"
          required
          autoComplete="email"
        />
      </div>

      <div>
        <label className="form-label" htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          className="input-field"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Tu contraseña"
          required
          autoComplete="current-password"
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <label className="flex items-center gap-2 text-gray-600">
          <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-brand focus:ring-brand" />
          Recordarme
        </label>
        <a href="/auth/forgot-password" className="font-medium text-brand hover:underline">
          ¿Olvidaste tu contraseña?
        </a>
      </div>

      <button type="submit" className="btn-primary w-full" disabled={loading}>
        {loading ? 'Entrando...' : 'Iniciar sesión'}
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center text-xs text-gray-400">
          <span className="bg-white px-2">o</span>
        </div>
      </div>

      <button
        type="button"
        className="btn-outline w-full"
        onClick={() => router.push('/menu')}
      >
        Seguir como invitado
      </button>
    </form>
  );
}