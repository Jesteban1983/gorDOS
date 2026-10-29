'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authApi, type AuthUser } from '../api/client';

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('gordos_token');
    if (stored) {
      setToken(stored);
      authApi.me()
        .then(setUser)
        .catch(() => {
          localStorage.removeItem('gordos_token');
          setToken(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const persistSession = useCallback((t: string, u: AuthUser) => {
    localStorage.setItem('gordos_token', t);
    setToken(t);
    setUser(u);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login({ email, password });
    persistSession(res.token, res.user);
  }, [persistSession]);

  const register = useCallback(async (data: { name: string; email: string; password: string; phone?: string }) => {
    const res = await authApi.register(data);
    persistSession(res.token, res.user);
  }, [persistSession]);

  const logout = useCallback(() => {
    localStorage.removeItem('gordos_token');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}