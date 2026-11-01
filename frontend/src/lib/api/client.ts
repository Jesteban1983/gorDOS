const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  auth?: boolean;
}

export async function api<T>(
  path: string,
  { body, auth = true, headers, ...rest }: RequestOptions = {},
): Promise<T> {
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('gordos_token')
    : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(auth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let errorData: { message?: string; code?: string } = {};
    try {
      errorData = await res.json();
    } catch {
      /* no body */
    }
    throw new ApiError(res.status, errorData.code || 'ERROR', errorData.message || 'Error de servidor');
  }

  return res.json() as Promise<T>;
}

// ─── Auth API ─────────────────────────────────────────
export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  user: AuthUser;
}

export const authApi = {
  register: (data: { name: string; email: string; password: string; phone?: string }) =>
    api<AuthResponse>('/api/auth/register', { method: 'POST', body: data, auth: false }),

  login: (data: { email: string; password: string }) =>
    api<AuthResponse>('/api/auth/login', { method: 'POST', body: data, auth: false }),

  refresh: (refreshToken: string) =>
    api<AuthResponse>('/api/auth/refresh', { method: 'POST', body: { refreshToken }, auth: false }),

  me: () => api<AuthUser>('/api/auth/me'),
};

export const guestApi = {
  createSession: (data?: { name?: string; phone?: string }) =>
    api<{ guestToken: string; expiresAt: string }>('/api/guest/session', {
      method: 'POST',
      body: data ?? {},
      auth: false,
    }),
};